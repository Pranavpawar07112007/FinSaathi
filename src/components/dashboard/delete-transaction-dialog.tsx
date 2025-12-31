
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


interface DeleteTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transaction: WithId<Transaction> | null;
}

export function DeleteTransactionDialog({
  isOpen,
  setIsOpen,
  transaction,
}: DeleteTransactionDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const handleDelete = async () => {
    if (!user || !firestore || !transaction) return;

    const batch = writeBatch(firestore);
    
    const transactionRef = doc(
      firestore,
      'users',
      user.uid,
      'transactions',
      transaction.id
    );
    batch.delete(transactionRef);

    // Revert balance changes
    const amount = Math.abs(transaction.amount);
    if (transaction.type === 'expense' && transaction.accountId) {
      const accountRef = doc(firestore, 'users', user.uid, 'accounts', transaction.accountId);
      batch.update(accountRef, { balance: increment(amount) });
    } else if (transaction.type === 'income' && transaction.accountId) {
      const accountRef = doc(firestore, 'users', user.uid, 'accounts', transaction.accountId);
      batch.update(accountRef, { balance: increment(-amount) });
    } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
        const fromAccountRef = doc(firestore, 'users', user.uid, 'accounts', transaction.fromAccountId);
        const toAccountRef = doc(firestore, 'users', user.uid, 'accounts', transaction.toAccountId);
        batch.update(fromAccountRef, { balance: increment(amount) });
        batch.update(toAccountRef, { balance: increment(-amount) });
    } else if (transaction.type === 'investment' && transaction.investmentId) {
       const investmentRef = doc(firestore, 'users', user.uid, 'investments', transaction.investmentId);
       // Revert the value that was added to the investment
       batch.update(investmentRef, { currentValue: increment(-amount) });
    }

    // Revert goal contribution if applicable
    if (transaction.goalId) {
        const goalRef = doc(firestore, 'users', user.uid, 'goals', transaction.goalId);
        batch.update(goalRef, { currentAmount: increment(-amount) });
    }


    await batch.commit();
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            transaction and revert any associated account or goal balance changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
