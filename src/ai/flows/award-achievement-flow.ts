
'use server';
/**
 * @fileOverview An AI agent for awarding achievements to users.
 *
 * - awardAchievement - A function that handles awarding an achievement.
 * - AwardAchievementInput - The input type for the function.
 * - AwardAchievementOutput - The return type for the function.
 */

import { z } from 'genkit';
import { getFirebaseApp } from '@/firebase/server-app';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize server-side Firebase
const { firestore } = getFirebaseApp();

const AwardAchievementInputSchema = z.object({
  userId: z.string().describe('The ID of the user to award the achievement to.'),
  achievementId: z
    .string()
    .describe('The ID of the achievement to award (e.g., "first-transaction").'),
});
export type AwardAchievementInput = z.infer<typeof AwardAchievementInputSchema>;

const AwardAchievementOutputSchema = z.object({
  awarded: z
    .boolean()
    .describe(
      'Whether the achievement was newly awarded. False if the user already had it.'
    ),
});
export type AwardAchievementOutput = z.infer<
  typeof AwardAchievementOutputSchema
>;

/**
 * A server-side function to award an achievement to a user if they don't already have it.
 * This function directly interacts with Firestore using the Admin SDK.
 * @param input - The user ID and achievement ID.
 * @returns An object indicating if the achievement was newly awarded.
 */
export async function awardAchievement(
  input: AwardAchievementInput
): Promise<AwardAchievementOutput> {
  const { userId, achievementId } = input;
  try {
    // 1. Check if the user already has this achievement
    const userAchievementsCol = firestore.collection(
      `users/${userId}/achievements`
    );
    const q = userAchievementsCol.where('achievementId', '==', achievementId);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
      // User already has this achievement
      return { awarded: false };
    }

    // 2. Get the achievement details (for points)
    const achievementRef = firestore.doc(`achievements/${achievementId}`);
    const achievementSnap = await achievementRef.get();

    if (!achievementSnap.exists) {
      console.warn(`Achievement with ID "${achievementId}" not found.`);
      // If the achievement doesn't exist, we can't award it.
      return { awarded: false };
    }
    const achievementData = achievementSnap.data();
    const pointsToAward = achievementData?.points || 0;

    // 3. Perform a batch write to award the achievement and update points
    const batch = firestore.batch();

    // Create the new UserAchievement document
    const newUserAchievementRef = userAchievementsCol.doc();
    batch.set(newUserAchievementRef, {
      id: newUserAchievementRef.id,
      userId,
      achievementId,
      dateEarned: new Date().toISOString(),
    });

    // Update the user's total points
    const userProfileRef = firestore.doc(`users/${userId}/profile/${userId}`);
    batch.update(userProfileRef, {
      points: FieldValue.increment(pointsToAward),
    });

    // Commit the batch
    await batch.commit();

    return { awarded: true };
  } catch (error) {
    console.error(`Error in awardAchievement for user ${userId}, achievement ${achievementId}:`, error);
    // Re-throw to indicate failure to the calling server action
    throw new Error('Failed to process achievement award in the database.');
  }
}
