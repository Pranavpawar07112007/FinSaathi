
'use server';
/**
 * @fileOverview Generates a comprehensive financial overview using AI.
 *
 * - generateFinancialOverview - A function that analyzes financial data.
 * - FinancialOverviewInput - The input type for the function cloves,
 * - FinancialOverviewOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialOverviewInputSchema = z.object({
  transactions: z
    .string()
    .describe(
      "A JSON string of the user's recent transactions (up to 50)."
    ),
  accounts: z
    .string()
    .describe("A JSON string of the user's financial accounts and their balances."),
  investments: z
    .string()
    .describe("A JSON string of the user's investment portfolio."),
  budgets: z
    .string()
    .describe(
      "A JSON string of the user's budgets, including category, limit, and amount spent."
    ),
  goals: z
    .string()
    .describe(
      "A JSON string of the user's savings goals, including name, target amount, and current amount."
    ),
  debts: z
    .string()
    .describe("A JSON string of the user's financial debts, including current balance and interest rate."),
  achievements: z
    .string()
    .describe("A JSON string of the user's earned achievements and total points."),
  marketNews: z.string().describe('A JSON string of recent stock market news.'),
});
export type FinancialOverviewInput = z.infer<
  typeof FinancialOverviewInputSchema
>;

const FinancialOverviewOutputSchema = z.object({
  headlineSummary: z
    .string()
    .describe(
      "A single, concise sentence summarizing the user's overall financial health for the period."
    ),
  wellnessScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'A numerical score from 0 to 100 representing financial wellness. 100 is excellent. Consider all provided data points.'
    ),
  budgetAnalysis: z
    .string()
    .describe("A detailed paragraph analyzing budget performance. Mention specific categories where the user is over or under budget and provide encouragement or advice."),
  goalAnalysis: z
    .string()
    .describe("A detailed paragraph analyzing savings goal progress. Mention specific goals and comment on their progress, suggesting actions if they are falling behind."),
  investmentAnalysis: z
    .string()
    .describe("A detailed paragraph providing insights on the investment portfolio. If there's relevant market news, correlate it with the user's investments."),
  debtAnalysis: z
    .string()
    .describe("A detailed paragraph analyzing the user's debt situation. Comment on high-interest debts and the overall debt-to-income ratio if possible."),
  keyInsights: z
    .array(z.string())
    .length(3)
    .describe(
      'A list of exactly three interesting, non-obvious observations about spending, saving, or investing patterns. Connect data from different sources if possible (e.g., link debt payments to transaction history, or a stock\'s news to its performance).'
    ),
  actionableAdvice: z
    .array(z.string())
    .length(3)
    .describe(
      'A list of exactly three specific, actionable recommendations for improvement. Advice should be encouraging and practical, and should reference the user\'s specific data (including debts).'
    ),
});
export type FinancialOverviewOutput = z.infer<
  typeof FinancialOverviewOutputSchema
>;

export async function generateFinancialOverview(
  input: FinancialOverviewInput
): Promise<FinancialOverviewOutput> {
  return generateFinancialOverviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialOverviewPrompt',
  input: { schema: FinancialOverviewInputSchema },
  output: { schema: FinancialOverviewOutputSchema },
  prompt: `You are an expert, encouraging financial advisor named FinSaathi. Your task is to analyze a user's comprehensive financial data and provide a clear, concise, and helpful financial health report.

  First, analyze the transaction history to identify any recurring subscriptions or bills. Use this information as part of your overall analysis.

  Analyze the following data from all parts of the user's financial life:
  - Recent Transactions: {{{transactions}}}
  - Account Balances: {{{accounts}}}
  - Investment Portfolio: {{{investments}}}
  - Current Budgets (with spending): {{{budgets}}}
  - Savings Goals: {{{goals}}}
  - Debts: {{{debts}}}
  - Earned Achievements & Points: {{{achievements}}}
  - **Recent Market News**: {{{marketNews}}}

  Based on a holistic analysis of ALL this data, including any subscriptions you detect from the transactions, generate a detailed report with the following structure:

  1.  **Headline Summary**: A single, encouraging sentence that sums up their entire financial situation.
  2.  **Financial Wellness Score**: An integer score from 0-100. Calculate this by evaluating their income vs. expenses, savings, investments, and debt levels. A higher score means better financial health. High debt should negatively impact the score.
  3.  **Budget Analysis**: A detailed paragraph on budget performance.
  4.  **Goal Analysis**: A detailed paragraph on savings goal progress.
  5.  **Investment Analysis**: A detailed paragraph on the investment portfolio. **Crucially, if there is market news relevant to any of the user's investments, mention it here.** For example, "Recent news about a partnership for 'Reliance Industries' could be positive for your holding."
  6.  **Debt Analysis**: A new paragraph analyzing the user's debts. Comment on high-interest debts and the overall debt load.
  7.  **Key Insights**: Exactly three bullet points of interesting observations, connecting different data areas (e.g., "Your high-interest credit card debt might be slowing down your 'Vacation' goal progress."). If relevant, one insight should connect market news to the user's portfolio.
  8.  **Actionable Advice**: Exactly three friendly recommendations. Include advice related to managing debt if applicable (e.g., "Consider using the 'Debt Avalanche' method to tackle your highest-interest credit card first.").

  Always use Indian Rupee (₹) as the currency symbol where applicable. Your tone should be positive and empowering.`,
});

const generateFinancialOverviewFlow = ai.defineFlow(
  {
    name: 'generateFinancialOverviewFlow',
    inputSchema: FinancialOverviewInputSchema,
    outputSchema: FinancialOverviewOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a financial overview.');
    }
    return output;
  }
);
