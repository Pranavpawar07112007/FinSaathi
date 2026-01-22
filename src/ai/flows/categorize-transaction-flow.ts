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

// --- Type Definitions ---
interface UserCategoryPreference {
  description: string;
  category: string;
}

interface CategorizationRule {
  keyword: string;
  category: string;
}

const { firestore } = getFirebaseApp();

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
      'Transfer',
    ])
    .describe(
      'The category of the transaction. Must be one of the specified enum values.'
    ),
});
export type CategorizeTransactionOutput = z.infer<
  typeof CategorizeTransactionOutputSchema
>;

// --- Helper Functions to Fetch Data ---

async function getUserPreferences(userId: string): Promise<UserCategoryPreference[]> {
    try {
        const snapshot = await firestore.collection(`users/${userId}/userCategoryPreferences`).limit(50).get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data() as UserCategoryPreference);
    } catch (error) {
        console.error("Error fetching user preferences:", error);
        return [];
    }
}

async function getUserRules(userId: string): Promise<CategorizationRule[]> {
    try {
        const snapshot = await firestore.collection(`users/${userId}/categorizationRules`).get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data() as CategorizationRule);
    } catch (error) {
        console.error("Error fetching user rules:", error);
        return [];
    }
}

/**
 * Main function to categorize a transaction.
 * It first checks for user-defined rules and applies them if a match is found.
 * If no rules match, it falls back to an AI-based categorization flow.
 */
export async function categorizeTransaction(
  input: CategorizeTransactionInput
): Promise<CategorizeTransactionOutput> {
  
  const { description, userId } = input;
  
  // 1. Check for hard-coded rules first
  const userRules = await getUserRules(userId);
  const lowerCaseDescription = description.toLowerCase();
  
  for (const rule of userRules) {
    if (lowerCaseDescription.includes(rule.keyword.toLowerCase())) {
        return { category: rule.category as CategorizeTransactionOutput['category'] };
    }
  }

  // 2. If no rule matches, proceed to the AI flow
  return categorizeTransactionAIFlow({ description, userId });
}

/**
 * AI-driven categorization flow that uses past user preferences for context.
 * This is used as a fallback when no specific rule matches.
 */
const categorizeTransactionAIFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionAIFlow',
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
        
        Based on these preferences, assign the following transaction to one of these categories: Groceries, Transport, Entertainment, Housing, Salary, Utilities, Health, Shopping, Investment, Savings, Other, Transfer.
        
        New Transaction Description: "${description}"`,
        model: 'googleai/gemini-2.5-flash',
        output: {
            schema: CategorizeTransactionOutputSchema,
        },
    });
    
    return output!;
  }
);
