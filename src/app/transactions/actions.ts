
'use server';

import {
  categorizeTransaction,
  type CategorizeTransactionInput,
} from '@/ai/flows/categorize-transaction-flow';
import {
  importTransactions,
  type ImportTransactionsInput,
  type ImportTransactionsOutput,
} from '@/ai/flows/import-transactions-flow';
import {
  importFromImage,
  type ImportFromImageInput,
} from '@/ai/flows/import-from-image-flow';
import { 
    importFromPdf,
    type ImportFromPdfInput,
} from '@/ai/flows/import-from-pdf-flow';
import { z } from 'zod';

const categorizationSchema = z.object({
  description: z.string().min(1, 'Description is required'),
});

/**
 * Server action to get an AI-suggested category for a transaction.
 * This action does NOT write to Firestore. It only returns the category.
 */
export async function getTransactionCategoryAction(
  description: string
): Promise<{ category?: string; error?: string }> {
  const validatedFields = categorizationSchema.safeParse({ description });

  if (!validatedFields.success) {
    return { error: 'Invalid description provided.' };
  }

  try {
    const categorizationInput: CategorizeTransactionInput = {
      description,
    };
    const result = await categorizeTransaction(categorizationInput);
    return { category: result.category };
  } catch (error) {
    console.error(
      'AI categorization failed, will fall back to default "Other" category on the client.',
      error
    );
    // Return an error or a default category, client can decide
    return { category: 'Other' };
  }
}

/**
 * Server action to parse transactions from a CSV file using AI.
 * Returns the parsed data for user review. Does NOT write to the database.
 */
export async function importTransactionsAction(
  csvData: string
): Promise<{ transactions?: ImportTransactionsOutput['transactions']; error?: string }> {
  if (!csvData) {
    return { error: 'CSV data is empty.' };
  }

  try {
    const input: ImportTransactionsInput = { csvData };
    const result = await importTransactions(input);
    return { transactions: result.transactions };
  } catch (error) {
    console.error('AI CSV parsing failed:', error);
    return { error: 'The AI failed to parse the CSV file. Please check the file format and try again.' };
  }
}

/**
 * Server action to parse transactions from an image file using AI.
 */
export async function importFromImageAction(
  imageDataUri: string
): Promise<{ transactions?: ImportTransactionsOutput['transactions']; error?: string }> {
  if (!imageDataUri) {
    return { error: 'Image data is empty.' };
  }

  try {
    const input: ImportFromImageInput = { imageDataUri };
    const result = await importFromImage(input);
    return { transactions: result.transactions };
  } catch (error) {
    console.error('AI image parsing failed:', error);
    return { error: 'The AI failed to parse the image. Please try again with a clearer screenshot.' };
  }
}

/**
 * Server action to parse transactions from a PDF file using AI.
 */
export async function importFromPdfAction(
  pdfDataUri: string
): Promise<{ transactions?: ImportTransactionsOutput['transactions']; error?: string }> {
  if (!pdfDataUri) {
    return { error: 'PDF data is empty.' };
  }

  try {
    const input: ImportFromPdfInput = { pdfDataUri };
    const result = await importFromPdf(input);
    return { transactions: result.transactions };
  } catch (error) {
    console.error('AI PDF parsing failed:', error);
    return { error: 'The AI failed to parse the PDF file. Please try again with a clearer document.' };
  }
}
