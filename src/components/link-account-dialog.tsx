'use client';

import { useState } from 'react';
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
import { useUser, useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection } from 'firebase/firestore';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  balance: z.coerce.number(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface LinkAccountDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function LinkAccountDialog({
  isOpen,
  setIsOpen,
}: LinkAccountDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      balance: 0,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const onSubmit = async (data: AccountFormData) => {
    if (!user || !firestore) {
      setFormError('You must be logged in to link an account.');
      return;
    }
    setFormError(null);

    try {
      const accountData = {
        userId: user.uid,
        name: data.name,
        balance: data.balance,
      };

      const accountsRef = collection(firestore, 'users', user.uid, 'accounts');
      addDocumentNonBlocking(accountsRef, accountData);

      reset();
      setIsOpen(false);
    } catch (error) {
      setFormError('Failed to link account. Please try again.');
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
          <DialogTitle>Link New Account</DialogTitle>
          <DialogDescription>
            Manually add an account to track its balance.
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
                placeholder="e.g., Savings Account"
              />
              {errors.name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.name.message}
                </p>
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
              Link Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
