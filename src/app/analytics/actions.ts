'use server';

import type { Transaction } from '@/app/page';
import { parse, format } from 'date-fns';

export interface CategoryData {
  category: string;
  total: number;
}

export interface MonthlyOverview {
  month: string;
  income: number;
  expense: number;
}

export interface AnalyticsData {
  expenseByCategory: CategoryData[];
  incomeByCategory: CategoryData[];
  monthlyOverview: MonthlyOverview[];
}

export async function getAnalyticsData(
  transactions: Transaction[]
): Promise<AnalyticsData> {
  const expenseByCategoryMap = new Map<string, number>();
  const incomeByCategoryMap = new Map<string, number>();
  const monthlyOverviewMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach((t) => {
    const date = parse(t.date, 'yyyy-MM-dd', new Date());
    const month = format(date, 'MMM yyyy');

    // Initialize monthly overview if it doesn't exist
    if (!monthlyOverviewMap.has(month)) {
      monthlyOverviewMap.set(month, { income: 0, expense: 0 });
    }
    const monthData = monthlyOverviewMap.get(month)!;

    if (t.amount < 0) {
      // Expense
      const expense = Math.abs(t.amount);
      monthData.expense += expense;

      const currentTotal = expenseByCategoryMap.get(t.category) || 0;
      expenseByCategoryMap.set(t.category, currentTotal + expense);
    } else {
      // Income
      monthData.income += t.amount;
      
      const currentTotal = incomeByCategoryMap.get(t.category) || 0;
      incomeByCategoryMap.set(t.category, currentTotal + t.amount);
    }
  });

  const expenseByCategory = Array.from(
    expenseByCategoryMap.entries(),
    ([category, total]) => ({ category, total })
  ).sort((a, b) => b.total - a.total);

  const incomeByCategory = Array.from(
    incomeByCategoryMap.entries(),
    ([category, total]) => ({ category, total })
  ).sort((a, b) => b.total - a.total);

  const monthlyOverview = Array.from(
    monthlyOverviewMap.entries(),
    ([month, { income, expense }]) => ({ month, income, expense })
  ).sort((a,b) => parse(a.month, 'MMM yyyy', new Date()).getTime() - parse(b.month, 'MMM yyyy', new Date()).getTime());

  return { expenseByCategory, incomeByCategory, monthlyOverview };
}
