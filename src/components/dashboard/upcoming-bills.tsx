
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WithId } from '@/firebase/firestore/use-collection';
import {
  detectSubscriptions,
  type DetectSubscriptionsOutput,
} from '@/ai/flows/detect-subscriptions-flow';
import { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Calendar } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface UpcomingBillsProps {
  transactions: WithId<Transaction>[];
  isLoading: boolean;
}

export function UpcomingBills({ transactions, isLoading }: UpcomingBillsProps) {
  const [bills, setBills] = useState<DetectSubscriptionsOutput['subscriptions'] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || transactions.length === 0) {
      setIsAiLoading(false);
      return;
    }

    const fetchBills = async () => {
      setIsAiLoading(true);
      setError(null);
      try {
        const result = await detectSubscriptions({ transactions });
        const upcoming = result.subscriptions
          .filter(sub => sub.nextDueDate)
          .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());
        setBills(upcoming);
      } catch (err) {
        console.error('Failed to fetch upcoming bills:', err);
        setError('Could not analyze upcoming bills.');
      } finally {
        setIsAiLoading(false);
      }
    };

    fetchBills();
  }, [transactions, isLoading]);

  const renderContent = () => {
    if (isAiLoading || isLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle />
          <p>{error}</p>
        </div>
      );
    }
    
    if (!bills || bills.length === 0) {
      return <p className="text-sm text-muted-foreground">No upcoming bills detected for the near future.</p>;
    }

    return (
      <div className="w-full overflow-x-auto">
        <div className="flex gap-6 pb-4 lg:grid lg:grid-cols-5">
          {bills.slice(0, 5).map(bill => {
            const dueDate = parseISO(bill.nextDueDate!);
            const daysUntilDue = differenceInDays(dueDate, new Date());
            const dueInText = daysUntilDue < 0 ? 'Overdue' : daysUntilDue === 0 ? 'Due today' : `in ${daysUntilDue} day(s)`;

            return (
              <div key={bill.name} className="flex flex-col gap-1 p-4 border rounded-lg min-w-[200px] lg:min-w-0">
                  <p className="font-semibold">{bill.name}</p>
                   <p className="text-lg font-bold">
                      {bill.lastAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>{bill.nextDueDate}</span>
                  </div>
                  <p className={`text-sm font-medium ${daysUntilDue < 3 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {dueInText}
                  </p>
              </div>
            )
          })}
        </div>
      </div>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-primary"/>
          Upcoming Bills
        </CardTitle>
        <CardDescription>
          A forecast of your recurring payments based on transaction history.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
