'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import type { Goal } from '@/app/page';
import type { WithId } from '@/firebase/firestore/use-collection';

interface GoalProgressChartProps {
    data: WithId<Goal>[];
    isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(amount);
};

export function GoalProgressChart({ data, isLoading }: GoalProgressChartProps) {

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-muted-foreground">
        <p>No savings goals created yet.</p>
      </div>
    );
  }

  const chartData = data.map(goal => ({
    name: goal.name,
    Saved: goal.currentAmount,
    Remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
  }));

  return (
    <div className="w-full aspect-[4/3] sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }} barSize={30}>
          <XAxis 
            type="number" 
            stroke="hsl(var(--muted-foreground))" 
            tickFormatter={formatCurrency} 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={80} 
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fontSize: 12, width: 70, textAnchor: 'start' }}
            axisLine={false}
            tickLine={false}
            />
          <Tooltip 
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))'
            }}
            formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
            />
          <Legend wrapperStyle={{fontSize: "12px"}}/>
          <Bar dataKey="Saved" stackId="a" fill="hsl(var(--chart-1))" radius={[4, 0, 0, 4]} />
          <Bar dataKey="Remaining" stackId="a" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
