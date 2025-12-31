'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';

interface CategoryBreakdownChartProps {
  data: { category: string; total: number }[];
  type: 'income' | 'expense';
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

export function CategoryBreakdownChart({ data, type }: CategoryBreakdownChartProps) {
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.category] = {
      label: item.category,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const chartData = data.map((item) => ({
    name: item.category,
    value: item.total,
    fill: chartConfig[item.category].color,
  }));

  const noDataMessage = type === 'income' ? 'No income data available.' : 'No expense data available.';

  return (
    <>
        {data.length > 0 ? (
        <ChartContainer config={chartConfig} className="w-full aspect-square sm:aspect-auto sm:h-80">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex flex-col">
                      <span className="font-bold">{name}</span>
                      <span className="text-muted-foreground">{formatCurrency(value as number)}</span>
                    </div>
                  )}
                />
              }
            />
            <Pie data={chartData} dataKey="value" nameKey="name" />
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="flex-wrap justify-center"
            />
          </PieChart>
        </ChartContainer>
        ) : (
            <div className="flex h-80 items-center justify-center text-muted-foreground">
                <p>{noDataMessage}</p>
            </div>
        )}
    </>
  );
}
