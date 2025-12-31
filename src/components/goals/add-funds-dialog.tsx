
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
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { doc, increment, writeBatch, collection } from 'firebase/firestore';
import { checkAndAwardAchievementsAction } from '@/app/achievements/actions';
import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/app/accounts/page';
import type { WithId } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const addFundsSchema = z.object({
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  accountId: z.string().min(1, 'Please select an account to withdraw from.'),
});

type AddFundsFormData = z.infer<typeof addFundsSchema>;

interface AddFundsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  goal: any | null;
  accounts: WithId<Account>[];
}

export function AddFundsDialog({ isOpen, setIsOpen, goal, accounts }: AddFundsDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFundsFormData>({
    resolver: zodResolver(addFundsSchema),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    reset();
  }, [goal, reset]);

  const onSubmit = async (data: AddFundsFormData) => {
    if (!user || !firestore || !goal) {
      setFormError('Could not add funds. Please try again.');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === data.accountId);
    if (selectedAccount && selectedAccount.balance < data.amount) {
        setFormError("Insufficient funds in the selected account.");
        return;
    }

    setFormError(null);

    try {
      const batch = writeBatch(firestore);

      // 1. Update the goal's current amount
      const goalRef = doc(firestore, 'users', user.uid, 'goals', goal.id);
      batch.update(goalRef, {
        currentAmount: increment(data.amount),
      });
      
      // 2. Create a corresponding transaction
      const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      const transactionData = {
          userId: user.uid,
          description: `Contribution to: ${goal.name}`,
          amount: -Math.abs(data.amount),
          date: format(new Date(), 'yyyy-MM-dd'),
          type: 'expense',
          category: 'Savings',
          accountId: data.accountId,
          goalId: goal.id, // Add goalId to the transaction
      };
      batch.set(transactionRef, transactionData);

      // 3. Subtract the amount from the selected account
      const accountRef = doc(firestore, 'users', user.uid, 'accounts', data.accountId);
      batch.update(accountRef, {
          balance: increment(-Math.abs(data.amount))
      });

      await batch.commit();

      setIsOpen(false);

      // Post-action achievement check
      const { awarded } = await checkAndAwardAchievementsAction({
        userId: user.uid,
        addedToGoal: true,
      });

      if (awarded.length > 0) {
        toast({
            title: "Achievement Unlocked!",
            description: `You've earned the "${awarded.join(", ")}" badge!`,
        });
      }

    } catch (error) {
      setFormError('Failed to add funds. Please try again.');
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Funds to "{goal?.name}"</DialogTitle>
          <DialogDescription>
            Contribute to your savings goal. Every little bit helps!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
                className={errors.amount ? 'border-destructive' : ''}
                placeholder="e.g., 1000"
              />
              {errors.amount && (
                <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>
          </div>
          
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountId" className="text-right">
              From Account
            </Label>
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
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
               />
              {errors.accountId && (
                <p className="text-destructive text-sm mt-1">{errors.accountId.message}</p>
              )}
            </div>
          </div>


          {formError && (
            <p className="text-destructive text-sm text-center">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Funds
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
