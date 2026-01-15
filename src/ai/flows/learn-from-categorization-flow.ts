
'use server';
/**
 * @fileOverview An AI agent for learning user's transaction categorization preferences.
 *
 * - learnFromCategorization - A function that saves a user's category preference.
 */

import { z } from 'genkit';
import { getFirebaseApp } from '@/firebase/server-app';
import { Timestamp } from 'firebase-admin/firestore';

const { firestore } = getFirebaseApp();

const LearnCategorizationInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  description: z.string().describe('The transaction description.'),
  category: z.string().describe('The category assigned by the user.'),
});

export type LearnCategorizationInput = z.infer<
  typeof LearnCategorizationInputSchema
>;

/**
 * A server-side function to save a user's categorization preference.
 * This function uses the Firestore Admin SDK to upsert the preference.
 * An "upsert" means it will create a new preference or update an existing one for the same description.
 * @param input The user ID, transaction description, and chosen category.
 */
export async function learnFromCategorization(
  input: LearnCategorizationInput
): Promise<void> {
  const { userId, description, category } = input;

  if (!userId || !description || !category) {
    console.warn("learnFromCategorization received invalid input:", input);
    return;
  }
  
  // Create a consistent ID based on a hash of the description to ensure we can upsert.
  // Using a simple hash function here. In a real-world app, a more robust hash like SHA-1 would be better.
  const hash = description.split('').reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0);
    return acc & acc;
  }, 0).toString(16);

  const preferenceId = `pref_${hash}`;

  const preferenceRef = firestore.doc(
    `users/${userId}/userCategoryPreferences/${preferenceId}`
  );

  try {
    await preferenceRef.set({
      id: preferenceId,
      userId,
      description,
      category,
      lastUsed: Timestamp.now(),
    }, { merge: true }); // Use merge:true to create or update
  } catch (error) {
    console.error(`Error in learnFromCategorization for user ${userId}:`, error);
    // We don't re-throw here because this is a background "learning" task.
    // Failing to learn shouldn't block the user's primary action (like saving a transaction).
  }
}
