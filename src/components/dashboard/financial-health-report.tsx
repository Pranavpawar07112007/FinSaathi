
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
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  generateFinancialOverview,
  type FinancialOverviewInput,
  type FinancialOverviewOutput,
} from '@/ai/flows/generate-financial-overview';
import type { WithId } from '@/firebase/firestore/use-collection';
import { Lightbulb, Info, TrendingUp, Target, ShieldCheck, AlertTriangle, HelpCircle, RefreshCw, PieChart, Briefcase, Banknote, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '../ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';


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

// Basic hash function to create a signature of the data
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};


export function FinancialHealthReport({
  transactions,
  budgets,
  goals,
}: FinancialHealthReportProps) {
  const [report, setReport] = useState<FinancialOverviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch all necessary data that feeds into the report
  const accountsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/accounts`)), [user, firestore]);
  const investmentsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/investments`)), [user, firestore]);
  const debtsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/debts`)), [user, firestore]);
  const achievementsQuery = useMemoFirebase(() => !user ? null : query(collection(firestore, `users/${user.uid}/achievements`)), [user, firestore]);
  const userProfileRef = useMemoFirebase(() => !user ? null : doc(firestore, `users/${user.uid}/profile`, user.uid), [user, firestore]);


  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery);
  const { data: investments, isLoading: loadingInvestments } = useCollection(investmentsQuery);
  const { data: debts, isLoading: loadingDebts } = useCollection(debtsQuery);
  const { data: userAchievements, isLoading: loadingAchievements } = useCollection(achievementsQuery);
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);


  const processedBudgets = useMemo(() => {
    return budgets.map(budget => {
        const spent = transactions
            .filter(t => t.category === budget.name && t.amount < 0)
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
        return {
            category: budget.name,
            limit: budget.limit,
            spent,
        }
    })
  }, [budgets, transactions]);


  const fetchReport = useCallback(async (retries = 1) => {
    setIsLoading(true);
    setError(null);
    let caughtError: any = null;

    if (!accounts || !investments || !userAchievements || !userProfile || !debts) return;

    try {
        const achievementsData = {
            totalPoints: userProfile.points,
            earnedAchievements: userAchievements.map(a => a.achievementId),
        };

        const input: FinancialOverviewInput = {
            transactions: JSON.stringify(transactions.slice(0, 50)),
            accounts: JSON.stringify(accounts),
            investments: JSON.stringify(investments),
            budgets: JSON.stringify(processedBudgets),
            goals: JSON.stringify(goals),
            debts: JSON.stringify(debts),
            achievements: JSON.stringify(achievementsData),
        };
      
        // Create a hash of the input data to check against cache
        const dataHash = simpleHash(JSON.stringify(input));

        const result = await generateFinancialOverview(input);
        setReport(result);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('financialReport', JSON.stringify(result));
            sessionStorage.setItem('financialReportHash', dataHash);
        }

    } catch (err: any) {
      caughtError = err;
      console.error(err);
      if (retries > 0 && err.message?.includes('503')) { // Retry on 503 errors from the AI service
        setTimeout(() => fetchReport(retries - 1), 5000); // wait 5 seconds before retry
        return;
      }
      setError('Failed to generate financial report. The service may be temporarily unavailable.');
    } finally {
      // Only set loading to false if we are not in a retry loop
      if (!(retries > 0 && caughtError?.message?.includes('503'))) {
        setIsLoading(false);
      }
    }
  }, [transactions, processedBudgets, goals, accounts, investments, userAchievements, userProfile, debts]);

  useEffect(() => {
    const isDataReady = !loadingAccounts && !loadingInvestments && !loadingAchievements && !loadingProfile && !loadingDebts;
    
    // Don't do anything until all dependent data has been loaded
    if (!isDataReady) return;

    // If there's no data, don't attempt to generate a report
    if (transactions.length === 0 && budgets.length === 0 && goals.length === 0) {
      setIsLoading(false);
      setReport(null);
      return;
    }
    
    if (typeof window !== 'undefined') {
        const cachedReportJSON = sessionStorage.getItem('financialReport');
        const cachedHash = sessionStorage.getItem('financialReportHash');
        
        const inputForHash: FinancialOverviewInput = {
            transactions: JSON.stringify(transactions.slice(0, 50)),
            accounts: JSON.stringify(accounts),
            investments: JSON.stringify(investments),
            budgets: JSON.stringify(processedBudgets),
            goals: JSON.stringify(goals),
            debts: JSON.stringify(debts),
            achievements: JSON.stringify({
                totalPoints: userProfile?.points,
                earnedAchievements: userAchievements?.map(a => a.achievementId),
            }),
        };
        const currentHash = simpleHash(JSON.stringify(inputForHash));
        
        if (cachedReportJSON && cachedHash === currentHash) {
          setReport(JSON.parse(cachedReportJSON));
          setIsLoading(false);
        } else {
          fetchReport();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
      // Use JSON stringify to create stable dependencies for the effect
      JSON.stringify(transactions), 
      JSON.stringify(processedBudgets), 
      JSON.stringify(goals), 
      JSON.stringify(accounts),
      JSON.stringify(investments),
      JSON.stringify(debts),
      JSON.stringify(userAchievements),
      JSON.stringify(userProfile),
      fetchReport, loadingAccounts, loadingInvestments, loadingAchievements, loadingProfile, loadingDebts
  ]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="text-primary"/>
            Financial Health Report
          </CardTitle>
          <CardDescription>A personalized analysis of your complete financial activity.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p>FinSaathi is analyzing your data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
     return (
        <Card className="border-destructive/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle />
                    Report Error
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
            <CardFooter>
                 <Button variant="destructive" onClick={() => fetchReport()}>
                    <RefreshCw className="mr-2" />
                    Retry Analysis
                 </Button>
            </CardFooter>
        </Card>
     )
  }

  if (!report) {
    return null;
  }

  const WellnessIcon = report.wellnessScore >= 80 ? ShieldCheck : report.wellnessScore >= 50 ? TrendingUp : AlertTriangle;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
                <Lightbulb className="text-primary"/>
                Financial Health Report
            </CardTitle>
        </div>
        <CardDescription>A personalized analysis of your complete financial activity.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8">
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
                                    The AI starts with a base score of 50 and adjusts it based on a weighted assessment of these key factors:
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

      </CardContent>
    </Card>
  );
}
