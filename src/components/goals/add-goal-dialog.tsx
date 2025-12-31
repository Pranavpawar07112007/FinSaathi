
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
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { checkAndAwardAchievementsAction } from '@/app/achievements/actions';
import { useToast } from '@/hooks/use-toast';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.coerce.number().positive('Target amount must be a positive number.'),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface AddGoalDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function AddGoalDialog({ isOpen, setIsOpen }: AddGoalDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const onSubmit = async (data: GoalFormData) => {
    if (!user || !firestore) {
      setFormError('You must be logged in to create a goal.');
      return;
    }
    setFormError(null);

    try {
      const goalData = {
        userId: user.uid,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: 0,
      };

      const goalsRef = collection(firestore, 'users', user.uid, 'goals');
      addDocumentNonBlocking(goalsRef, goalData);

      reset();
      setIsOpen(false);
      
      // Post-action achievement check
      const { awarded } = await checkAndAwardAchievementsAction({
        userId: user.uid,
        goalCount: 1,
      });

      if (awarded.length > 0) {
        toast({
            title: "Achievement Unlocked!",
            description: `You've earned the "${awarded.join(", ")}" badge!`,
        });
      }
    } catch (error) {
      setFormError('Failed to create goal. Please try again.');
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
          <DialogTitle>Create New Savings Goal</DialogTitle>
          <DialogDescription>
            Set a target and track your progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Goal Name
            </Label>
            <div className="col-span-3">
              <Input
                id="name"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
                placeholder="e.g., Vacation Fund"
              />
              {errors.name && (
                <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetAmount" className="text-right">
              Target Amount
            </Label>
            <div className="col-span-3">
              <Input
                id="targetAmount"
                type="number"
                step="any"
                min="0"
                {...register('targetAmount')}
                className={errors.targetAmount ? 'border-destructive' : ''}
                placeholder="e.g., 50000"
              />
              {errors.targetAmount && (
                <p className="text-destructive text-sm mt-1">{errors.targetAmount.message}</p>
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
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
