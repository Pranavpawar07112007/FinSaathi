'use server';
/**
 * @fileOverview An AI agent for extracting a common keyword from transaction descriptions.
 *
 * - extractKeywordFromDescriptions - A function that handles keyword extraction.
 * - ExtractKeywordInput - The input type for the function.
 * - ExtractKeywordOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractKeywordInputSchema = z.object({
  descriptions: z
    .array(z.string())
    .describe('A list of transaction descriptions to analyze.'),
});
export type ExtractKeywordInput = z.infer<typeof ExtractKeywordInputSchema>;

const ExtractKeywordOutputSchema = z.object({
  keyword: z
    .string()
    .describe(
      'The single best, most specific, common keyword found in the descriptions.'
    ),
});
export type ExtractKeywordOutput = z.infer<typeof ExtractKeywordOutputSchema>;

export async function extractKeywordFromDescriptions(
  input: ExtractKeywordInput
): Promise<ExtractKeywordOutput> {
  return extractKeywordFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractKeywordPrompt',
  input: { schema: ExtractKeywordInputSchema },
  output: { schema: ExtractKeywordOutputSchema },
  prompt: `You are an expert at identifying patterns in text. Given the following list of transaction descriptions, find the single best, most specific, common keyword to create a categorization rule. This keyword is usually a merchant name, a person's name, or a specific service. Avoid generic words like 'payment', 'transfer', or 'purchase'. The keyword should be case-sensitive as it appears in the text.

  Transaction Descriptions:
  {{#each descriptions}}
  - "{{{this}}}"
  {{/each}}
  `,
});

const extractKeywordFlow = ai.defineFlow(
  {
    name: 'extractKeywordFlow',
    inputSchema: ExtractKeywordInputSchema,
    outputSchema: ExtractKeywordOutputSchema,
  },
  async (input) => {
    // A little pre-processing to avoid sending a massive list to the AI.
    // Use a Set to get unique descriptions and limit to 20 examples.
    const uniqueDescriptions = Array.from(new Set(input.descriptions)).slice(
      0,
      20
    );

    const { output } = await prompt({ descriptions: uniqueDescriptions });
    if (!output) {
      throw new Error('AI failed to extract a keyword.');
    }
    return output;
  }
);
