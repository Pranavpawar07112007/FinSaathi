
'use server';
/**
 * @fileOverview Generates personalized financial advice based on user data.
 *
 * - generateFinancialAdvice - A function that generates personalized financial advice.
 * - FinancialAdviceInput - The input type for the generateFinancialAdvice function.
 * - FinancialAdviceOutput - The return type for the generateFinancialAdvice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialAdviceInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe('A JSON string of user\'s transaction history. If empty or contains "general advice", provide general advice.'),
  budgets: z
    .string()
    .describe('A JSON string of user\'s budgets, including name, limit and spent amount.'),
  goals: z
    .string()
    .describe('A JSON string of user\'s savings goals, including name, target amount and current amount.'),
  accounts: z
    .string()
    .describe("A JSON string of the user's financial accounts and their balances."),
  investments: z
    .string()
    .describe("A JSON string of the user's investment portfolio."),
  debts: z
    .string()
    .describe("A JSON string of the user's financial debts."),
  achievements: z
    .string()
    .describe("A JSON string of the user's earned achievements and total points."),
  riskTolerance: z
    .enum(['low', 'medium', 'high'])
    .describe(
      'The risk tolerance of the user, can be low, medium, or high.'
    ),
  financialGoals: z.string().describe('The financial goals of the user.'),
  feedbackHistory: z.string().describe('A JSON string of the user\'s past feedback on advice they have received.'),
  marketNews: z.string().describe('A JSON string of recent stock market news.'),
});
export type FinancialAdviceInput = z.infer<typeof FinancialAdviceInputSchema>;

const FinancialAdviceOutputSchema = z.object({
  advice: z
    .string()
    .describe(
      'Personalized or general financial advice based on the user data.'
    ),
});
export type FinancialAdviceOutput = z.infer<
  typeof FinancialAdviceOutputSchema
>;

export async function generateFinancialAdvice(
  input: FinancialAdviceInput
): Promise<FinancialAdviceOutput> {
  return generateFinancialAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAdvicePrompt',
  input: { schema: FinancialAdviceInputSchema },
  output: { schema: FinancialAdviceOutputSchema },
  prompt: `You are a personal finance advisor for a user in India. Your name is FinSaathi.

  Your task is to provide clear, actionable financial advice based on the user's data and, crucially, their past feedback.
  Use Indian Rupee (₹) as the currency symbol where applicable.
  Your response MUST be structured with simple HTML tags for readability. Use \`<p>\` for paragraphs, \`<strong>\` for bolding key terms and numbers, and \`<ul>\` or \`<ol>\` with \`<li>\` for lists. Do not use Markdown (e.g., \`**\`, \`*\`, \`-\`).

  **Crucially, you must learn from the user's past feedback.** Analyze their feedback history to understand their preferences and tailor your advice accordingly.
  - If they've rated advice as "bad", avoid making similar suggestions. For example, if they disliked a suggestion to invest in stocks, focus more on safer options like FDs or debt funds.
  - If they've rated advice as "good", lean into that style of recommendation.

  **Incorporate Market News:** Analyze the provided market news and connect it to the user's specific investments if relevant. For example, if there's news about a stock the user owns, mention it.

  Here is the user's information:
  - Risk Tolerance: {{{riskTolerance}}}
  - Financial Goals: {{{financialGoals}}}
  - Transaction History: {{{transactionHistory}}}
  - Account Balances: {{{accounts}}}
  - Budgets: {{{budgets}}}
  - Savings Goals: {{{goals}}}
  - Investments: {{{investments}}}
  - Debts: {{{debts}}}
  - Achievements: {{{achievements}}}
  - **Past Feedback History**: {{{feedbackHistory}}}
  - **Recent Market News**: {{{marketNews}}}

  If the transaction history and other data are available and relevant, base your advice on it to provide personalized recommendations. Look for connections between different data points (e.g., how spending habits affect goal progress, or how investments align with risk tolerance, or how debt might impact savings).
  If the transaction history is not available or the user requested general advice, provide general financial advice relevant to their goals and risk tolerance, without mentioning their specific spending.
  
  Your primary directive is to adapt to the user's feedback to become a more personalized and trusted advisor over time.
  `,
});

const generateFinancialAdviceFlow = ai.defineFlow(
  {
    name: 'generateFinancialAdviceFlow',
    inputSchema: FinancialAdviceInputSchema,
    outputSchema: FinancialAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate financial advice.');
    }
    return output;
  }
);
