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
import type { WithId } from '@/firebase/firestore/use-collection';
import { Progress } from '../ui/progress';

interface Goal {
  name: string;
  targetAmount: number;
  currentAmount: number;
}

interface GoalSummaryProps {
    goals: WithId<Goal>[];
    isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export function GoalSummary({ goals, isLoading }: GoalSummaryProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Savings Goals</CardTitle>
        <CardDescription>
          A summary of your top savings goals.
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
            {goals && goals.length > 0 ? (
                goals.slice(0, 4).map((goal) => {
                    const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                    return (
                        <div key={goal.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{goal.name}</span>
                                <span className="text-muted-foreground">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                            </div>
                            <Progress value={percentage} />
                        </div>
                    )
                })
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No savings goals created yet.</p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/goals">
            View All Goals <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
