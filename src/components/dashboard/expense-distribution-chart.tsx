'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { WithId } from '@/firebase/firestore/use-collection';

interface Transaction {
    amount: number;
    category: string;
}

interface ExpenseDistributionChartProps {
    transactions: WithId<Transaction>[];
    isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ExpenseDistributionChart({ transactions, isLoading }: ExpenseDistributionChartProps) {
  
  const { chartData, chartConfig } = useMemo(() => {
    const expenseData = transactions.reduce((acc, t) => {
      const expense = Math.abs(t.amount);
      acc[t.category] = (acc[t.category] || 0) + expense;
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(expenseData)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const config = sortedData.reduce((acc, item, index) => {
      acc[item.category] = {
        label: item.category,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);

    const data = sortedData.map((item) => ({
      name: item.category,
      value: item.total,
      fill: config[item.category].color,
    }));

    return { chartData: data, chartConfig: config };
  }, [transactions]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Expense Distribution</CardTitle>
        <CardDescription>
          Top 5 spending categories this month.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        {isLoading ? (
          <Skeleton className="size-64 rounded-full" />
        ) : chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="flex-row flex-wrap justify-center [&>*]:basis-1/4 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground text-center">
            No expenses recorded yet.
          </div>
        )}
      </CardContent>
       <CardFooter className="flex-col items-center gap-2 text-sm pt-4">
        <Button asChild variant="outline" className="w-full">
          <Link href="/analytics">
            View Full Analytics <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
