'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { MonthlyOverview } from '@/app/analytics/actions';

interface MonthlyOverviewChartProps {
  data: MonthlyOverview[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(amount);
};

const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-2))',
  },
  expense: {
    label: 'Expense',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function MonthlyOverviewChart({ data }: MonthlyOverviewChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
        <CardDescription>
          Your income and expenses over the last few months.
        </CardDescription>
      </CardHeader>
      <CardContent>
         {data.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full aspect-[4/3] sm:h-80">
              <ResponsiveContainer>
                <BarChart data={data}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tick={{
                        fontSize: 12,
                        fill: 'hsl(var(--muted-foreground))'
                      }}
                  />
                  <YAxis
                      tickFormatter={(value) => formatCurrency(Number(value))}
                      tick={{
                        fontSize: 12,
                        fill: 'hsl(var(--muted-foreground))'
                      }}
                  />
                  <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
         ) : (
            <div className="flex h-80 items-center justify-center text-muted-foreground">
                <p>Not enough transaction data to display monthly overview.</p>
            </div>
         )}
      </CardContent>
    </Card>
  );
}
