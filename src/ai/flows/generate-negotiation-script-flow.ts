
'use server';
/**
 * @fileOverview An AI agent for generating bill negotiation scripts.
 *
 * - generateNegotiationScript - A function that handles script generation.
 * - GenerateNegotiationScriptInput - The input type for the function.
 * - GenerateNegotiationScriptOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateNegotiationScriptInputSchema = z.object({
  serviceName: z.string().describe('The name of the service provider (e.g., Netflix, Airtel).'),
  currentBillAmount: z.number().describe('The current amount of the bill.'),
});
export type GenerateNegotiationScriptInput = z.infer<
  typeof GenerateNegotiationScriptInputSchema
>;

const GenerateNegotiationScriptOutputSchema = z.object({
  negotiationScript: z
    .string()
    .describe('A polite, effective script for the user to negotiate their bill. This can be for a phone call or an email.'),
});
export type GenerateNegotiationScriptOutput = z.infer<
  typeof GenerateNegotiationScriptOutputSchema
>;

export async function generateNegotiationScript(
  input: GenerateNegotiationScriptInput
): Promise<GenerateNegotiationScriptOutput> {
  return generateNegotiationScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNegotiationScriptPrompt',
  input: { schema: GenerateNegotiationScriptInputSchema },
  output: { schema: GenerateNegotiationScriptOutputSchema },
  prompt: `You are a negotiation expert specializing in helping Indian consumers lower their recurring bills.

  A user wants to negotiate their bill with {{{serviceName}}}. Their current bill is ₹{{{currentBillAmount}}}.

  Your task is to generate a polite, friendly, and effective script for them to use. The script should be in the format of an email they can send to customer support.

  The script should:
  1.  Start by politely stating they are a loyal customer.
  2.  Mention their current bill amount.
  3.  Inquire if there are any available promotions, discounts, or loyalty offers to help lower their bill.
  4.  Subtly hint at considering other options if a better rate isn't possible, but do so in a very polite, non-threatening way.
  5.  End with a friendly closing, thanking the support agent for their time.

  Make the tone sound like a regular person, not a corporate robot. Use Indian Rupee (₹) symbol.
  `,
});

const generateNegotiationScriptFlow = ai.defineFlow(
  {
    name: 'generateNegotiationScriptFlow',
    inputSchema: GenerateNegotiationScriptInputSchema,
    outputSchema: GenerateNegotiationScriptOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a negotiation script.');
    }
    return output;
  }
);
