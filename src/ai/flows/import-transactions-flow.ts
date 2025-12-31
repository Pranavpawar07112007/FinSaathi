
'use server';
/**
 * @fileOverview An AI agent for parsing and categorizing transactions from a CSV file.
 *
 * - importTransactions - A function that handles parsing and categorizing.
 * - ImportTransactionsInput - The input type for the function.
 * - ImportTransactionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TransactionSchema = z.object({
  date: z
    .string()
    .describe(
      'The date of the transaction in YYYY-MM-DD format. Infer the year if not present.'
    ),
  description: z.string().describe('The transaction description.'),
  amount: z
    .number()
    .describe(
      'The transaction amount. Use negative for debits/expenses and positive for credits/income.'
    ),
  category: z
    .string()
    .describe('The assigned financial category (e.g., Groceries, Salary).'),
});

const ImportTransactionsInputSchema = z.object({
  csvData: z
    .string()
    .describe(
      'The raw string content of a CSV file containing transaction data.'
    ),
});
export type ImportTransactionsInput = z.infer<
  typeof ImportTransactionsInputSchema
>;

const ImportTransactionsOutputSchema = z.object({
  transactions: z.array(TransactionSchema),
});
export type ImportTransactionsOutput = z.infer<
  typeof ImportTransactionsOutputSchema
>;

export async function importTransactions(
  input: ImportTransactionsInput
): Promise<ImportTransactionsOutput> {
  return importTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importTransactionsPrompt',
  input: { schema: ImportTransactionsInputSchema },
  output: { schema: ImportTransactionsOutputSchema },
  prompt: `You are an expert at parsing financial data from CSV files and categorizing transactions. Your task is to analyze the provided CSV data and convert it into a structured list of transactions.

  **Instructions:**
  1.  **Analyze the CSV Header**: The CSV may or may not have a header. Identify which columns correspond to the transaction date, description, and amount. Common headers are "Date", "Transaction", "Description", "Debit", "Credit", "Amount".
  2.  **Determine Amount**: Some CSVs have separate "Debit" and "Credit" columns. If so, combine them into a single \`amount\` field. Debits are expenses and should be **negative**. Credits are income and should be **positive**. Other CSVs might have a single "Amount" column with positive and negative values. Handle this correctly.
  3.  **Parse Dates**: Dates can be in various formats (e.g., 'dd/mm/yyyy', 'mm-dd-yy', 'Mon dd'). Convert all dates to 'YYYY-MM-DD' format. Assume the current year if the year is not specified.
  4.  **Categorize Transactions**: Based on the transaction description, assign a relevant category. Use standard categories like: Groceries, Transport, Entertainment, Housing, Salary, Utilities, Health, Shopping, Investment, Savings, Transfer, Other.
  5.  **Handle Irrelevant Rows**: Ignore any rows that are not actual transactions (e.g., summaries, balances, empty rows).

  **CSV Data to Parse:**
  \`\`\`csv
  {{{csvData}}}
  \`\`\`

  Return the parsed and categorized transactions as a JSON object.
  `,
});

const importTransactionsFlow = ai.defineFlow(
  {
    name: 'importTransactionsFlow',
    inputSchema: ImportTransactionsInputSchema,
    outputSchema: ImportTransactionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to parse the CSV data.');
    }
    return output;
  }
);
