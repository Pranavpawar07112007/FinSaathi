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
import { useUser } from '@/firebase';
import { deleteAccountAndTransactionsAction } from '@/app/accounts/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Account } from '@/app/accounts/page';
import { Loader2 } from 'lucide-react';


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
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user || !account) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete account. User or account not found.',
        });
        return;
    }

    setIsDeleting(true);
    const result = await deleteAccountAndTransactionsAction({
        userId: user.uid,
        accountId: account.id,
    });
    setIsDeleting(false);

    if (result.error) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: result.error,
        });
    } else {
        toast({
            title: 'Success',
            description: 'Account and associated transactions deleted.',
        });
        setIsOpen(false);
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
