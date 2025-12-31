
'use client';

import { useActionState } from 'react';
import { getDebtPlanAction } from '@/app/debts/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Debt } from '@/app/debts/page';
import { DebtPlanDisplay } from './debt-plan-display';
import { Skeleton } from '../ui/skeleton';

interface DebtPlanGeneratorProps {
  debts: WithId<Debt>[];
  isLoading: boolean;
}

const initialState = {
  plan: null,
  error: null,
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export function DebtPlanGenerator({ debts, isLoading }: DebtPlanGeneratorProps) {
  const [state, formAction, isSubmitting] = useActionState(
    getDebtPlanAction,
    initialState
  );

  const totalMinimumPayments = debts.reduce((acc, debt) => acc + (debt.minimumPayment || 0), 0);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  
  if (debts.length === 0) {
      return (
        <Card className="text-center py-10">
            <CardHeader>
                <CardTitle>Debt Pay-down Planner</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Add one or more debts to generate a personalized repayment plan.</p>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <Card className="md:col-span-1">
        <form action={formAction}>
          <CardHeader>
            <CardTitle>Debt Pay-down Planner</CardTitle>
            <CardDescription>
              Create a personalized strategy to become debt-free.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">
                Monthly Debt Budget
              </Label>
              <Input
                id="monthlyBudget"
                name="monthlyBudget"
                type="number"
                placeholder={`e.g., ${formatCurrency(totalMinimumPayments + 5000)}`}
                required
              />
              <p className="text-xs text-muted-foreground">Total of min. payments: {formatCurrency(totalMinimumPayments)}</p>
            </div>
            <div className="space-y-2">
              <Label>Repayment Strategy</Label>
              <RadioGroup
                name="strategy"
                defaultValue="avalanche"
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avalanche" id="avalanche" />
                  <Label htmlFor="avalanche">Avalanche</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="snowball" id="snowball" />
                  <Label htmlFor="snowball">Snowball</Label>
                </div>
              </RadioGroup>
            </div>
            <input
              type="hidden"
              name="debts"
              value={JSON.stringify(debts)}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Sparkles className="mr-2" />
              )}
              Generate Plan
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="md:col-span-2 flex flex-col">
        {isSubmitting ? (
          <div className="flex flex-col flex-1 items-center justify-center text-center text-muted-foreground">
            <Loader2 className="size-12 mb-4 animate-spin" />
            <p>FinSaathi is creating your debt-free plan...</p>
          </div>
        ) : state.error ? (
          <div className="flex flex-col flex-1 items-center justify-center text-center text-destructive bg-destructive/10 rounded-lg p-4">
            <AlertTriangle className="size-8 mb-2" />
            <p className="font-semibold">Oops! Something went wrong.</p>
            <p className="text-sm">{state.error}</p>
          </div>
        ) : state.plan ? (
           <DebtPlanDisplay plan={state.plan} />
        ) : (
          <div className="flex flex-col flex-1 items-center justify-center text-center text-muted-foreground">
            <Sparkles className="size-12 mb-4" />
            <p>Your personalized debt plan will appear here.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
