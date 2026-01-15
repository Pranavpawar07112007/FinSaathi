
'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, orderBy } from 'firebase/firestore';
import { FinancialHealthReport } from '@/components/dashboard/financial-health-report';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import RecentTransactions from '@/components/dashboard/recent-transactions';
import { BudgetSummary } from '@/components/dashboard/budget-summary';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';
import { GoalSummary } from '@/components/dashboard/goal-summary';
import { InvestmentSummary } from '@/components/dashboard/investment-summary';
import type { Investment } from '@/app/investments/page';
import type { Account } from '@/app/accounts/page';
import { UpcomingBills } from '@/components/dashboard/upcoming-bills';
import { getMonth, getYear, parseISO } from 'date-fns';
import { AnimatedSection } from '@/components/animated-section';

export interface Transaction {
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
}

export interface Budget {
    name: string;
    limit: number;
    userId: string;
}

export interface Goal {
    name: string;
    targetAmount: number;
    currentAmount: number;
    userId: string;
}


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [user, firestore]);
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);
  
  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<Account>(accountsQuery);

  const budgetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'budgets'));
  }, [user, firestore]);
  const { data: budgets, isLoading: isLoadingBudgets } = useCollection<Budget>(budgetsQuery);

  const goalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: isLoadingGoals } = useCollection<Goal>(goalsQuery);

  const investmentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'investments'));
  }, [user, firestore]);
  const { data: investments, isLoading: isLoadingInvestments } = useCollection<Investment>(investmentsQuery);

  const isLoading = isUserLoading || isLoadingTransactions || isLoadingBudgets || isLoadingGoals || isLoadingInvestments || isLoadingAccounts;

  const currentMonthTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return getYear(transactionDate) === currentYear && getMonth(transactionDate) === currentMonth;
    });
  }, [transactions]);


  if (isLoading || !user) {
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Skeleton className="h-64 w-full" />
           <div className="grid gap-4 md:grid-cols-3">
             <Skeleton className="h-32 w-full" />
             <Skeleton className="h-32 w-full" />
             <Skeleton className="h-32 w-full" />
           </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="lg:col-span-3">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
    );
  }

  const expenseTransactions = currentMonthTransactions.filter(t => t.amount < 0) || [];

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <AnimatedSection>
            <FinancialHealthReport
                transactions={transactions || []}
                budgets={budgets || []}
                goals={goals || []}
            />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
            <SummaryCards transactions={transactions} accounts={accounts} isLoading={isLoading} />
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
          <AnimatedSection delay={0.2} className="lg:col-span-4">
            <RecentTransactions />
          </AnimatedSection>
          <AnimatedSection delay={0.3} className="lg:col-span-3">
             <ExpenseDistributionChart transactions={expenseTransactions} isLoading={isLoadingTransactions} />
          </AnimatedSection>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatedSection delay={0.4}>
              <BudgetSummary budgets={budgets || []} transactions={transactions || []} isLoading={isLoadingBudgets || isLoadingTransactions} />
            </AnimatedSection>
            <AnimatedSection delay={0.5}>
              <GoalSummary goals={goals || []} isLoading={isLoadingGoals} />
            </AnimatedSection>
            <AnimatedSection delay={0.6}>
              <InvestmentSummary investments={investments || []} isLoading={isLoadingInvestments} />
            </AnimatedSection>
        </div>
         <div className="grid grid-cols-1 gap-4">
            <AnimatedSection delay={0.7}>
              <UpcomingBills transactions={transactions || []} isLoading={isLoadingTransactions} />
            </AnimatedSection>
        </div>
      </main>
    </>
  );
}
