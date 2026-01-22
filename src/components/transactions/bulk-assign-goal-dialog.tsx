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
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Transaction, Goal } from '@/app/transactions/page';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const assignGoalSchema = z.object({
  goalId: z.string().min(1, 'Please select a goal.'),
});

type AssignGoalFormData = z.infer<typeof assignGoalSchema>;

interface BulkAssignGoalDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transactions: WithId<Transaction>[];
  goals: WithId<Goal>[];
  onConfirm: () => void;
}

export function BulkAssignGoalDialog({
  isOpen,
  setIsOpen,
  transactions,
  goals,
  onConfirm,
}: BulkAssignGoalDialogProps) {
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignGoalFormData>({
    resolver: zodResolver(assignGoalSchema),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const onSubmit = async (data: AssignGoalFormData) => {
    if (!user || !firestore || transactions.length === 0) {
      setFormError('An error occurred. Please try again.');
      return;
    }
    setFormError(null);

    try {
      const batch = writeBatch(firestore);
      const { goalId } = data;
      const goalName = goals.find(g => g.id === goalId)?.name || 'the selected goal';

      for (const transaction of transactions) {
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
        batch.update(transactionRef, { goalId: goalId });
      }

      await batch.commit();

      toast({
        title: 'Transactions Updated',
        description: `${transactions.length} transaction(s) have been assigned to the "${goalName}" goal.`,
      });

      onConfirm();
      handleOpenChange(false);

    } catch (error) {
      setFormError('Failed to assign transactions to goal. Please try again.');
      console.error('Bulk Assign Goal Error:', error);
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
          <DialogTitle>Assign to Goal</DialogTitle>
          <DialogDescription>
            Assign the {transactions.length} selected transaction(s) to a savings goal for tracking purposes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goalId" className="text-right">
                Goal
                </Label>
                <div className="col-span-3">
                 <Controller
                    name="goalId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className={errors.goalId ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Select a goal" />
                            </SelectTrigger>
                            <SelectContent>
                                {goals.length > 0 ? (
                                    goals.map(goal => (
                                        <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                                    ))
                                ) : (
                                    <p className="p-2 text-sm text-muted-foreground">No goals created yet.</p>
                                )}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.goalId && (
                    <p className="text-destructive text-sm mt-1">
                    {errors.goalId.message}
                    </p>
                )}
                </div>
            </div>
         
          {formError && (
            <p className="text-destructive text-sm text-center col-span-4">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || goals.length === 0}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign to Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
