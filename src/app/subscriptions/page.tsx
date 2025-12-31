
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  detectSubscriptions,
  type DetectSubscriptionsOutput,
} from '@/ai/flows/detect-subscriptions-flow';
import type { Transaction } from '../transactions/page';
import { AlertTriangle, Bot, Calendar, IndianRupee, Info, Repeat, RefreshCw, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NegotiationScriptDialog } from '@/components/subscriptions/negotiation-script-dialog';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

type Subscription = DetectSubscriptionsOutput['subscriptions'][0];

export default function SubscriptionsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [subscriptions, setSubscriptions] =
    useState<Subscription[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);


  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [user, firestore]);
  const { data: transactions, isLoading: isLoadingTransactions } =
    useCollection<Transaction>(transactionsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const fetchSubscriptions = useCallback(async () => {
    if (!transactions) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await detectSubscriptions({ transactions });
      // Sort by last payment date descending
      const sortedSubs = result.subscriptions.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
      setSubscriptions(sortedSubs);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze subscriptions. The AI service may be temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [transactions]);


  useEffect(() => {
    if (!isLoadingTransactions && transactions) {
      if (transactions.length === 0) {
        setIsLoading(false);
        setSubscriptions([]);
        return;
      }
      fetchSubscriptions();
    }
  }, [transactions, isLoadingTransactions, fetchSubscriptions]);

  const handleNegotiateClick = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setIsNegotiationOpen(true);
  };

  const pageIsLoading = isUserLoading || isLoading;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="text-primary" /> Subscription Management
            </CardTitle>
            <CardDescription>
              FinSaathi has automatically detected the following recurring bills and subscriptions from your transaction history.
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <div className="flex gap-6 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3">
            {pageIsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="min-w-[300px] md:min-w-0">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))
            ) : error ? (
                <div className="col-span-full">
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle />
                                Analysis Error
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{error}</p>
                        </CardContent>
                         <CardFooter>
                            <Button variant="destructive" onClick={fetchSubscriptions}>
                                <RefreshCw className="mr-2" />
                                Retry Analysis
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              subscriptions.map((sub, index) => (
                <Card key={index} className="flex flex-col min-w-[300px] md:min-w-0">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Repeat />
                            {sub.name}
                        </div>
                         <Button variant="ghost" size="sm" onClick={() => handleNegotiateClick(sub)}>
                           <Handshake className="mr-2" />
                           Negotiate Bill
                        </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{formatCurrency(sub.lastAmount)}</span>
                        <span className="text-muted-foreground capitalize">/ {sub.frequency}</span>
                    </div>
                     <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="size-4" />
                        <span>Last payment on {sub.lastDate}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-primary/10 p-4 border-t border-primary/20">
                     <div className="flex items-start gap-3">
                        <Info className="size-5 mt-1 text-primary"/>
                        <p className="text-sm text-primary/90">{sub.suggestion}</p>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
                <div className="col-span-full text-center text-muted-foreground py-16">
                    <Repeat className="size-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No Subscriptions Found</h3>
                    <p>We couldn't detect any recurring payments from your transaction history.</p>
                </div>
            )}
            </div>
          </CardContent>
        </Card>
      </main>
      <NegotiationScriptDialog
        isOpen={isNegotiationOpen}
        setIsOpen={setIsNegotiationOpen}
        subscription={selectedSubscription}
      />
    </div>
  );
}
