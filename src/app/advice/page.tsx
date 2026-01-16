
'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { getFinancialAdviceAction } from './actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/header';
import { Bot, Sparkles, AlertTriangle, Loader2, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, limit, orderBy, doc, addDoc } from 'firebase/firestore';
import type { Transaction, Budget, Goal } from '@/app/page';
import type { Account } from '@/app/accounts/page';
import type { Investment } from '@/app/investments/page';
import type { Debt } from '@/app/debts/page';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AnimatedSection } from '@/components/animated-section';
import { getMarketNews, type MarketNewsItem } from '@/services/finnhub';

const initialState = {
  message: null,
  advice: null,
  issues: null,
  adviceId: undefined,
};

type AdviceType = 'personalized' | 'general';
type FeedbackStatus = 'good' | 'bad' | 'none';

export default function AdvicePage() {
  const [state, formAction, isSubmitting] = useActionState(
    getFinancialAdviceAction,
    initialState
  );
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const formRef = useRef<HTMLFormElement>(null);
  const [adviceType, setAdviceType] = useState<AdviceType>('personalized');
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, FeedbackStatus>>({});
  const { toast } = useToast();
  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    async function fetchNews() {
      setIsLoadingNews(true);
      const { news, error } = await getMarketNews('general');
      if (error) {
          // The error is logged by the service, no need to log it here again.
      }
      setMarketNews(news.slice(0, 10)); // Get top 10 news items
      setIsLoadingNews(false);
    }
    fetchNews();
  }, []);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/transactions`), orderBy('date', 'desc'), limit(50));
  }, [user, firestore]);
  const {data: transactions, isLoading: isLoadingTransactions} = useCollection<Transaction>(transactionsQuery);

  const budgetsQuery = useMemoFirebase(() => {
    if(!user) return null;
    return query(collection(firestore, 'users', user.uid, 'budgets'));
  }, [user, firestore]);
  const { data: budgets, isLoading: isLoadingBudgets } = useCollection<Budget>(budgetsQuery);

  const goalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: isLoadingGoals } = useCollection<Goal>(goalsQuery);

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<Account>(accountsQuery);
  
  const investmentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'investments'));
  }, [user, firestore]);
  const { data: investments, isLoading: isLoadingInvestments } = useCollection<Investment>(investmentsQuery);

  const debtsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/debts`));
  }, [user, firestore]);
  const { data: debts, isLoading: isLoadingDebts } = useCollection<Debt>(debtsQuery);
  
  const feedbackQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'adviceFeedback'), orderBy('timestamp', 'desc'), limit(10));
  }, [user, firestore]);
  const { data: feedbackHistory, isLoading: isLoadingFeedback } = useCollection(feedbackQuery);


  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);


  const isDataLoading = isUserLoading || isLoadingTransactions || isLoadingBudgets || isLoadingGoals || isLoadingAccounts || isLoadingInvestments || isProfileLoading || isLoadingDebts || isLoadingFeedback || isLoadingNews;
  
  const handleSubmitForm = () => {
    if(formRef.current) {
      // Manually create FormData and call the action
      const formData = new FormData(formRef.current);
      formAction(formData);
    }
  }

  const handleFeedback = async (adviceId: string, rating: 'good' | 'bad') => {
    if (!user || !firestore || !state.advice) {
        toast({
            variant: 'destructive',
            title: 'Feedback Error',
            description: 'Could not save your feedback. You might not be logged in.',
        });
        return;
    }

    setFeedbackStatus(prev => ({ ...prev, [adviceId]: rating }));

    try {
        const feedbackRef = collection(firestore, 'users', user.uid, 'adviceFeedback');
        addDocumentNonBlocking(feedbackRef, {
            advice: state.advice,
            rating,
            timestamp: new Date().toISOString(),
        });

        toast({
            title: 'Feedback Submitted',
            description: 'Thank you! Your feedback will help improve future advice.',
        });
    } catch (error) {
        console.error('Error saving feedback:', error);
        toast({
            variant: 'destructive',
            title: 'Feedback Error',
            description: 'Could not save your feedback. Please try again.',
        });
        setFeedbackStatus(prev => ({ ...prev, [adviceId]: 'none' }));
    }
  };


  if (isDataLoading) {
     return (
       <div className="flex min-h-screen w-full flex-col">
         <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
           <Skeleton className="h-96 w-full" />
         </main>
       </div>
     );
  }

  const transactionSummary = transactions?.map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category,
      description: t.description,
  }));
  const budgetSummary = budgets?.map(b => {
      const spent = transactions?.filter(t => t.category === b.name && t.amount < 0)
                                 .reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;
      return { name: b.name, limit: b.limit, spent };
  });
  
  const achievementsSummary = {
      points: userProfile?.points || 0,
      count: userProfile?.achievements?.length || 0,
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <AnimatedSection>
            <Card>
                <form ref={formRef} action={formAction}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Bot /> Get Financial Advice
                    </CardTitle>
                    <CardDescription>
                    Choose your advice type, describe your goals, and select your risk tolerance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                    <Label>Advice Type</Label>
                    <RadioGroup
                        name="adviceType"
                        value={adviceType}
                        onValueChange={(value: AdviceType) => setAdviceType(value)}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="personalized" id="personalized" />
                        <Label htmlFor="personalized">Personalized</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="general" id="general" />
                        <Label htmlFor="general">General</Label>
                        </div>
                    </RadioGroup>
                    </div>
                    <div className="space-y-2">
                    <Label>Risk Tolerance</Label>
                    <RadioGroup
                        name="riskTolerance"
                        defaultValue="medium"
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low">Low</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high">High</Label>
                        </div>
                    </RadioGroup>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="financial-goals">Financial Goals</Label>
                    <Textarea
                        id="financial-goals"
                        name="financialGoals"
                        placeholder="e.g., 'I want to save for a down payment on a house in 5 years.' or 'How can I best invest ₹50,000 for long-term growth?'"
                        rows={5}
                        required
                    />
                    {state.issues && (
                        <p className="text-sm text-destructive">{state.issues.join(', ')}</p>
                    )}
                    </div>
                    <input type="hidden" name="transactionHistory" value={adviceType === 'personalized' ? JSON.stringify(transactionSummary || []) : ''} />
                    <input type="hidden" name="budgets" value={adviceType === 'personalized' ? JSON.stringify(budgetSummary || []) : ''} />
                    <input type="hidden" name="goals" value={adviceType === 'personalized' ? JSON.stringify(goals || []) : ''} />
                    <input type="hidden" name="accounts" value={adviceType === 'personalized' ? JSON.stringify(accounts || []) : ''} />
                    <input type="hidden" name="investments" value={adviceType === 'personalized' ? JSON.stringify(investments || []) : ''} />
                    <input type="hidden" name="debts" value={adviceType === 'personalized' ? JSON.stringify(debts || []) : ''} />
                    <input type="hidden" name="achievements" value={adviceType === 'personalized' ? JSON.stringify(achievementsSummary) : ''} />
                    <input type="hidden" name="feedbackHistory" value={adviceType === 'personalized' ? JSON.stringify(feedbackHistory || []) : ''} />
                    <input type="hidden" name="marketNews" value={adviceType === 'personalized' ? JSON.stringify(marketNews || []) : ''} />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting || (adviceType === 'personalized' && isDataLoading)}>
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                    {isSubmitting ? 'Generating...' : 'Generate Advice'}
                    </Button>
                </CardFooter>
                </form>
            </Card>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <Card className="flex flex-col h-full">
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="text-primary" />
                    Your Advice
                </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                {isSubmitting && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Loader2 className="size-12 mb-4 animate-spin" />
                        <p>FinSaathi is analyzing your data...</p>
                    </div>
                )}
                {!isSubmitting && state.message === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-destructive bg-destructive/10 rounded-lg p-4">
                    <AlertTriangle className="size-8 mb-2" />
                    <p className="font-semibold">Oops! Something went wrong.</p>
                    <p className="text-sm mb-4">{state.advice}</p>
                    <Button variant="destructive" onClick={handleSubmitForm}>
                            <RefreshCw className="mr-2" />
                            Try Again
                    </Button>
                    </div>
                )}
                {!isSubmitting && state.message === 'success' && state.advice && state.adviceId && (
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {state.advice}
                    </div>
                )}
                {!isSubmitting && !state.advice && !state.message && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Bot className="size-12 mb-4" />
                        <p>Your financial advice will appear here.</p>
                    </div>
                )}
                </CardContent>
                {state.adviceId && !isSubmitting && state.message === 'success' && (
                    <CardFooter className="border-t pt-4 flex-col items-start gap-3">
                        <p className="text-sm font-medium text-muted-foreground">Was this advice helpful?</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFeedback(state.adviceId!, 'good')}
                                disabled={feedbackStatus[state.adviceId!] === 'good'}
                                className={cn(feedbackStatus[state.adviceId!] === 'good' && 'bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300')}
                            >
                                <ThumbsUp className="mr-2"/> Good Advice
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFeedback(state.adviceId!, 'bad')}
                                disabled={feedbackStatus[state.adviceId!] === 'bad'}
                                className={cn(feedbackStatus[state.adviceId!] === 'bad' && 'bg-red-100 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300')}
                            >
                                <ThumbsDown className="mr-2"/> Bad Advice
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
}
