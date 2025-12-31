
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Transaction } from '@/app/transactions/page';
import type { Investment } from '@/app/investments/page';
import type { Account } from '@/app/accounts/page';
import { Checkbox } from '../ui/checkbox';

const transactionSchema = z
  .object({
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().positive('Amount must be a positive number.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
    type: z.enum(['income', 'expense', 'investment', 'transfer']),
    category: z.string().optional(),
    investmentId: z.string().optional(),
    accountId: z.string().optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    isTaxDeductible: z.boolean().default(false),
  })
  .refine(
    (data) => (data.type !== 'income' && data.type !== 'expense') || !!data.accountId,
    { message: 'Please select an account.', path: ['accountId'] }
  )
  .refine((data) => data.type !== 'investment' || !!data.investmentId, {
    message: 'Please select an investment.',
    path: ['investmentId'],
  })
  .refine(
    (data) => data.type !== 'transfer' || (!!data.fromAccountId && !!data.toAccountId),
    {
      message: 'Please select both from and to accounts.',
      path: ['fromAccountId'], // Point error to the first of the two fields
    }
  )
  .refine((data) => data.type !== 'transfer' || data.fromAccountId !== data.toAccountId, {
    message: 'From and To accounts cannot be the same.',
    path: ['toAccountId'],
  })
  .refine((data) => (data.type !== 'income' && data.type !== 'expense') || (!!data.category && data.category.length > 0), {
    message: 'Category is required for income or expense.',
    path: ['category'],
  });


type TransactionFormData = z.infer<typeof transactionSchema>;

interface EditTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transaction: WithId<Transaction> | null;
  investments: WithId<Investment>[];
  accounts: WithId<Account>[];
}

