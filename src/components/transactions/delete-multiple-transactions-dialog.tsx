'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Transaction } from '@/app/transactions/page';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeleteMultipleTransactionsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transactions: WithId<Transaction>[];
  onConfirm: () => void;
}

export function DeleteMultipleTransactionsDialog({
  isOpen,
  setIsOpen,
  transactions,
  onConfirm,
}: DeleteMultipleTransactionsDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || !firestore || transactions.length === 0) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);
      const accountBalanceChanges: { [accountId: string]: number } = {};

      transactions.forEach(transaction => {
        // Delete the transaction document
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
        batch.delete(transactionRef);

        // Aggregate balance changes
        const amount = Math.abs(transaction.amount);
        if (transaction.type === 'expense' && transaction.accountId) {
          accountBalanceChanges[transaction.accountId] = (accountBalanceChanges[transaction.accountId] || 0) + amount;
        } else if (transaction.type === 'income' && transaction.accountId) {
          accountBalanceChanges[transaction.accountId] = (accountBalanceChanges[transaction.accountId] || 0) - amount;
        } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
            accountBalanceChanges[transaction.fromAccountId] = (accountBalanceChanges[transaction.fromAccountId] || 0) + amount;
            accountBalanceChanges[transaction.toAccountId] = (accountBalanceChanges[transaction.toAccountId] || 0) - amount;
        } else if (transaction.type === 'investment' && transaction.investmentId) {
            // Investment and goal reversions are direct increments, not aggregated
            const investmentRef = doc(firestore, 'users', user.uid, 'investments', transaction.investmentId);
            batch.update(investmentRef, { currentValue: increment(-amount) });
        }
        if (transaction.goalId) {
            const goalRef = doc(firestore, 'users', user.uid, 'goals', transaction.goalId);
            batch.update(goalRef, { currentAmount: increment(-amount) });
        }
      });
      
      // Apply aggregated balance changes to accounts
      for (const accountId in accountBalanceChanges) {
          const accountRef = doc(firestore, 'users', user.uid, 'accounts', accountId);
          batch.update(accountRef, { balance: increment(accountBalanceChanges[accountId]) });
      }

      await batch.commit();

      toast({
        title: 'Success',
        description: `${transactions.length} transactions have been deleted.`,
      });

      onConfirm(); // Callback to reset selection state on the page
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting multiple transactions:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete transactions. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the selected {transactions.length} transaction(s) and revert any associated account balance changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting && <Loader2 className="mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
