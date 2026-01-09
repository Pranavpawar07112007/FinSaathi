
'use server';
/**
 * @fileOverview An AI agent for parsing transactions from a PDF document.
 *
 * - importFromPdf - A function that handles parsing from a PDF.
 * - ImportFromPdfInput - The input type for the function.
 * - ImportFromPdfOutput - The return type for the function.
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
      'The transaction amount. Use negative for debits/payments made/withdrawals and positive for credits/payments received/deposits.'
    ),
  category: z
    .string()
    .describe('Assign a relevant financial category (e.g., Food, Shopping, Transfer, Salary).'),
   bankTransactionId: z.string().optional().describe('The unique transaction ID or reference number, if available.'),
});

const ImportFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A bank statement or credit card statement PDF, as a data URI."
    ),
});
export type ImportFromPdfInput = z.infer<
  typeof ImportFromPdfInputSchema
>;

const ImportFromPdfOutputSchema = z.object({
  transactions: z.array(TransactionSchema),
});
export type ImportFromPdfOutput = z.infer<
  typeof ImportFromPdfOutputSchema
>;

export async function importFromPdf(
  input: ImportFromPdfInput
): Promise<ImportFromPdfOutput> {
  return importFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importFromPdfPrompt',
  input: { schema: ImportFromPdfInputSchema },
  output: { schema: ImportFromPdfOutputSchema },
  prompt: `You are an expert at extracting transaction details from PDF bank and credit card statements.

  **Instructions:**
  1.  **Analyze the Document**: Carefully examine the PDF document to identify all individual transactions. The document could be a bank account statement or a credit card statement. Look for columns like 'Date', 'Description', 'Withdrawal', 'Deposit', 'Debit', 'Credit'.
  2.  **Extract Details**: For each transaction, extract the date, the description, the amount, and any transaction reference number available.
  3.  **Clean Descriptions**: From the raw transaction description, extract the primary merchant or person's name. Remove extraneous details like "UPI/DR/", transaction IDs, bank codes (e.g., "YESB"), or other machine-readable codes. For example, 'TRANSFER TO 4897696162090 - UPI/DR/535436851766/VANDANA /YESB/q045675823/UPI' should become 'VANDANA'.
  4.  **Determine Amount**: Look for withdrawal/debit and deposit/credit columns. Amounts in a debit or withdrawal column should be **negative** numbers (expenses). Amounts in a credit or deposit column should be **positive** numbers (income). If there is only a single amount column, infer based on the description (e.g., "ATM Withdrawal" is negative).
  5.  **Parse Dates**: Convert all dates to 'YYYY-MM-DD' format. If the year is not specified, assume it's the most recent possible year relative to today.
  6.  **Categorize**: Assign a logical category like 'Food', 'Shopping', or 'Salary' based on the cleaned description.
  7.  **Handle Non-Transactions**: Ignore any text or elements that are not specific transactions (like summary sections, bank info, etc.). If no transactions are found, return an empty array.

  **PDF Document to Parse:**
  {{media url=pdfDataUri}}

  Return the parsed and categorized transactions as a JSON object.
  `,
});

const importFromPdfFlow = ai.defineFlow(
  {
    name: 'importFromPdfFlow',
    inputSchema: ImportFromPdfInputSchema,
    outputSchema: ImportFromPdfOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to parse the PDF data.');
    }
    return output;
  }
);
