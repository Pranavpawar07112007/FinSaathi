
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
import { Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { getTransactionCategoryAction } from '@/app/transactions/actions';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, increment, writeBatch } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Investment } from '@/app/investments/page';
import type { Account } from '@/app/accounts/page';
import { checkAndAwardAchievementsAction } from '@/app/achievements/actions';
import { useToast } from '@/hooks/use-toast';
import { detectTaxDeductible } from '@/ai/flows/detect-tax-deductible-flow';
import { Checkbox } from '../ui/checkbox';
import { learnFromCategorization } from '@/ai/flows/learn-from-categorization-flow';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  type: z.enum(['income', 'expense', 'investment', 'transfer'], {
    required_error: 'Please select a transaction type.',
  }),
  category: z.string().optional(),
  investmentId: z.string().optional(),
  accountId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  isTaxDeductible: z.boolean().default(false),
})
.refine(data => data.type !== 'investment' || !!data.investmentId, {
  message: 'Please select an investment.',
  path: ['investmentId'],
})
.refine(data => data.type !== 'income' || !!data.accountId, {
    message: 'Please select an account for income.',
    path: ['accountId'],
})
.refine(data => data.type !== 'expense' || !!data.accountId, {
    message: 'Please select an account for expense.',
    path: ['accountId'],
})
.refine(data => data.type !== 'transfer' || (!!data.fromAccountId && !!data.toAccountId), {
    message: 'Please select both from and to accounts for transfer.',
    path: ['fromAccountId'],
})
.refine(data => data.type !== 'transfer' || data.fromAccountId !== data.toAccountId, {
    message: 'From and To accounts cannot be the same.',
    path: ['toAccountId'],
});


type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  investments: WithId<Investment>[];
  accounts: WithId<Account>[];
}

