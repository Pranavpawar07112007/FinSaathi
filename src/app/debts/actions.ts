
'use server';

import {
  generateDebtPlan,
  type GenerateDebtPlanInput,
  type GenerateDebtPlanOutput,
} from '@/ai/flows/generate-debt-plan-flow';
import { z } from 'zod';

const DebtSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  currentBalance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
});


const getPlanSchema = z.object({
  debts: z.array(DebtSchema),
  monthlyBudget: z.coerce.number().positive(),
  strategy: z.enum(['avalanche', 'snowball']),
});

type State = {
  plan?: GenerateDebtPlanOutput | null;
  error?: string | null;
};

export async function getDebtPlanAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = getPlanSchema.safeParse({
    debts: JSON.parse(formData.get('debts') as string || '[]'),
    monthlyBudget: formData.get('monthlyBudget'),
    strategy: formData.get('strategy'),
  });

  if (!validatedFields.success) {
    return {
      error: 'Invalid submission. Please check the form and try again.',
    };
  }

  const { debts, monthlyBudget, strategy } = validatedFields.data;

  if (debts.length === 0) {
    return { error: 'You must have at least one debt to generate a plan.' };
  }
  
  const totalMinimumPayments = debts.reduce((acc, debt) => acc + (debt.minimumPayment || 0), 0);
  if (monthlyBudget < totalMinimumPayments) {
      return { error: `Your monthly budget must be at least the total of your minimum payments (₹${totalMinimumPayments}).` };
  }


  try {
    const input: GenerateDebtPlanInput = {
      debts,
      monthlyBudget,
      strategy,
    };

    const result = await generateDebtPlan(input);
    return { plan: result };
  } catch (error) {
    console.error('AI Error in getDebtPlanAction:', error);
    return {
      error:
        'Failed to get a response from the AI. The service may be temporarily unavailable.',
    };
  }
}
