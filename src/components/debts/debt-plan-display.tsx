
'use client';

import type { GenerateDebtPlanOutput } from '@/ai/flows/generate-debt-plan-flow';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface DebtPlanDisplayProps {
  plan: GenerateDebtPlanOutput;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export function DebtPlanDisplay({ plan }: DebtPlanDisplayProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>{plan.planTitle}</CardTitle>
        <CardDescription>{plan.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="grid md:grid-cols-2 gap-4 mb-6 text-center">
            <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Estimated Payoff Time</p>
                <p className="text-xl font-bold">{plan.estimatedPayoffTime}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Interest Saved</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(plan.totalInterestSaved)}</p>
            </div>
        </div>
        
        <p className="font-semibold mb-2">Monthly Payment Schedule:</p>
        <ScrollArea className="flex-1 rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead className="w-[80px]">Month</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.monthlyPlan.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        {month.payments.map((p, i) => (
                            <div key={i} className="flex justify-between text-xs">
                                <span>{p.debtName}</span>
                                <span className="font-mono">{formatCurrency(p.paymentAmount)}</span>
                            </div>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(month.totalPaid)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.remainingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </>
  );
}
