
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
  accountName: z.string().optional().describe("The name of the bank or account holder if visible (e.g., 'HDFC Bank', 'Savings A/C')."),
  accountNumber: z.string().optional().describe("The last 4 digits of the account number, if visible."),
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
  1.  **Find Account Info**: First, look for the account name or bank name (e.g., "HDFC Bank", "ICICI A/C") and the last 4 digits of the account number if they are visible on the screen.
  2.  **Analyze the Image**: Carefully examine the screenshot to identify all individual transactions.
  3.  **Extract Details**: For each transaction, extract the date, the description, the amount, and any visible transaction ID/reference number.
  4.  **Clean Descriptions**: From the raw transaction description, extract the primary merchant or person's name. Remove extraneous details like "UPI/DR/", transaction IDs, bank codes (e.g., "YESB"), or other machine-readable codes. For example, 'TRANSFER TO 4897696162090 - UPI/DR/535436851766/VANDANA /YESB/q045675823/UPI' should become 'VANDANA'.
  5.  **Determine Amount**: Payments made (debits) should be **negative** numbers. Payments received (credits) should be **positive** numbers.
  6.  **Parse Dates**: Convert all dates to 'YYYY-MM-DD' format. If the year is not specified, assume it's the most recent possible year relative to today.
  7.  **Categorize**: Assign a logical category like 'Food', 'Shopping', or 'Salary' based on the cleaned description.
  8.  **Handle Non-Transactions**: Ignore any text or elements that are not specific transactions. If no transactions are found, return an empty array.

  **Image to Parse:**
  {{media url=imageDataUri}}

  Return the parsed account info and categorized transactions as a JSON object.
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
