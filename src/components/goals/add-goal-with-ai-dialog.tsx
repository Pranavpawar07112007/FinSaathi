
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getGoalDetailsFromAiAction } from '@/app/goals/actions';
import { collection } from 'firebase/firestore';
import { checkAndAwardAchievementsAction } from '@/app/achievements/actions';

const goalSchema = z.object({
  text: z.string().min(10, 'Please describe your goal in a bit more detail.'),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface AddGoalWithAiDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function AddGoalWithAiDialog({ isOpen, setIsOpen }: AddGoalWithAiDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);

    try {
      // 1. Call the server action to get structured data from the AI
      const result = await getGoalDetailsFromAiAction({ text: data.text });

      if (result.error || !result.goalName || !result.targetAmount) {
        throw new Error(result.error || 'The AI failed to return valid goal details.');
      }

      // 2. Use the client-side Firebase SDK to write the data
      const goalData = {
        userId: user.uid,
        name: result.goalName,
        targetAmount: result.targetAmount,
        currentAmount: 0,
        targetDate: null,
      };

      const goalsRef = collection(firestore, 'users', user.uid, 'goals');
      addDocumentNonBlocking(goalsRef, goalData);

      // 3. Post-action achievement check
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

      reset();
      setIsOpen(false);
      toast({
        title: "Goal Created!",
        description: `Your new goal "${result.goalName}" has been added.`,
      });

    } catch (error: any) {
      setFormError(error.message || 'The AI failed to process your request. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary"/>
            Create Goal with AI
          </DialogTitle>
          <DialogDescription>
            Just describe your goal, and FinSaathi will figure out the details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="text">Describe your goal</Label>
            <Textarea
              id="text"
              {...register('text')}
              className={errors.text ? 'border-destructive' : ''}
              placeholder="e.g., 'I want to save up for a new laptop that costs around ₹80,000.'"
              rows={4}
            />
            {errors.text && (
              <p className="text-destructive text-sm mt-1">{errors.text.message}</p>
            )}
          </div>

          {formError && (
            <p className="text-destructive text-sm text-center">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2" />
              )}
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
