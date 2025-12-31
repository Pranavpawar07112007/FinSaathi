
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
import { ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import type { WithId } from '@/firebase/firestore/use-collection';

interface Investment {
  name: string;
  currentValue: number;
  type: string;
}

interface InvestmentSummaryProps {
    investments: WithId<Investment>[];
    isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export function InvestmentSummary({ investments, isLoading }: InvestmentSummaryProps) {
  
  const totalValue = useMemo(() => {
    return investments.reduce((acc, inv) => acc + inv.currentValue, 0);
  }, [investments]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Investment Summary</CardTitle>
        <CardDescription>
          Your total portfolio value.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <div className="space-y-4">
             <Skeleton className="h-8 w-40" />
            <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div className="space-y-2">
                 <p className="text-sm font-medium">Top Investments:</p>
                {investments && investments.length > 0 ? (
                    <ul className="space-y-1">
                        {investments.slice(0, 3).map(inv => (
                            <li key={inv.id} className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-2">
                                    <TrendingUp className="size-4 text-primary" />
                                    {inv.name}
                                </span>
                                <span className="font-medium">{formatCurrency(inv.currentValue)}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center pt-4">No investments added yet.</p>
                )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/investments">
            View All Investments <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
