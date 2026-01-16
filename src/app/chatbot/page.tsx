
'use client';

import { useActionState, useEffect, useState, useRef, useMemo } from 'react';
import { getChatbotResponseAction } from './actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, User, Send, Loader2, AlertTriangle, Sparkles, Mic, MicOff } from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, limit, orderBy, doc } from 'firebase/firestore';
import type { Transaction, Budget, Goal } from '@/app/page';
import type { Account } from '@/app/accounts/page';
import type { Investment } from '@/app/investments/page';
import type { Debt } from '@/app/debts/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AnimatedSection } from '@/components/animated-section';
import { getMarketNews, type MarketNewsItem } from '@/services/finnhub';


const initialState = {
  response: null,
  error: null,
};

interface Message {
  role: 'user' | 'model';
  content: string;
}

// SpeechRecognition type declaration for window
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatbotPage() {
  const [state, formAction, isSubmitting] = useActionState(
    getChatbotResponseAction,
    initialState
  );

  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hello! I'm FinSaathi, your personal financial assistant. How can I help you today?",
    },
  ]);
  
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // --- Speech Recognition Logic ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        if (inputRef.current) {
          inputRef.current.value = transcript;
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          variant: 'destructive',
          title: 'Voice Error',
          description: `An error occurred: ${event.error}. Please try again.`,
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

    }
  }, [toast]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser',
        description: 'Your browser does not support voice recognition.',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };


  // --- Data Fetching ---
  useEffect(() => {
    async function fetchNews() {
      setIsLoadingNews(true);
      const { news, error } = await getMarketNews('general');
      if (error) {
          // The error is logged by the service, no need to log it here again.
      }
      setMarketNews(news.slice(0, 5)); // Get top 5 news items for context
      setIsLoadingNews(false);
    }
    fetchNews();
  }, []);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/transactions`),
      orderBy('date', 'desc'),
      limit(50)
    );
  }, [user, firestore]);
  const { data: transactions, isLoading: isLoadingTransactions } =
    useCollection<Transaction>(transactionsQuery);

  const budgetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'budgets'));
  }, [user, firestore]);
  const { data: budgets, isLoading: isLoadingBudgets } =
    useCollection<Budget>(budgetsQuery);

  const goalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);
  const { data: goals, isLoading: isLoadingGoals } = useCollection<Goal>(
    goalsQuery
  );

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);
  const { data: accounts, isLoading: isLoadingAccounts } =
    useCollection<Account>(accountsQuery);

  const investmentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'investments'));
  }, [user, firestore]);
  const { data: investments, isLoading: isLoadingInvestments } =
    useCollection<Investment>(investmentsQuery);

  const debtsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/debts`));
  }, [user, firestore]);
  const { data: debts, isLoading: isLoadingDebts } = useCollection<Debt>(debtsQuery);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc(userProfileRef);

  const isDataLoading =
    isUserLoading ||
    isLoadingTransactions ||
    isLoadingBudgets ||
    isLoadingGoals ||
    isLoadingAccounts ||
    isLoadingInvestments ||
    isLoadingDebts ||
    isProfileLoading ||
    isLoadingNews;

  const financialContext = useMemo(() => {
     if (isDataLoading) return "Data is still loading.";
     const budgetSummary = budgets?.map(b => {
        const spent = transactions?.filter(t => t.category === b.name && t.amount < 0)
                                   .reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;
        return { name: b.name, limit: b.limit, spent };
    });
     return JSON.stringify({
        userProfile,
        accounts,
        transactions: transactions?.slice(0, 50), // Limit context size
        budgets: budgetSummary,
        goals,
        investments,
        debts,
        marketNews,
     }, null, 2);
  }, [isDataLoading, userProfile, accounts, transactions, budgets, goals, investments, debts, marketNews]);
  
  // --- Effects ---
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (state.response) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: state.response! },
      ]);
    } else if (state.error) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: `Sorry, something went wrong: ${state.error}` },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.response, state.error]);
  
   useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  if (isDataLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Skeleton className="h-[80vh] w-full" />
        </main>
      </div>
    );
  }

  const history = messages
      .filter((m) => m.role !== 'model' || !m.content.startsWith('Hello!'))
      .reduce((acc, msg) => {
        if (msg.role === 'user') {
          acc.push({ user: msg.content, model: '' });
        } else if (acc.length > 0) {
          acc[acc.length - 1].model = msg.content;
        }
        return acc;
      }, [] as { user: string; model: string }[]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <AnimatedSection>
        <Card className="flex flex-col h-[85vh]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary" /> Financial Chatbot
            </CardTitle>
            <CardDescription>
              Ask FinSaathi anything about your finances. Click the mic to use your voice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="space-y-6 pr-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3',
                      msg.role === 'user' && 'justify-end'
                    )}
                  >
                    {msg.role === 'model' && (
                      <Avatar className="size-8 border">
                        <AvatarFallback><Bot /></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-md rounded-lg px-4 py-3 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                        msg.content.includes('Sorry, something went wrong') && 'bg-destructive/10 text-destructive'
                      )}
                    >
                      {msg.content.includes('Sorry, something went wrong') ? (
                        <div className="flex items-start gap-2">
                           <AlertTriangle className="size-4 mt-0.5"/>
                           <p>{msg.content}</p>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                     {msg.role === 'user' && (
                      <Avatar className="size-8 border">
                         <AvatarImage src={user?.photoURL ?? undefined} />
                         <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isSubmitting && (
                    <div className="flex items-start gap-3">
                        <Avatar className="size-8 border">
                            <AvatarFallback><Bot /></AvatarFallback>
                        </Avatar>
                        <div className="max-w-md rounded-lg px-4 py-3 text-sm bg-muted flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin"/>
                            <span>FinSaathi is thinking...</span>
                        </div>
                    </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="pt-6 border-t">
            <form
              ref={formRef}
              action={(formData: FormData) => {
                  const message = formData.get('message') as string;
                  if (!message.trim()) return;
                  
                  setMessages((prev) => [...prev, { role: 'user', content: message }]);
                  formAction(formData);
                  
                  if(inputRef.current) {
                    inputRef.current.value = '';
                  }
              }}
              className="flex w-full items-center gap-2"
            >
              <Input
                ref={inputRef}
                name="message"
                placeholder="Ask about your spending, or click the mic..."
                autoComplete="off"
                disabled={isSubmitting}
              />
              <input type="hidden" name="history" value={JSON.stringify(history)} />
              <input type="hidden" name="financialContext" value={financialContext} />
              <Button type="button" size="icon" variant={isListening ? 'destructive' : 'outline'} onClick={handleToggleListening} disabled={isSubmitting}>
                {isListening ? <MicOff /> : <Mic />}
              </Button>
              <Button type="submit" size="icon" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </form>
          </CardFooter>
        </Card>
        </AnimatedSection>
      </main>
    </div>
  );
}
