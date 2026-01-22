'use server';

import { z } from 'zod';
import { getFirebaseApp } from '@/firebase/server-app';
import { Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

const saveRuleSchema = z.object({
  userId: z.string(),
  keyword: z.string().min(1, 'Keyword cannot be empty.'),
  category: z.string().min(1, 'Category cannot be empty.'),
});

/**
 * Server action to save a new categorization rule to Firestore.
 */
export async function saveRuleAction(
  input: z.infer<typeof saveRuleSchema>
): Promise<{ success: boolean; error?: string }> {
  const validatedFields = saveRuleSchema.safeParse(input);
  if (!validatedFields.success) {
    return { success: false, error: 'Invalid input.' };
  }
  
  const { userId, keyword, category } = validatedFields.data;
  const { firestore } = getFirebaseApp();

  // Create a consistent ID based on the keyword to prevent duplicates.
  const ruleId = createHash('md5').update(keyword.toLowerCase()).digest('hex');
  const ruleRef = firestore.doc(
    `users/${userId}/categorizationRules/${ruleId}`
  );

  try {
    await ruleRef.set({
      id: ruleId,
      userId,
      keyword, // Store with original casing
      category,
      createdAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving categorization rule:', error);
    return {
      success: false,
      error: 'Failed to save the rule to the database.',
    };
  }
}
