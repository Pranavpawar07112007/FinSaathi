'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnalyticsData, type AnalyticsData } from './actions';
import { CategoryBreakdownChart } from '@/components/analytics/category-breakdown-chart';
import { MonthlyOverviewChart } from '@/components/analytics/monthly-overview-chart';
import { GoalProgressChart } from '@/components/analytics/goal-progress-chart';
import type { Transaction, Goal } from '../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterX } from 'lucide-react';
import { getMonth, getYear, parseISO } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [user, firestore]);
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const goalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: isLoadingGoals } = useCollection<Goal>(goalsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const availableYears = useMemo(() => {
    if (!transactions) return [];
    const years = new Set<string>();
    transactions.forEach(t => {
      years.add(getYear(parseISO(t.date)).toString());
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);
  
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      const yearMatch = filterYear === 'all' || getYear(transactionDate).toString() === filterYear;
      const monthMatch = filterMonth === 'all' || getMonth(transactionDate).toString() === filterMonth;
      return yearMatch && monthMatch;
    });
  }, [transactions, filterYear, filterMonth]);


  useEffect(() => {
    const fetchAnalytics = async () => {
      if (filteredTransactions) {
        setIsLoading(true);
        const data = await getAnalyticsData(filteredTransactions);
        setAnalyticsData(data);
        setIsLoading(false);
      }
    };

    if (!isLoadingTransactions) {
      fetchAnalytics();
    }
  }, [filteredTransactions, isLoadingTransactions]);

  const clearFilters = () => {
    setFilterYear('all');
    setFilterMonth('all');
  };

  const pageIsLoading = isUserLoading || (isLoading && isLoadingTransactions);

  if (pageIsLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="grid gap-8">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Financial Analytics</CardTitle>
                <CardDescription>
                    Dive deep into your financial data. Use the filters below to analyze specific periods.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {MONTHS.map((month, index) => <SelectItem key={month} value={index.toString()}>{month}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={clearFilters}>
                        <FilterX className="mr-2"/>
                        Clear Filters
                    </Button>
                </div>

                <div className="grid gap-8">
                    <Card>
                        <Tabs defaultValue="expense">
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div>
                                        <CardTitle>Category Breakdown</CardTitle>
                                        <CardDescription>
                                        See where your money is coming from and where it's going for the selected period.
                                        </CardDescription>
                                    </div>
                                    <TabsList className="grid w-full md:w-auto grid-cols-2">
                                        <TabsTrigger value="expense">Expenses</TabsTrigger>
                                        <TabsTrigger value="income">Income</TabsTrigger>
                                    </TabsList>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <TabsContent value="expense">
                                    <CategoryBreakdownChart data={analyticsData?.expenseByCategory || []} type="expense" />
                                </TabsContent>
                                <TabsContent value="income">
                                    <CategoryBreakdownChart data={analyticsData?.incomeByCategory || []} type="income" />
                                </TabsContent>
                            </CardContent>
                        </Tabs>
                    </Card>

                    <MonthlyOverviewChart data={analyticsData?.monthlyOverview || []} />
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Savings Goals Progress</CardTitle>
                            <CardDescription>Track how close you are to reaching your financial goals. (Not affected by filters)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GoalProgressChart data={goals || []} isLoading={isLoadingGoals} />
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
