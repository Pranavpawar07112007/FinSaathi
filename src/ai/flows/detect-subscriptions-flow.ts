
'use server';
/**
 * @fileOverview An AI agent for detecting recurring subscriptions from transaction data.
 *
 * - detectSubscriptions - A function that handles subscription detection.
 * - DetectSubscriptionsInput - The input type for the function.
 * - DetectSubscriptionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addMonths, addYears, format } from 'date-fns';

const TransactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  category: z.string(),
});

const DetectSubscriptionsInputSchema = z.object({
  transactions: z
    .array(TransactionSchema)
    .describe('An array of user transactions.'),
});
export type DetectSubscriptionsInput = z.infer<
  typeof DetectSubscriptionsInputSchema
>;

const SubscriptionSchema = z.object({
  name: z.string().describe('The name of the subscription service (e.g., Netflix, Spotify).'),
  lastAmount: z.number().describe('The amount of the last detected payment.'),
  lastDate: z.string().describe('The date of the last detected payment in YYYY-MM-DD format.'),
  frequency: z.enum(['monthly', 'yearly', 'other']).describe('The estimated payment frequency.'),
  nextDueDate: z.string().optional().describe('The predicted next due date in YYYY-MM-DD format.'),
  suggestion: z.string().describe('A brief, actionable insight for the user about this subscription. For example, flag low-usage or forgotten subscriptions.'),
});

const DetectSubscriptionsOutputSchema = z.object({
  subscriptions: z
    .array(SubscriptionSchema)
    .describe('A list of detected recurring subscriptions.'),
});
export type DetectSubscriptionsOutput = z.infer<
  typeof DetectSubscriptionsOutputSchema
>;

export async function detectSubscriptions(
  input: DetectSubscriptionsInput
): Promise<DetectSubscriptionsOutput> {
  const result = await detectSubscriptionsFlow(input);
  
  // Post-process to add next due date
  if (result.subscriptions) {
    result.subscriptions = result.subscriptions.map(sub => {
      const lastDate = new Date(sub.lastDate);
      let nextDueDate: Date | null = null;
      if (sub.frequency === 'monthly') {
        nextDueDate = addMonths(lastDate, 1);
      } else if (sub.frequency === 'yearly') {
        nextDueDate = addYears(lastDate, 1);
      }
      return {
        ...sub,
        nextDueDate: nextDueDate ? format(nextDueDate, 'yyyy-MM-dd') : undefined,
      }
    });
  }

  return result;
}

const prompt = ai.definePrompt({
  name: 'detectSubscriptionsPrompt',
  input: { schema: DetectSubscriptionsInputSchema }, // Correctly use the full input schema
  output: { schema: DetectSubscriptionsOutputSchema },
  prompt: `You are an expert financial auditor specializing in detecting recurring subscriptions and bills from a list of transactions.

  Your task is to analyze the user's transaction history and identify all recurring payments. These can include streaming services, utilities, rent, or any other regular charge.

  For each subscription you identify, provide the following:
  - The service name.
  - The amount of the last payment.
  - The date of the last payment.
  - The likely payment frequency (monthly, yearly, or other).
  - A helpful suggestion. For the suggestion, analyze the payment history. If it looks like a service they might have forgotten (e.g., not used recently, based on transaction description), flag it. For example: "You've been paying for this for 6 months. Is it still providing value?" or "This is a recurring utility bill."

  Here is the user's transaction history:
  {{#each transactions}}
  - Date: {{{this.date}}}, Description: {{{this.description}}}, Amount: {{{this.amount}}}
  {{/each}}

  Analyze the data and return a list of all detected subscriptions. If no subscriptions are found, return an empty array.
  `,
});

const detectSubscriptionsFlow = ai.defineFlow(
  {
    name: 'detectSubscriptionsFlow',
    inputSchema: DetectSubscriptionsInputSchema,
    outputSchema: DetectSubscriptionsOutputSchema,
  },
  async (input) => {
    // Directly pass the structured input to the prompt.
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to detect subscriptions.');
    }
    return output;
  }
);
