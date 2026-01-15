
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import { EditGoalDialog } from '@/components/goals/edit-goal-dialog';
import { DeleteGoalDialog } from '@/components/goals/delete-goal-dialog';
import { AddFundsDialog } from '@/components/goals/add-funds-dialog';
import type { Account } from '@/app/accounts/page';
import { AddGoalWithAiDialog } from '@/app/goals/add-goal-with-ai-dialog';
import { AnimatedSection } from '@/components/animated-section';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export default function GoalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddGoalWithAiOpen, setIsAddGoalWithAiOpen] = useState(false);
  const [isEditGoalOpen, setIsEditGoalOpen] = useState(false);
  const [isDeleteGoalOpen, setIsDeleteGoalOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);


  const goalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'goals'));
  }, [user, firestore]);

  const { data: goals, isLoading: isLoadingGoals } = useCollection(goalsQuery);
  
  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);

  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<Account>(accountsQuery);


  const isLoading = isLoadingGoals || isLoadingAccounts;

  const handleEditClick = (goal: any) => {
    setSelectedGoal(goal);
    setIsEditGoalOpen(true);
  };

  const handleDeleteClick = (goal: any) => {
    setSelectedGoal(goal);
    setIsDeleteGoalOpen(true);
  }

  const handleAddFundsClick = (goal: any) => {
    setSelectedGoal(goal);
    setIsAddFundsOpen(true);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <AnimatedSection>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                <CardTitle>Savings Goals</CardTitle>
                <CardDescription>
                    Track your progress towards your financial goals.
                </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsAddGoalWithAiOpen(true)}>
                        <Sparkles className="mr-2"/>
                        Create with AI
                    </Button>
                    <Button size="sm" onClick={() => setIsAddGoalOpen(true)}>
                        <PlusCircle className="mr-2"/>
                        Create Goal
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="w-full overflow-x-auto">
                <div className="flex gap-6 pb-4 sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="min-w-[300px] sm:min-w-0">
                        <CardHeader className="pb-4">
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <div className="flex justify-between">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                            </div>
                            <Skeleton className="h-5 w-28" />
                        </CardContent>
                        </Card>
                    ))
                    : goals?.map((goal, index) => {
                        const percentage =
                        goal.targetAmount > 0
                            ? (goal.currentAmount / goal.targetAmount) * 100
                            : 0;
                        return (
                        <AnimatedSection delay={index * 0.1} key={goal.id}>
                            <Card className="min-w-[300px] sm:min-w-0 h-full">
                                <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="size-5 text-muted-foreground"/>
                                        {goal.name}
                                    </CardTitle>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditClick(goal)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDeleteClick(goal)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                <Progress value={percentage} />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Saved: {formatCurrency(goal.currentAmount)}</span>
                                    <span>Goal: {formatCurrency(goal.targetAmount)}</span>
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => handleAddFundsClick(goal)}>
                                    <Wallet className="mr-2"/>
                                    Add Funds
                                </Button>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                        );
                    })}
                    {!isLoading && (!goals || goals.length === 0) && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            <p>You haven't set any savings goals yet.</p>
                            <p>Click "Create Goal" to get started.</p>
                        </div>
                    )}
                </div>
            </CardContent>
            </Card>
        </AnimatedSection>
      </main>
      <AddGoalDialog isOpen={isAddGoalOpen} setIsOpen={setIsAddGoalOpen} />
      <AddGoalWithAiDialog isOpen={isAddGoalWithAiOpen} setIsOpen={setIsAddGoalWithAiOpen} />
      <EditGoalDialog isOpen={isEditGoalOpen} setIsOpen={setIsEditGoalOpen} goal={selectedGoal} />
      <DeleteGoalDialog isOpen={isDeleteGoalOpen} setIsOpen={setIsDeleteGoalOpen} goalId={selectedGoal?.id} />
      <AddFundsDialog isOpen={isAddFundsOpen} setIsOpen={setIsAddFundsOpen} goal={selectedGoal} accounts={accounts || []} />
    </div>
  );
}
