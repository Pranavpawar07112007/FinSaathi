
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WithId } from '@/firebase/firestore/use-collection';
import { getMonth, getYear, parseISO } from 'date-fns';

interface SummaryCardsProps {
  transactions: WithId<any>[] | null;
  accounts: WithId<{ balance: number }>[] | null;
  isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function SummaryCards({ transactions, accounts, isLoading }: SummaryCardsProps) {
  const { totalIncome, totalExpense } = useMemo(() => {
    if (!transactions) {
      return { totalIncome: 0, totalExpense: 0 };
    }
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      totalIncome: income,
      totalExpense: expense,
    };
  }, [transactions]);
  
  const netBalance = useMemo(() => {
      if(!accounts) return 0;
      return accounts.reduce((acc, account) => acc + account.balance, 0);
  }, [accounts]);

  const { monthlyIncome, monthlyExpense, currentMonthLabel } = useMemo(() => {
    if (!transactions) {
      return { monthlyIncome: 0, monthlyExpense: 0, currentMonthLabel: '' };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthLabel = now.toLocaleString('default', { month: 'short', year: 'numeric' });


    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return getYear(transactionDate) === currentYear && getMonth(transactionDate) === currentMonth;
    });

    const income = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const expense = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    return { monthlyIncome: income, monthlyExpense: expense, currentMonthLabel: monthLabel };
  }, [transactions]);


  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  const monthlyNetFlow = monthlyIncome + monthlyExpense; // expense is negative

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</div>
            <p className="text-xs text-muted-foreground">For {currentMonthLabel}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expense</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-destructive">
                {formatCurrency(Math.abs(monthlyExpense))}
            </div>
            <p className="text-xs text-muted-foreground">For {currentMonthLabel}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Net Flow</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className={`text-2xl font-bold ${monthlyNetFlow < 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(monthlyNetFlow)}
            </div>
            <p className="text-xs text-muted-foreground">Income - Expenses this month</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className={`text-2xl font-bold ${netBalance < 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Across all linked accounts</p>
            </CardContent>
        </Card>
    </div>
  );
}
