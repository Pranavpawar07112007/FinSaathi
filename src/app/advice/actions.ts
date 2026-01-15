
'use server';

import {
  generateFinancialAdvice,
  type FinancialAdviceInput,
} from '@/ai/flows/financial-advice-flow';
import { z } from 'zod';
import { getFirebaseApp } from '@/firebase/server-app';
import { collection, addDoc } from 'firebase/firestore';


const formSchema = z.object({
  riskTolerance: z.enum(['low', 'medium', 'high']),
  financialGoals: z
    .string()
    .min(10, 'Please describe your financial goals in more detail.'),
  adviceType: z.enum(['personalized', 'general']),
  // These fields will contain stringified JSON
  transactionHistory: z.string().optional(),
  budgets: z.string().optional(),
  goals: z.string().optional(),
  accounts: z.string().optional(),
  investments: z.string().optional(),
  debts: z.string().optional(),
  achievements: z.string().optional(),
  feedbackHistory: z.string().optional(),
  marketNews: z.string().optional(),
});

type State = {
  message?: 'success' | 'error' | null;
  advice?: string | null;
  issues?: string[] | null;
  adviceId?: string;
};

export async function getFinancialAdviceAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = formSchema.safeParse({
    riskTolerance: formData.get('riskTolerance'),
    financialGoals: formData.get('financialGoals'),
    adviceType: formData.get('adviceType'),
    transactionHistory: formData.get('transactionHistory'),
    budgets: formData.get('budgets'),
    goals: formData.get('goals'),
    accounts: formData.get('accounts'),
    investments: formData.get('investments'),
    debts: formData.get('debts'),
    achievements: formData.get('achievements'),
    feedbackHistory: formData.get('feedbackHistory'),
    marketNews: formData.get('marketNews'),
  });

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    return {
      message: 'error',
      issues: fieldErrors.financialGoals,
      advice: 'There was an error with your submission. Please check the form and try again.',
    };
  }
  
  const { riskTolerance, financialGoals, adviceType, transactionHistory, budgets, goals, accounts, investments, debts, achievements, feedbackHistory, marketNews } = validatedFields.data;

  // Use transaction history and other data only if it's personalized advice and data is available
  const finalTransactionHistory = 
    adviceType === 'personalized' && transactionHistory 
    ? transactionHistory 
    : 'No transaction history provided. User requested general advice.';

  const finalBudgets = adviceType === 'personalized' && budgets ? budgets : 'No budget data provided.';
  const finalGoals = adviceType === 'personalized' && goals ? goals : 'No goal data provided.';
  const finalAccounts = adviceType === 'personalized' && accounts ? accounts : 'No account data provided.';
  const finalInvestments = adviceType === 'personalized' && investments ? investments : 'No investment data provided.';
  const finalDebts = adviceType === 'personalized' && debts ? debts : 'No debt data provided.';
  const finalAchievements = adviceType === 'personalized' && achievements ? achievements : 'No achievement data provided.';
  const finalFeedbackHistory = adviceType === 'personalized' && feedbackHistory ? feedbackHistory : 'No feedback history provided.';
  const finalMarketNews = adviceType === 'personalized' && marketNews ? marketNews : 'No market news provided.';

  const input: FinancialAdviceInput = {
    transactionHistory: finalTransactionHistory,
    budgets: finalBudgets,
    goals: finalGoals,
    accounts: finalAccounts,
    investments: finalInvestments,
    debts: finalDebts,
    achievements: finalAchievements,
    riskTolerance,
    financialGoals,
    feedbackHistory: finalFeedbackHistory,
    marketNews: finalMarketNews,
  };

  try {
    const result = await generateFinancialAdvice(input);
    // Generate a temporary unique ID for the advice to be used for feedback
    const adviceId = `temp_${Date.now()}`;
    return {
      message: 'success',
      advice: result.advice,
      adviceId: adviceId,
      issues: null,
    };
  } catch (error) {
    console.error('AI Error in getFinancialAdviceAction:', error);
    return {
      message: 'error',
      advice: 'Failed to generate financial advice from the AI. The service may be temporarily unavailable. Please try again later.',
      issues: null,
    };
  }
}