export function EditTransactionDialog({
  isOpen,
  setIsOpen,
  transaction,
  investments,
  accounts,
}: EditTransactionDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const transactionType = watch('type');

  useEffect(() => {
    if (transaction) {
      reset({
        ...transaction,
        amount: Math.abs(transaction.amount),
        accountId: transaction.accountId || undefined,
        investmentId: transaction.investmentId || undefined,
        fromAccountId: transaction.fromAccountId || undefined,
        toAccountId: transaction.toAccountId || undefined,
        isTaxDeductible: transaction.isTaxDeductible || false,
      });
    }
  }, [transaction, reset]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!user || !firestore || !transaction) {
      setFormError('An error occurred. Please try again.');
      return;
    }
    setFormError(null);

    try {
      const batch = writeBatch(firestore);
      const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);

      // --- 1. Revert the old transaction's financial impact ---
      const oldAmount = Math.abs(transaction.amount);
      if (transaction.type === 'income' && transaction.accountId) {
        const oldAccountRef = doc(firestore, 'users', user.uid, 'accounts', transaction.accountId);
        batch.update(oldAccountRef, { balance: increment(-oldAmount) });
      } else if (transaction.type === 'expense' && transaction.accountId) {
        const oldAccountRef = doc(firestore, 'users', user.uid, 'accounts', transaction.accountId);
        batch.update(oldAccountRef, { balance: increment(oldAmount) });
      } else if (transaction.type === 'investment' && transaction.investmentId) {
        const oldInvestmentRef = doc(firestore, 'users', user.uid, 'investments', transaction.investmentId);
        batch.update(oldInvestmentRef, { currentValue: increment(-oldAmount) });
      } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
        const oldFromRef = doc(firestore, 'users', user.uid, 'accounts', transaction.fromAccountId);
        const oldToRef = doc(firestore, 'users', user.uid, 'accounts', transaction.toAccountId);
        batch.update(oldFromRef, { balance: increment(oldAmount) });
        batch.update(oldToRef, { balance: increment(-oldAmount) });
      }

      // --- 2. Prepare the new transaction data ---
      const newAmount = data.amount;
      const finalAmount = (data.type === 'expense' || data.type === 'investment') ? -newAmount : newAmount;

      const newTransactionData: Transaction = {
        userId: user.uid,
        description: data.description,
        amount: data.type === 'transfer' ? newAmount : finalAmount, // Transfers are stored as positive
        date: data.date,
        type: data.type,
        category:
          data.type === 'investment' ? 'Investment' :
          data.type === 'transfer' ? 'Transfer' :
          data.category || 'Other',
        accountId: data.accountId || null,
        investmentId: data.investmentId || null,
        fromAccountId: data.fromAccountId || null,
        toAccountId: data.toAccountId || null,
        isTaxDeductible: data.isTaxDeductible,
      };

      batch.set(transactionRef, newTransactionData);

      // --- 3. Apply the new transaction's financial impact ---
      if (data.type === 'income' && data.accountId) {
        const newAccountRef = doc(firestore, 'users', user.uid, 'accounts', data.accountId);
        batch.update(newAccountRef, { balance: increment(newAmount) });
      } else if (data.type === 'expense' && data.accountId) {
        const newAccountRef = doc(firestore, 'users', user.uid, 'accounts', data.accountId);
        batch.update(newAccountRef, { balance: increment(-newAmount) });
      } else if (data.type === 'investment' && data.investmentId) {
        const newInvestmentRef = doc(firestore, 'users', user.uid, 'investments', data.investmentId);
        batch.update(newInvestmentRef, { currentValue: increment(newAmount) });
      } else if (data.type === 'transfer' && data.fromAccountId && data.toAccountId) {
        const newFromRef = doc(firestore, 'users', user.uid, 'accounts', data.fromAccountId);
        const newToRef = doc(firestore, 'users', user.uid, 'accounts', data.toAccountId);
        batch.update(newFromRef, { balance: increment(-newAmount) });
        batch.update(newToRef, { balance: increment(newAmount) });
      }

      await batch.commit();
      setIsOpen(false);

    } catch (error) {
      setFormError('Failed to update transaction. Please try again.');
      console.error('Update Transaction Error:', error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setFormError(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the details of your transaction below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <div className="col-span-3">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expense" id="edit_expense" />
                      <Label htmlFor="edit_expense">Expense</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="income" id="edit_income" />
                      <Label htmlFor="edit_income">Income</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="investment" id="edit_investment" />
                      <Label htmlFor="edit_investment">Investment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="edit_transfer" />
                      <Label htmlFor="edit_transfer">Transfer</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <div className="col-span-3">
              <Input id="description" {...register('description')} className={errors.description ? 'border-destructive' : ''} />
              {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Amount</Label>
            <div className="col-span-3">
              <Input id="amount" type="number" step="any" min="0" {...register('amount')} className={errors.amount ? 'border-destructive' : ''} />
              {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          {(transactionType === 'income' || transactionType === 'expense') && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountId" className="text-right">Account</Label>
                <div className="col-span-3">
                  <Controller
                    name="accountId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.accountId ? 'border-destructive' : ''}><SelectValue placeholder="Select an account" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.accountId && <p className="text-destructive text-sm mt-1">{errors.accountId.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <div className="col-span-3">
                  <Input id="category" {...register('category')} className={errors.category ? 'border-destructive' : ''} />
                  {errors.category && <p className="text-destructive text-sm mt-1">{errors.category.message}</p>}
                </div>
              </div>
            </>
          )}

          {transactionType === 'transfer' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fromAccountId" className="text-right">From</Label>
                <div className="col-span-3">
                  <Controller name="fromAccountId" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.fromAccountId ? 'border-destructive' : ''}><SelectValue placeholder="Select source account" /></SelectTrigger>
                      <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                  {errors.fromAccountId && <p className="text-destructive text-sm mt-1">{errors.fromAccountId.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="toAccountId" className="text-right">To</Label>
                <div className="col-span-3">
                  <Controller name="toAccountId" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.toAccountId ? 'border-destructive' : ''}><SelectValue placeholder="Select destination account" /></SelectTrigger>
                      <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                  {errors.toAccountId && <p className="text-destructive text-sm mt-1">{errors.toAccountId.message}</p>}
                </div>
              </div>
            </>
          )}

          {transactionType === 'investment' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="investmentId" className="text-right">Investment</Label>
              <div className="col-span-3">
                <Controller name="investmentId" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.investmentId ? 'border-destructive' : ''}><SelectValue placeholder="Select an investment" /></SelectTrigger>
                    <SelectContent>
                      {investments.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.investmentId && <p className="text-destructive text-sm mt-1">{errors.investmentId.message}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <div className="col-span-3">
              <Input id="date" type="date" {...register('date')} className={errors.date ? 'border-destructive' : ''} />
              {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
            </div>
          </div>
          
           {transactionType === 'expense' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isTaxDeductible" className="text-right pt-2">
                        Tax
                    </Label>
                    <div className="col-span-3">
                        <div className="flex items-center space-x-2">
                            <Controller
                                name="isTaxDeductible"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        id="isTaxDeductible"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="isTaxDeductible" className="text-sm font-normal">
                                Potentially tax-deductible
                            </Label>
                        </div>
                    </div>
                </div>
           )}

          {formError && <p className="text-destructive text-sm text-center col-span-4">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    

    