export function AddTransactionDialog({
  isOpen,
  setIsOpen,
  investments,
  accounts,
}: AddTransactionDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'expense',
      isTaxDeductible: false,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const transactionType = watch('type');
  const { toast } = useToast();
  const [isCheckingTax, setIsCheckingTax] = useState(false);

  const handleTaxCheck = async () => {
    const description = getValues('description');
    if (!description || description.length <= 3) {
      toast({
        variant: 'destructive',
        title: 'Description too short',
        description: 'Please enter a more detailed description to check for tax deductibility.',
      });
      return;
    }

    setIsCheckingTax(true);
    try {
      const { isTaxDeductible } = await detectTaxDeductible({ description });
      setValue('isTaxDeductible', isTaxDeductible, { shouldValidate: true });
      toast({
        title: 'AI Tax Check Complete',
        description: isTaxDeductible ? 'This transaction might be tax-deductible.' : 'This transaction is likely not tax-deductible.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Check Failed',
        description: 'Could not determine tax status at this time.',
      });
    } finally {
      setIsCheckingTax(false);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!user || !firestore) {
      setFormError('You must be logged in to add a transaction.');
      return;
    }
    setFormError(null);

    try {
      const batch = writeBatch(firestore);

      let finalCategory = data.category;
      if (transactionType === 'investment') {
        finalCategory = 'Investment';
      } else if (transactionType === 'transfer') {
        finalCategory = 'Transfer';
      } else if (!finalCategory) {
        const { category, error: categoryError } =
          await getTransactionCategoryAction(data.description, user.uid);
        if (categoryError) {
          console.warn(categoryError);
        }
        finalCategory = category || 'Other';
      }

      // If the user provided a category, teach the AI.
      if (data.category) {
        await learnFromCategorization({
            userId: user.uid,
            description: data.description,
            category: data.category,
        });
      }
      
      const finalAmount = (transactionType === 'expense' || transactionType === 'investment') 
        ? -Math.abs(data.amount) 
        : Math.abs(data.amount);

      const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      
      const transactionData = {
        userId: user.uid,
        description: data.description,
        amount: data.amount, // Use positive amount for transfers
        date: data.date,
        category: finalCategory,
        type: data.type,
        investmentId: data.investmentId ?? null,
        accountId: data.accountId ?? null,
        fromAccountId: data.fromAccountId ?? null,
        toAccountId: data.toAccountId ?? null,
        isTaxDeductible: data.isTaxDeductible,
      };
      
      if(data.type === 'expense' || data.type === 'income') {
        transactionData.amount = finalAmount;
      }
      
      batch.set(transactionRef, transactionData);

      // Update balances
      const amount = Math.abs(data.amount);
      if (data.type === 'expense' && data.accountId) {
        const accountRef = doc(firestore, 'users', user.uid, 'accounts', data.accountId);
        batch.update(accountRef, { balance: increment(-amount) });
      } else if (data.type === 'income' && data.accountId) {
        const accountRef = doc(firestore, 'users', user.uid, 'accounts', data.accountId);
        batch.update(accountRef, { balance: increment(amount) });
      } else if (data.type === 'transfer' && data.fromAccountId && data.toAccountId) {
        const fromAccountRef = doc(firestore, 'users', user.uid, 'accounts', data.fromAccountId);
        const toAccountRef = doc(firestore, 'users', user.uid, 'accounts', data.toAccountId);
        batch.update(fromAccountRef, { balance: increment(-amount) });
        batch.update(toAccountRef, { balance: increment(amount) });
      } else if (data.type === 'investment' && data.investmentId && data.accountId) {
        // Decrease account balance, increase investment value
        const accountRef = doc(firestore, 'users', user.uid, 'accounts', data.accountId);
        const investmentRef = doc(firestore, 'users', user.uid, 'investments', data.investmentId);
        batch.update(accountRef, { balance: increment(-amount) });
        batch.update(investmentRef, { currentValue: increment(amount) });
      }
      
      await batch.commit();

      reset();
      setIsOpen(false);
      
      // Post-transaction achievement check
      const { awarded } = await checkAndAwardAchievementsAction({
        userId: user.uid,
        transactionCount: 1, // We just added one
      });

      if (awarded.length > 0) {
        toast({
            title: "Achievement Unlocked!",
            description: `You've earned the "${awarded.join(", ")}" badge!`,
        });
      }


    } catch (error) {
      setFormError('Failed to add transaction. Please try again.');
      console.error(error);
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
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your transaction below. Click save when
            you&apos;re done.
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
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex items-center space-x-2 flex-wrap"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expense" id="expense" />
                      <Label htmlFor="expense">Expense</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="income" id="income" />
                      <Label htmlFor="income">Income</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                      <RadioGroupItem value="investment" id="investment" />
                      <Label htmlFor="investment">Investment</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer">Transfer</Label>
                    </div>
                  </RadioGroup>
                )}
              />
               {errors.type && (
                <p className="text-destructive text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <div className="col-span-3">
              <Input
                id="description"
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
                placeholder="e.g., Coffee with friends"
              />
              {errors.description && (
                <p className="text-destructive text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3">
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                {...register('amount')}
                placeholder="e.g., 500"
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && (
                <p className="text-destructive text-sm mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>
          </div>

          {(transactionType === 'income' || transactionType === 'expense' || transactionType === 'investment') && (
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountId" className="text-right">Account</Label>
                <div className="col-span-3">
                     <Controller
                        name="accountId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className={errors.accountId ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Select an account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id!} value={acc.id!}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.accountId && <p className="text-destructive text-sm mt-1">{errors.accountId.message}</p>}
                </div>
            </div>
          )}

          {transactionType === 'transfer' && (
            <>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fromAccountId" className="text-right">From</Label>
                    <div className="col-span-3">
                        <Controller
                            name="fromAccountId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger className={errors.fromAccountId ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select source account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id!} value={acc.id!}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.fromAccountId && <p className="text-destructive text-sm mt-1">{errors.fromAccountId.message}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="toAccountId" className="text-right">To</Label>
                    <div className="col-span-3">
                        <Controller
                            name="toAccountId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger className={errors.toAccountId ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select destination account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id!} value={acc.id!}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {errors.toAccountId && <p className="text-destructive text-sm mt-1">{errors.toAccountId.message}</p>}
                    </div>
                </div>
            </>
          )}
          
          {transactionType === 'investment' ? (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="investmentId" className="text-right">Investment</Label>
                <div className="col-span-3">
                     <Controller
                        name="investmentId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className={errors.investmentId ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Select an investment" />
                                </SelectTrigger>
                                <SelectContent>
                                    {investments.map(inv => (
                                        <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.investmentId && <p className="text-destructive text-sm mt-1">{errors.investmentId.message}</p>}
                </div>
            </div>
          ) : (
             transactionType !== 'transfer' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                    Category
                    </Label>
                    <div className="col-span-3">
                    <Input
                        id="category"
                        {...register('category')}
                        placeholder="Optional (AI will assign if blank)"
                    />
                    </div>
                </div>
             )
          )}


          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <div className="col-span-3">
              <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  className={errors.date ? 'border-destructive' : ''}
                  placeholder="YYYY-MM-DD"
              />
              {errors.date && (
                <p className="text-destructive text-sm mt-1">
                  {errors.date.message}
                </p>
              )}
            </div>
          </div>
          
           {transactionType === 'expense' && (
                <div className="grid grid-cols-4 items-start gap-4">
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
                                Potentially tax-deductible?
                            </Label>
                        </div>
                         <Button type="button" size="sm" variant="outline" className="mt-2" onClick={handleTaxCheck} disabled={isCheckingTax}>
                            {isCheckingTax ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            Check with AI
                        </Button>
                    </div>
                </div>
           )}

          {formError && (
            <p className="text-destructive text-sm text-center">{formError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
