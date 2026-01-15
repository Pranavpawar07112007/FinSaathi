
'use client';

import { useState } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Banknote,
  CreditCard,
  Car,
  Home,
  GraduationCap,
  Percent,
  CalendarClock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDebtDialog } from '@/components/debts/add-debt-dialog';
import { EditDebtDialog } from '@/components/debts/edit-debt-dialog';
import { DeleteDebtDialog } from '@/components/debts/delete-debt-dialog';
import type { WithId } from '@/firebase/firestore/use-collection';
import { DebtPlanGenerator } from '@/components/debts/debt-plan-generator';
import { AmortizationScheduleDialog } from '@/components/debts/amortization-schedule-dialog';
import { AnimatedSection } from '@/components/animated-section';


export interface Debt {
  name: string;
  type:
    | 'Credit Card'
    | 'Personal Loan'
    | 'Auto Loan'
    | 'Home Loan'
    | 'Student Loan'
    | 'Other';
  totalAmount?: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  userId: string;
}

const ICONS: { [key: string]: React.ElementType } = {
  'Credit Card': CreditCard,
  'Personal Loan': Banknote,
  'Auto Loan': Car,
  'Home Loan': Home,
  'Student Loan': GraduationCap,
  Other: Banknote,
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

const loanTypes = ['Personal Loan', 'Auto Loan', 'Home Loan', 'Student Loan'];

export default function DebtsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<WithId<Debt> | null>(null);

  const debtsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'debts'));
  }, [user, firestore]);

  const { data: debts, isLoading } = useCollection<Debt>(debtsQuery);

  const handleEditClick = (debt: WithId<Debt>) => {
    setSelectedDebt(debt);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (debt: WithId<Debt>) => {
    setSelectedDebt(debt);
    setIsDeleteOpen(true);
  };
  
  const handleScheduleClick = (debt: WithId<Debt>) => {
    setSelectedDebt(debt);
    setIsScheduleOpen(true);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-8 p-4 md:gap-8 md:p-8">
        <AnimatedSection>
            <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div>
                <CardTitle>Debt Management</CardTitle>
                <CardDescription>
                    Keep track of your loans and credit card balances.
                </CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <PlusCircle className="mr-2" />
                Add Debt
                </Button>
            </CardHeader>
            <CardContent className="w-full overflow-x-auto">
                <div className="flex gap-6 pb-4 sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="min-w-[300px] sm:min-w-0">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-8 w-1/2" />
                            <div className="flex justify-between">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                            </div>
                        </CardContent>
                        </Card>
                    ))
                    : debts?.map((debt, index) => {
                        const Icon = ICONS[debt.type] || ICONS.Other;
                        const isLoan = loanTypes.includes(debt.type);
                        return (
                        <AnimatedSection delay={index * 0.1} key={debt.id}>
                            <Card className="flex flex-col min-w-[300px] sm:min-w-0 h-full">
                                <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                    <Icon className="size-6 text-muted-foreground" />
                                    <div>
                                        <CardTitle className="text-lg">
                                        {debt.name}
                                        </CardTitle>
                                        <CardDescription>{debt.type}</CardDescription>
                                    </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => handleEditClick(debt)}
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => handleDeleteClick(debt)}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                    </div>
                                </div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                    Current Balance
                                    </p>
                                    <p className="text-2xl font-bold">
                                    {formatCurrency(debt.currentBalance)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                    <Percent className="size-4" />
                                    <span>{debt.interestRate}% APR</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                    <span>Min. Payment: {formatCurrency(debt.minimumPayment)}</span>
                                    </div>
                                </div>
                                {isLoan && (
                                    <Button variant="outline" className="w-full" onClick={() => handleScheduleClick(debt)}>
                                        <CalendarClock className="mr-2"/>
                                        View Schedule
                                    </Button>
                                )}
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                        );
                    })}
                {!isLoading && (!debts || debts.length === 0) && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                    <p>You haven't added any debts yet.</p>
                    <p>Click "Add Debt" to get started.</p>
                    </div>
                )}
                </div>
            </CardContent>
            </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
            <DebtPlanGenerator debts={debts || []} isLoading={isLoading} />
        </AnimatedSection>

      </main>
      <AddDebtDialog isOpen={isAddOpen} setIsOpen={setIsAddOpen} />
      <EditDebtDialog isOpen={isEditOpen} setIsOpen={setIsEditOpen} debt={selectedDebt} />
      <DeleteDebtDialog isOpen={isDeleteOpen} setIsOpen={setIsDeleteOpen} debtId={selectedDebt?.id} />
      <AmortizationScheduleDialog isOpen={isScheduleOpen} setIsOpen={setIsScheduleOpen} debt={selectedDebt} />
    </div>
  );
}
