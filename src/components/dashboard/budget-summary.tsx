
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import type { WithId } from '@/firebase/firestore/use-collection';
import { Progress } from '../ui/progress';
import { getMonth, getYear, parseISO } from 'date-fns';

interface Budget {
  name: string;
  limit: number;
}

interface Transaction {
    id: string;
    date: string; // YYYY-MM-DD
    amount: number;
    category: string;
}

interface BudgetSummaryProps {
    budgets: WithId<Budget>[];
    transactions: WithId<Transaction>[];
    isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export function BudgetSummary({ budgets, transactions, isLoading }: BudgetSummaryProps) {

  const summarizedBudgets = useMemo(() => {
    if (!budgets) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions?.filter(t => {
        try {
            const transactionDate = parseISO(t.date);
            return getYear(transactionDate) === currentYear && getMonth(transactionDate) === currentMonth;
        } catch {
            return false;
        }
    }) || [];

    return budgets.map((budget) => {
      const spent =
        currentMonthTransactions
          ?.filter((t) => t.category === budget.name && t.amount < 0)
          .reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;
      const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      return { ...budget, spent, percentage };
    }).slice(0, 4);
  }, [budgets, transactions]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Budget Summary</CardTitle>
        <CardDescription>
          Your spending limits for the current month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {summarizedBudgets && summarizedBudgets.length > 0 ? (
                summarizedBudgets.map((budget) => (
                    <div key={budget.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{budget.name}</span>
                            <span className="text-muted-foreground">{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}</span>
                        </div>
                        <Progress value={budget.percentage} />
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No budgets created yet.</p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/budgets">
            View All Budgets <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
