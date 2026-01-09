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
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Account } from '@/app/accounts/page';
import { Loader2 } from 'lucide-react';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';


interface DeleteAccountDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: WithId<Account> | null;
}

export function DeleteAccountDialog({
  isOpen,
  setIsOpen,
  account,
}: DeleteAccountDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || !firestore || !account) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete account. User or account not found.',
        });
        return;
    }

    setIsDeleting(true);
    
    try {
        const batch = writeBatch(firestore);

        // 1. Find all transactions linked to this account
        const transactionsRef = collection(firestore, 'users', user.uid, 'transactions');
        
        // Query for transactions where the account is the main account, source, or destination
        const q1 = query(transactionsRef, where('accountId', '==', account.id));
        const q2 = query(transactionsRef, where('fromAccountId', '==', account.id));
        const q3 = query(transactionsRef, where('toAccountId', '==', account.id));
        
        const [q1Snap, q2Snap, q3Snap] = await Promise.all([
            getDocs(q1),
            getDocs(q2),
            getDocs(q3),
        ]);

        const transactionIdsToDelete = new Set<string>();
        q1Snap.forEach(doc => transactionIdsToDelete.add(doc.id));
        q2Snap.forEach(doc => transactionIdsToDelete.add(doc.id));
        q3Snap.forEach(doc => transactionIdsToDelete.add(doc.id));

        // 2. Add transaction deletions to the batch
        transactionIdsToDelete.forEach(id => {
            const transactionDocRef = doc(firestore, 'users', user.uid, 'transactions', id);
            batch.delete(transactionDocRef);
        });

        // 3. Delete the account itself
        const accountDocRef = doc(firestore, 'users', user.uid, 'accounts', account.id);
        batch.delete(accountDocRef);

        // 4. Commit the batch operation
        await batch.commit();

        toast({
            title: 'Success',
            description: 'Account and associated transactions deleted.',
        });
        setIsOpen(false);

    } catch(error) {
        console.error("Error deleting account and transactions:", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'An error occurred while deleting the account.',
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
            This will permanently delete the account "{account?.name}" and all of its associated transactions (income, expenses, and transfers). This action cannot be undone.
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
