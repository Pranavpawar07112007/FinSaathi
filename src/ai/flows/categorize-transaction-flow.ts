'use server';
/**
 * @fileOverview A transaction categorization AI agent that learns from user preferences.
 *
 * - categorizeTransaction - A function that handles the transaction categorization.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirebaseApp } from '@/firebase/server-app';

const { firestore } = getFirebaseApp();

const UserPreferenceSchema = z.object({
  description: z.string(),
  category: z.string(),
});

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  userId: z.string().describe('The ID of the user for whom to categorize.'),
});
export type CategorizeTransactionInput = z.infer<
  typeof CategorizeTransactionInputSchema
>;

const CategorizeTransactionOutputSchema = z.object({
  category: z
    .enum([
      'Groceries',
      'Transport',
      'Entertainment',
      'Housing',
      'Salary',
      'Utilities',
      'Health',
      'Shopping',
      'Investment',
      'Savings',
      'Other',
    ])
    .describe(
      'The category of the transaction. Must be one of the specified enum values.'
    ),
});
export type CategorizeTransactionOutput = z.infer<
  typeof CategorizeTransactionOutputSchema
>;

async function getUserPreferences(userId: string): Promise<z.infer<typeof UserPreferenceSchema>[]> {
    try {
        const snapshot = await firestore.collection(`users/${userId}/userCategoryPreferences`).limit(50).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => doc.data() as z.infer<typeof UserPreferenceSchema>);
    } catch (error) {
        console.error("Error fetching user preferences:", error);
        return []; // Return empty array on error
    }
}


export async function categorizeTransaction(
  input: CategorizeTransactionInput
): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async ({ description, userId }) => {

    const userPreferences = await getUserPreferences(userId);

    const { output } = await ai.generate({
        prompt: `You are an expert at categorizing financial transactions. You MUST learn from the user's past categorization choices.

        Analyze the user's preferences first. If the new transaction description is similar to a past one, STRONGLY prefer the user's chosen category.
        
        User's Past Preferences (Description -> Category):
        ${userPreferences.map(p => `- "${p.description}" -> "${p.category}"`).join('\n') || 'No preferences yet.'}
        
        Based on these preferences, assign the following transaction to one of these categories: Groceries, Transport, Entertainment, Housing, Salary, Utilities, Health, Shopping, Investment, Savings, Other.
        
        New Transaction Description: "${description}"`,
        model: 'googleai/gemini-2.5-flash',
        output: {
            schema: CategorizeTransactionOutputSchema,
        },
    });
    
    return output!;
  }
);
