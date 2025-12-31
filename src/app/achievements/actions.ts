
'use server';

import { z } from 'zod';
import { getFirebaseApp } from '@/firebase/server-app';
import { parseISO, getMonth, getYear } from 'date-fns';
import {
  awardAchievement as awardAchievementFlow,
  type AwardAchievementInput,
} from '@/ai/flows/award-achievement-flow';
import type { UserAchievement, Achievement, GetMonthlyAchievementsOutput } from './page';

// --- Input Schema for getMonthlyAchievements ---
const GetMonthlyAchievementsInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
});
type GetMonthlyAchievementsInput = z.infer<
  typeof GetMonthlyAchievementsInputSchema
>;

/**
 * A server-side function that fetches and processes achievement data for a specific user.
 * It fetches all achievements and the user's earned achievements, then calculates
 * which were unlocked this month and which remain as challenges.
 */
export async function getMonthlyAchievements(
  input: GetMonthlyAchievementsInput
): Promise<GetMonthlyAchievementsOutput> {
  const { userId } = input;
  const { firestore } = getFirebaseApp();

  try {
    const allAchievementsSnapshot = await firestore
      .collection('achievements')
      .get();
    const allAchievements = allAchievementsSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Achievement)
    );

    const userAchievementsSnapshot = await firestore
      .collection(`users/${userId}/achievements`)
      .get();
    const userAchievements = userAchievementsSnapshot.docs.map(
      (doc) => doc.data() as UserAchievement
    );
    const userAchievementIds = new Set(userAchievements.map(ua => ua.achievementId));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const unlockedThisMonth = userAchievements
      .filter((ua) => {
        try {
          const earnedDate = parseISO(ua.dateEarned);
          return (
            getYear(earnedDate) === currentYear &&
            getMonth(earnedDate) === currentMonth
          );
        } catch (e) {
            return false;
        }
      })
      .map((ua) => {
        const details = allAchievements.find(
          (ach) => ach.id === ua.achievementId
        );
        return details ? { ...details, dateEarned: ua.dateEarned } : null;
      })
      .filter((item): item is Achievement & { dateEarned: string } => !!item);

    const challenges = allAchievements.filter(
      (ach) => !userAchievementIds.has(ach.id)
    );

    return {
      unlockedThisMonth,
      challenges,
    };
  } catch (error: any) {
    console.error('Error processing achievements:', error);
    return {
      unlockedThisMonth: [],
      challenges: [],
      error: 'Failed to retrieve and process achievement data.',
    };
  }
}

// --- Achievement Awarding Logic ---
const achievementCheckSchema = z.object({
  userId: z.string(),
  transactionCount: z.number().optional(),
  budgetCount: z.number().optional(),
  goalCount: z.number().optional(),
  investmentCount: z.number().optional(),
  addedToGoal: z.boolean().optional(),
});

export async function checkAndAwardAchievementsAction(
  data: z.infer<typeof achievementCheckSchema>
): Promise<{ awarded: string[] }> {
  const validatedFields = achievementCheckSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('Invalid data for achievement check:', validatedFields.error);
    return { awarded: [] };
  }

  const {
    userId,
    transactionCount,
    budgetCount,
    goalCount,
    investmentCount,
    addedToGoal,
  } = validatedFields.data;
  const awardedAchievements: string[] = [];

  const award = async (achievementId: string, achievementName: string) => {
    try {
      const result = await awardAchievementFlow({ userId, achievementId });
      if (result.awarded) {
        awardedAchievements.push(achievementName);
      }
    } catch (error) {
      console.error(`Error awarding achievement ${achievementId}:`, error);
    }
  };

  if (transactionCount && transactionCount > 0) {
    await award('first-transaction', 'First Transaction');
  }
  if (budgetCount && budgetCount > 0) {
    await award('budget-setter', 'Budget Setter');
  }
  if (goalCount && goalCount > 0) {
    await award('goal-getter', 'Goal Getter');
  }
  if (investmentCount && investmentCount > 0) {
    await award('investment-starter', 'Investment Starter');
  }
  if (addedToGoal) {
    await award('savvy-saver', 'Savvy Saver');
  }

  return { awarded: awardedAchievements };
}
