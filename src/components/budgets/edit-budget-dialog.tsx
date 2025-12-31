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

const budgetSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  limit: z.coerce.number().positive('Limit must be a positive number.'),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface EditBudgetDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  budget: WithId<{name: string, limit: number, userId: string}> | null;
}

export function EditBudgetDialog({ isOpen, setIsOpen, budget }: EditBudgetDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
  });

  useEffect(() => {
    if (budget) {
      reset({
        name: budget.name,
        limit: budget.limit,
      });
    }
  }, [budget, reset]);


  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const onSubmit = async (data: BudgetFormData) => {
    if (!user || !firestore || !budget) {
      setFormError('Could not update budget. Please try again.');
      return;
    }
    setFormError(null);

    try {
      const budgetData = {
        name: data.name,
        limit: data.limit,
      };

      const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
      updateDocumentNonBlocking(budgetRef, budgetData);

      setIsOpen(false);
    } catch (error) {
      setFormError('Failed to update budget. Please try again.');
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
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Update the details of your budget below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Category Name
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
            <Label htmlFor="limit" className="text-right">
              Spending Limit
            </Label>
            <div className="col-span-3">
              <Input
                id="limit"
                type="number"
                step="any"
                min="0"
                {...register('limit')}
                className={errors.limit ? 'border-destructive' : ''}
              />
              {errors.limit && (
                <p className="text-destructive text-sm mt-1">{errors.limit.message}</p>
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
