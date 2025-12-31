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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Account } from '@/app/accounts/page';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  balance: z.coerce.number(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface EditAccountDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: WithId<Account> | null;
}

export function EditAccountDialog({
  isOpen,
  setIsOpen,
  account,
}: EditAccountDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        balance: account.balance,
      });
    }
  }, [account, reset]);


  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const onSubmit = async (data: AccountFormData) => {
    if (!user || !firestore || !account) {
      setFormError('Could not update account. Please try again.');
      return;
    }
    setFormError(null);

    try {
      const accountData = {
        name: data.name,
        balance: data.balance,
      };

      const accountRef = doc(firestore, 'users', user.uid, 'accounts', account.id);
      updateDocumentNonBlocking(accountRef, accountData);

      setIsOpen(false);
    } catch (error) {
      setFormError('Failed to update account. Please try again.');
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
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the name and balance of your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Account Name
            </Label>
            <div className="col-span-3">
              <Input
                id="name"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-right">
              Current Balance
            </Label>
            <div className="col-span-3">
              <Input
                id="balance"
                type="number"
                step="any"
                {...register('balance')}
                className={errors.balance ? 'border-destructive' : ''}
              />
              {errors.balance && (
                <p className="text-destructive text-sm mt-1">
                  {errors.balance.message}
                </p>
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
