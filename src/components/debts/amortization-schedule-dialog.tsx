'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemo } from 'react';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Debt } from '@/app/debts/page';
import {
  calculateAmortizationSchedule,
  type AmortizationPayment,
} from '@/lib/amortization';

interface AmortizationScheduleDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  debt: WithId<Debt> | null;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export function AmortizationScheduleDialog({
  isOpen,
  setIsOpen,
  debt,
}: AmortizationScheduleDialogProps) {
  const schedule = useMemo(() => {
    if (!debt || debt.minimumPayment <= 0) return [];
    return calculateAmortizationSchedule(
      debt.currentBalance,
      debt.interestRate,
      debt.minimumPayment
    );
  }, [debt]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Amortization Schedule for "{debt?.name}"</DialogTitle>
          <DialogDescription>
            This schedule shows how each payment is split between principal and
            interest over the life of the loan, assuming only minimum payments are made.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead className="w-[80px]">Month</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Total Payment</TableHead>
                <TableHead className="text-right">Remaining Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.length > 0 ? (
                schedule.map((payment) => (
                  <TableRow key={payment.month}>
                    <TableCell className="font-medium">{payment.month}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(payment.principal)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(payment.interest)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.totalPayment)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.remainingBalance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Could not generate a schedule. The minimum payment may be too
                    low to cover the interest.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
