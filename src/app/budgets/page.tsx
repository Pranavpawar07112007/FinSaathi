
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
import { PlusCircle, Pencil, Trash2, PiggyBank, Utensils, Bus, Popcorn, Home, Shirt, HeartPulse } from 'lucide-react';
import { AddBudgetDialog } from '@/components/budgets/add-budget-dialog';
import { EditBudgetDialog } from '@/components/budgets/edit-budget-dialog';
import { DeleteBudgetDialog } from '@/components/budgets/delete-budget-dialog';
import { getMonth, getYear, parseISO } from 'date-fns';

const ICONS: { [key: string]: React.ElementType } = {
    Groceries: Utensils,
    Transport: Bus,
    Entertainment: Popcorn,
    Housing: Home,
    Shopping: Shirt,
    Health: HeartPulse,
    Default: PiggyBank,
};


const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export default function BudgetsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isDeleteBudgetOpen, setIsDeleteBudgetOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);


  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'transactions'));
  }, [user, firestore]);

  const budgetsQuery = useMemoFirebase(() => {
    if(!user) return null;
    return query(collection(firestore, 'users', user.uid, 'budgets'));
  }, [user, firestore]);

  const { data: transactions, isLoading: isLoadingTransactions } = useCollection(transactionsQuery);
  const { data: userBudgets, isLoading: isLoadingBudgets } = useCollection(budgetsQuery);

  const budgets = useMemo(() => {
    if (!userBudgets) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions?.filter(t => {
        try {
            const transactionDate = parseISO(t.date);
            return getYear(transactionDate) === currentYear && getMonth(transactionDate) === currentMonth;
        } catch (e) {
            console.warn(`Invalid date format for transaction: ${t.id}`);
            return false;
        }
    }) || [];

    return userBudgets.map((budget) => {
      const spent =
        currentMonthTransactions
          ?.filter((t) => t.category === budget.name && t.amount < 0)
          .reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;
      return { ...budget, spent, remaining: budget.limit - spent };
    });
  }, [transactions, userBudgets]);
  
  const availableBudgetCategories = useMemo(() => {
    if (!transactions || !userBudgets) return [];
    const existingBudgetNames = new Set(userBudgets.map(b => b.name));
    const transactionCategories = new Set(transactions.map(t => t.category));
    return Array.from(transactionCategories).filter(category => !existingBudgetNames.has(category));
  }, [transactions, userBudgets]);


  const isLoading = isLoadingTransactions || isLoadingBudgets;

  const handleEditClick = (budget: any) => {
    setSelectedBudget(budget);
    setIsEditBudgetOpen(true);
  };

  const handleDeleteClick = (budget: any) => {
    setSelectedBudget(budget);
    setIsDeleteBudgetOpen(true);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budgets</CardTitle>
              <CardDescription>
                Track your monthly spending against your budget goals.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddBudgetOpen(true)}>
                <PlusCircle className="mr-2"/>
                Create Budget
            </Button>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <div className="flex gap-6 pb-4 sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="min-w-[300px] sm:min-w-0">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
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
                : budgets.map((budget) => {
                    const percentage =
                      budget.limit > 0
                        ? (budget.spent / budget.limit) * 100
                        : 0;
                    const Icon = ICONS[budget.name] || ICONS.Default;
                    return (
                      <Card key={budget.id} className="min-w-[300px] sm:min-w-0">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon className="size-5 text-muted-foreground" />
                                <CardTitle className="text-lg">
                                {budget.name}
                                </CardTitle>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditClick(budget)}>
                                    <Pencil className="size-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDeleteClick(budget)}>
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Progress value={percentage} />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Spent: {formatCurrency(budget.spent)}</span>
                            <span>Limit: {formatCurrency(budget.limit)}</span>
                          </div>
                          <p className="text-sm font-medium">
                            Remaining: {formatCurrency(budget.remaining)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                {!isLoading && budgets.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        <p>You haven't created any budgets yet.</p>
                        <p>Click "Create Budget" to get started.</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      </main>
      <AddBudgetDialog isOpen={isAddBudgetOpen} setIsOpen={setIsAddBudgetOpen} availableCategories={availableBudgetCategories} />
      <EditBudgetDialog isOpen={isEditBudgetOpen} setIsOpen={setIsEditBudgetOpen} budget={selectedBudget} />
      <DeleteBudgetDialog isOpen={isDeleteBudgetOpen} setIsOpen={setIsDeleteBudgetOpen} budgetId={selectedBudget?.id} />
    </div>
  );
}
