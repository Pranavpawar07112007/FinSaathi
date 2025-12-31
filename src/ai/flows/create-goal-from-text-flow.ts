'use server';
/**
 * @fileOverview An AI agent for creating a savings goal from natural language.
 *
 * - createGoalFromText - A function that handles creating the goal.
 * - CreateGoalFromTextInput - The input type for the function.
 * - CreateGoalFromTextOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreateGoalFromTextInputSchema = z.object({
  text: z.string().describe('The user\'s description of their savings goal in natural language.'),
});
export type CreateGoalFromTextInput = z.infer<
  typeof CreateGoalFromTextInputSchema
>;

const CreateGoalFromTextOutputSchema = z.object({
  name: z.string().describe('A concise, clear name for the goal (e.g., "New Laptop").'),
  targetAmount: z.number().describe('The estimated total amount needed for the goal.'),
});
export type CreateGoalFromTextOutput = z.infer<
  typeof CreateGoalFromTextOutputSchema
>;

// This flow now ONLY processes text and returns structured data.
// It does NOT interact with Firestore.
export const createGoalFromText = ai.defineFlow(
  {
    name: 'createGoalFromTextFlow',
    inputSchema: CreateGoalFromTextInputSchema,
    outputSchema: CreateGoalFromTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate goal details.');
    }
    return output;
  }
);


const prompt = ai.definePrompt({
  name: 'createGoalFromTextPrompt',
  input: { schema: CreateGoalFromTextInputSchema },
  output: { schema: CreateGoalFromTextOutputSchema },
  prompt: `You are an expert at understanding personal finance goals. A user wants to create a savings goal. Analyze their request and extract the key details.

  User's Request: "{{{text}}}"

  Based on their request, determine the following:
  1.  **name**: A short, clear name for the goal.
  2.  **targetAmount**: A reasonable estimate of the total cost in Indian Rupees (₹). If they provide a number, use it. If not, make a sensible estimate (e.g., a trip to Europe might be ₹200,000).

  Do NOT attempt to calculate or include a target date.
  `,
});
