'use server';
/**
 * @fileOverview An AI agent for detecting potentially tax-deductible transactions.
 *
 * - detectTaxDeductible - A function that handles the detection.
 * - DetectTaxDeductibleInput - The input type for the function.
 * - DetectTaxDeductibleOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DetectTaxDeductibleInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
});
export type DetectTaxDeductibleInput = z.infer<
  typeof DetectTaxDeductibleInputSchema
>;

const DetectTaxDeductibleOutputSchema = z.object({
  isTaxDeductible: z
    .boolean()
    .describe('Whether the transaction is likely to be tax-deductible in India.'),
});
export type DetectTaxDeductibleOutput = z.infer<
  typeof DetectTaxDeductibleOutputSchema
>;

export async function detectTaxDeductible(
  input: DetectTaxDeductibleInput
): Promise<DetectTaxDeductibleOutput> {
  return detectTaxDeductibleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectTaxDeductiblePrompt',
  input: { schema: DetectTaxDeductibleInputSchema },
  output: { schema: DetectTaxDeductibleOutputSchema },
  prompt: `You are an expert in Indian tax law for individuals. Your task is to determine if a financial transaction is potentially tax-deductible.

  Analyze the following transaction description and determine if it falls into common categories for tax deductions or business expenses for an individual in India. Examples include health insurance premiums, donations to registered charities, business-related software, office supplies, etc.

  Do not consider salary, groceries, rent, or personal entertainment as deductible.

  Transaction Description: "{{{description}}}"

  Based on this, is the transaction potentially tax-deductible?
  `,
});

const detectTaxDeductibleFlow = ai.defineFlow(
  {
    name: 'detectTaxDeductibleFlow',
    inputSchema: DetectTaxDeductibleInputSchema,
    outputSchema: DetectTaxDeductibleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      // Default to false if the AI fails
      return { isTaxDeductible: false };
    }
    return output;
  }
);
