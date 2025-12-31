
'use server';

import {
  awardAchievement,
  type AwardAchievementInput,
} from '@/ai/flows/award-achievement-flow';
import { z } from 'zod';

const achievementCheckSchema = z.object({
  userId: z.string(),
  transactionCount: z.number().optional(),
  budgetCount: z.number().optional(),
  goalCount: z.number().optional(),
  investmentCount: z.number().optional(),
  addedToGoal: z.boolean().optional(),
});

/**
 * Server action to check for and award achievements based on user data.
 */
export async function checkAndAwardAchievementsAction(
  data: z.infer<typeof achievementCheckSchema>
): Promise<{ awarded: string[] }> {
  const validatedFields = achievementCheckSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('Invalid data for achievement check:', validatedFields.error);
    return { awarded: [] };
  }

  const { userId, transactionCount, budgetCount, goalCount, investmentCount, addedToGoal } = validatedFields.data;
  const awardedAchievements: string[] = [];

  try {
    // --- Check for 'First Transaction' Achievement ---
    if (transactionCount && transactionCount > 0) {
      const result = await awardAchievement({
        userId,
        achievementId: 'first-transaction',
      });
      if (result.awarded) {
        awardedAchievements.push('First Transaction');
      }
    }
    
    // --- Check for 'Budget Setter' Achievement ---
    if (budgetCount && budgetCount > 0) {
      const result = await awardAchievement({
        userId,
        achievementId: 'budget-setter',
      });
      if (result.awarded) {
        awardedAchievements.push('Budget Setter');
      }
    }

    // --- Check for 'Goal Getter' Achievement ---
    if (goalCount && goalCount > 0) {
      const result = await awardAchievement({
        userId,
        achievementId: 'goal-getter',
      });
      if (result.awarded) {
        awardedAchievements.push('Goal Getter');
      }
    }

    // --- Check for 'Investment Starter' Achievement ---
    if (investmentCount && investmentCount > 0) {
      const result = await awardAchievement({
        userId,
        achievementId: 'investment-starter',
      });
      if (result.awarded) {
        awardedAchievements.push('Investment Starter');
      }
    }

    // --- Check for 'Savvy Saver' Achievement ---
    if (addedToGoal) {
      const result = await awardAchievement({
        userId,
        achievementId: 'savvy-saver',
      });
      if (result.awarded) {
        awardedAchievements.push('Savvy Saver');
      }
    }

    return { awarded: awardedAchievements };
  } catch (error) {
    console.error('Error checking/awarding achievements:', error);
    return { awarded: [] };
  }
}
