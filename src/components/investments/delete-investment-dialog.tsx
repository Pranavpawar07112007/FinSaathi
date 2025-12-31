
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
import { useUser, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface DeleteInvestmentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  investmentId: string | null;
}

export function DeleteInvestmentDialog({
  isOpen,
  setIsOpen,
  investmentId,
}: DeleteInvestmentDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!user || !firestore || !investmentId) return;

    const investmentRef = doc(firestore, 'users', user.uid, 'investments', investmentId);
    deleteDocumentNonBlocking(investmentRef);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            investment from your portfolio.
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
