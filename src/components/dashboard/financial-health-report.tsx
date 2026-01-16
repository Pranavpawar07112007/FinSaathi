
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  generateFinancialOverview,
  type FinancialOverviewInput,
  type FinancialOverviewOutput,
} from '@/ai/flows/generate-financial-overview';
import type { WithId } from '@/firebase/firestore/use-collection';
import { Lightbulb, Info, TrendingUp, Target, ShieldCheck, AlertTriangle, HelpCircle, RefreshCw, PieChart, Briefcase, Banknote, Loader2, Sparkles } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '../ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { getMonth, getYear, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { getMarketNews, type MarketNewsItem } from '@/services/finnhub';

interface FinancialHealthReportProps {
  transactions: WithId<any>[];
  budgets: WithId<any>[];
  goals: WithId<any>[];
}


const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
}

export function FinancialHealthReport({
  transactions,
  budgets,
  goals,
}: FinancialHealthReportProps) {
  const [report, setReport] = useState<FinancialOverviewOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    async function fetchNews() {
      setIsLoadingNews(true);
      const { news, error } = await getMarketNews('general');
      if (error) {
        console.error("Failed to load market news for health report:", error);
      }
      setMarketNews(news.slice(0, 5)); // Get top 5 for context
      setIsLoadingNews(false);
    }
    fetchNews();
  }, []);

  const accountsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/accounts`)), [user, firestore]);
  const investmentsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/investments`)), [user, firestore]);
  const debtsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/debts`)), [user, firestore]);
  const userProfileRef = useMemoFirebase(() => !user ? null : doc(firestore, `users/${user.uid}/profile/${user.uid}`), [user, firestore]);

  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery);
  const { data: investments, isLoading: loadingInvestments } = useCollection(investmentsQuery);
  const { data: debts, isLoading: loadingDebts } = useCollection(debtsQuery);
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);

  const isDataLoading = loadingAccounts || loadingInvestments || loadingDebts || loadingProfile || isLoadingNews;

  const getCurrentMonthTransactions = useCallback(() => {
    if (!transactions) return [];
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    return transactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
    });
  }, [transactions]);


  const fetchReport = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setReport(null);

    if (isDataLoading || !accounts || !investments || !debts || !userProfile) {
        setError('Could not generate report because some financial data is still loading.');
        setIsGenerating(false);
        return;
    };

    const currentMonthTransactions = getCurrentMonthTransactions();
    
    const processedBudgets = budgets.map(budget => {
        const spent = currentMonthTransactions
            .filter(t => t.category === budget.name && t.amount < 0)
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
        return {
            category: budget.name,
            limit: budget.limit,
            spent,
        }
    });

    const achievementsSummary = {
        points: userProfile?.points || 0,
        count: userProfile?.achievements?.length || 0,
    };

    try {
        const input: FinancialOverviewInput = {
            transactions: JSON.stringify(currentMonthTransactions),
            accounts: JSON.stringify(accounts),
            investments: JSON.stringify(investments),
            budgets: JSON.stringify(processedBudgets),
            goals: JSON.stringify(goals),
            debts: JSON.stringify(debts),
            achievements: JSON.stringify(achievementsSummary),
            marketNews: JSON.stringify(marketNews),
        };

        const result = await generateFinancialOverview(input);
        setReport(result);
    } catch (err: any) {
      console.error(err);
      setError('Failed to generate financial report. The AI service may be temporarily unavailable.');
    } finally {
        setIsGenerating(false);
    }
  }, [isDataLoading, accounts, investments, debts, userProfile, getCurrentMonthTransactions, budgets, goals, marketNews]);

  const renderInitialState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 rounded-lg">
        <Sparkles className="size-12 mb-4 text-primary" />
        <h3 className="text-lg font-semibold">Generate Your Financial Health Report</h3>
        <p>Let FinSaathi analyze your current month's activity to provide personalized insights and a wellness score.</p>
    </div>
  );

  const renderGeneratingState = () => (
     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 rounded-lg">
        <Loader2 className="size-12 animate-spin mb-4" />
        <p>FinSaathi is analyzing your data...</p>
    </div>
  );

  const renderErrorState = () => (
     <div className="flex flex-col items-center justify-center h-full text-center text-destructive bg-destructive/10 p-4 rounded-lg">
        <AlertTriangle className="size-12 mb-4" />
        <h3 className="font-semibold">Analysis Failed</h3>
        <p className="text-sm mb-4">{error}</p>
        <Button variant="destructive" onClick={fetchReport}>
            <RefreshCw className="mr-2" />
            Try Again
        </Button>
    </div>
  );

  const renderReport = () => {
    if (!report) return null;
    const WellnessIcon = report.wellnessScore >= 80 ? ShieldCheck : report.wellnessScore >= 50 ? TrendingUp : AlertTriangle;
    return (
        <div className="grid gap-8">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <h3 className="font-semibold text-lg">Summary</h3>
                    <p className="text-muted-foreground">{report.headlineSummary}</p>
                </div>
                <Card className="flex flex-col items-center justify-center p-4 bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Financial Wellness Score</p>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button aria-label="Report details">
                                <HelpCircle className="size-4 text-muted-foreground cursor-pointer" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="top" align="start">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">How is this calculated?</h4>
                                    <p className="text-sm text-muted-foreground">
                                        The AI starts with a base score of 50 and adjusts it based on a weighted assessment of these key factors for the current month:
                                    </p>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        <li className="font-semibold">Cash Flow (30% weight): Your income vs. expenses.</li>
                                        <li className="font-semibold">Savings & Goals (25% weight): Your progress towards savings goals.</li>
                                        <li className="font-semibold text-destructive">Debt-to-Income (-35% weight): Your total debt load relative to income. High-interest debt has the largest negative impact.</li>
                                        <li className="font-semibold">Budget Adherence (10% weight): How well you stick to your spending limits.</li>
                                    </ul>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold ${getScoreColor(report.wellnessScore)}`}>{report.wellnessScore}</span>
                        <span className="text-xl text-muted-foreground">/ 100</span>
                    </div>
                    <WellnessIcon className={`size-6 mt-2 ${getScoreColor(report.wellnessScore)}`} />
                </Card>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><PieChart className="size-5 text-primary"/>Budget Analysis</h3>
                    <p className="text-sm text-muted-foreground">{report.budgetAnalysis}</p>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Target className="size-5 text-primary"/>Goal Analysis</h3>
                    <p className="text-sm text-muted-foreground">{report.goalAnalysis}</p>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Briefcase className="size-5 text-primary"/>Investment Analysis</h3>
                    <p className="text-sm text-muted-foreground">{report.investmentAnalysis}</p>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Banknote className="size-5 text-primary"/>Debt Analysis</h3>
                    <p className="text-sm text-muted-foreground">{report.debtAnalysis}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Key Insights</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {report.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <Info className="size-5 mt-1 text-primary"/>
                            <p className="text-sm text-muted-foreground">{insight}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Actionable Advice</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {report.actionableAdvice.map((advice, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <Target className="size-5 mt-1 text-primary"/>
                            <p className="text-sm">{advice}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
  }

  return (
    <Card className="w-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
                <Lightbulb className="text-primary"/>
                Financial Health Report
            </CardTitle>
            <CardDescription>Get a personalized AI analysis of your financial activity for the current month.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
           {isGenerating ? renderGeneratingState() : error ? renderErrorState() : report ? renderReport() : renderInitialState()}
        </CardContent>
         <CardFooter>
            <Button onClick={fetchReport} disabled={isDataLoading || isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2"/>}
                {isGenerating ? "Analyzing..." : (report ? "Regenerate Report" : "Generate Report")}
            </Button>
            {isDataLoading && <p className="ml-4 text-sm text-muted-foreground">Loading financial data...</p>}
        </CardFooter>
    </Card>
  );
}
