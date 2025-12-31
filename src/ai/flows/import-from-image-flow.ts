
'use server';
/**
 * @fileOverview An AI agent for parsing transactions from a UPI app screenshot.
 *
 * - importFromImage - A function that handles parsing from an image.
 * - ImportFromImageInput - The input type for the function.
 * - ImportFromImageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TransactionSchema = z.object({
  date: z
    .string()
    .describe(
      'The date of the transaction in YYYY-MM-DD format. Infer the year if not present. Use the most recent possible year.'
    ),
  description: z.string().describe('The transaction description (e.g., name of person or merchant).'),
  amount: z
    .number()
    .describe(
      'The transaction amount. Use negative for debits/payments made and positive for credits/payments received.'
    ),
  category: z
    .string()
    .describe('Assign a relevant financial category (e.g., Food, Shopping, Transfer).'),
  bankTransactionId: z.string().optional().describe('The unique transaction ID or reference number, if visible.'),
});

const ImportFromImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A screenshot of a UPI app's transaction history, as a data URI."
    ),
});
export type ImportFromImageInput = z.infer<
  typeof ImportFromImageInputSchema
>;

const ImportFromImageOutputSchema = z.object({
  transactions: z.array(TransactionSchema),
});
export type ImportFromImageOutput = z.infer<
  typeof ImportFromImageOutputSchema
>;

export async function importFromImage(
  input: ImportFromImageInput
): Promise<ImportFromImageOutput> {
  return importFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importFromImagePrompt',
  input: { schema: ImportFromImageInputSchema },
  output: { schema: ImportFromImageOutputSchema },
  prompt: `You are an expert at extracting transaction details from screenshots of Indian UPI payment apps (like Google Pay, PhonePe, Paytm).

  **Instructions:**
  1.  **Analyze the Image**: Carefully examine the screenshot to identify all individual transactions.
  2.  **Extract Details**: For each transaction, extract the date, the description (recipient/sender name), the amount, and any visible transaction ID/reference number.
  3.  **Determine Amount**: Payments made (debits) should be **negative** numbers. Payments received (credits) should be **positive** numbers.
  4.  **Parse Dates**: Convert all dates to 'YYYY-MM-DD' format. If the year is not specified, assume it's the most recent possible year relative to today.
  5.  **Categorize**: Assign a logical category like 'Income' or 'Expense' based on the description. Avoid 'Investment' or 'Transfer' as the image lacks context. Use specific categories like 'Food', 'Shopping', or 'Salary' where obvious.
  6.  **Handle Non-Transactions**: Ignore any text or elements that are not specific transactions. If no transactions are found, return an empty array.

  **Image to Parse:**
  {{media url=imageDataUri}}

  Return the parsed and categorized transactions as a JSON object.
  `,
});

const importFromImageFlow = ai.defineFlow(
  {
    name: 'importFromImageFlow',
    inputSchema: ImportFromImageInputSchema,
    outputSchema: ImportFromImageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to parse the image data.');
    }
    return output;
  }
);
