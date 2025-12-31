'use server';
/**
 * @fileOverview An AI agent for creating a debt pay-down plan.
 *
 * - generateDebtPlan - A function that handles creating the plan.
 * - GenerateDebtPlanInput - The input type for the function.
 * - GenerateDebtPlanOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DebtSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  currentBalance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
});

const GenerateDebtPlanInputSchema = z.object({
  debts: z.array(DebtSchema).describe('An array of the user\'s debts.'),
  monthlyBudget: z.number().describe('The total monthly amount the user can allocate to debt repayment.'),
  strategy: z.enum(['avalanche', 'snowball']).describe('The desired debt repayment strategy.'),
});
export type GenerateDebtPlanInput = z.infer<typeof GenerateDebtPlanInputSchema>;

const PaymentStepSchema = z.object({
  debtName: z.string().describe('The name of the debt to pay.'),
  paymentAmount: z.number().describe('The amount to pay towards this debt for the month.'),
});

const MonthlyPlanSchema = z.object({
  month: z.number().describe('The month number of the plan (e.g., 1, 2, 3).'),
  payments: z.array(PaymentStepSchema).describe('The payments to make for this month.'),
  totalPaid: z.number().describe('The total amount paid across all debts this month.'),
  remainingBalance: z.number().describe('The total remaining balance across all debts after this month\'s payments.'),
});

const GenerateDebtPlanOutputSchema = z.object({
  planTitle: z.string().describe('A title for the plan, e.g., "Debt Avalanche Strategy".'),
  summary: z.string().describe('A brief summary explaining the strategy and the expected outcome.'),
  estimatedPayoffTime: z.string().describe('The estimated time to become debt-free, in months or years.'),
  totalInterestSaved: z.number().describe('An estimation of the total interest saved compared to only paying minimums.'),
  monthlyPlan: z.array(MonthlyPlanSchema).describe('A step-by-step monthly payment plan.'),
});
export type GenerateDebtPlanOutput = z.infer<typeof GenerateDebtPlanOutputSchema>;

export async function generateDebtPlan(
  input: GenerateDebtPlanInput
): Promise<GenerateDebtPlanOutput> {
  return generateDebtPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDebtPlanPrompt',
  input: { schema: GenerateDebtPlanInputSchema },
  output: { schema: GenerateDebtPlanOutputSchema },
  prompt: `You are an expert debt counselor. Your task is to create a clear, step-by-step debt repayment plan for a user based on their financial data and chosen strategy.

  **User's Financial Data:**
  - **Debts:**
    {{#each debts}}
    - {{this.name}} ({{this.type}}): Balance of ₹{{this.currentBalance}} @ {{this.interestRate}}% APR, Min. Payment: ₹{{this.minimumPayment}}
    {{/each}}
  - **Total Monthly Debt Budget:** ₹{{{monthlyBudget}}}
  - **Chosen Strategy:** {{{strategy}}}

  **Your Task:**

  1.  **Explain the Strategy:** Briefly explain the chosen strategy (Avalanche: highest interest rate first; Snowball: smallest balance first).
  2.  **Create a Monthly Plan:** Generate a month-by-month payment schedule.
      - For each month, list which debt gets the minimum payment and which gets the "extra" payment (Total Budget - Sum of Minimums).
      - When a debt is paid off, roll its entire payment (minimum + extra) onto the next target debt in the chosen strategy.
      - Continue until all debts are paid off.
  3.  **Calculate Key Metrics:**
      - Estimate the total time (in months) to become debt-free.
      - Estimate the total interest saved compared to only paying minimums.
  4.  **Format the Output:** Return the full plan in the specified JSON format.

  **Important:**
  - All currency is in Indian Rupees (₹).
  - The calculations should be realistic. Assume interest is calculated monthly on the remaining balance.
  - Keep the plan clear and encouraging.

  Now, generate the complete debt repayment plan.`,
});

const generateDebtPlanFlow = ai.defineFlow(
  {
    name: 'generateDebtPlanFlow',
    inputSchema: GenerateDebtPlanInputSchema,
    outputSchema: GenerateDebtPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a debt plan.');
    }
    return output;
  }
);
