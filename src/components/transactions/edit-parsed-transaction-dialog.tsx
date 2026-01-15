'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { ParsedTransaction } from './import-transactions-dialog';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number(), // Can be positive or negative
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  category: z.string().min(1, 'Category is required'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface EditParsedTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transactionData: { transaction: ParsedTransaction; index: number } | null;
  onSave: (index: number, data: ParsedTransaction) => void;
}

export function EditParsedTransactionDialog({
  isOpen,
  setIsOpen,
  transactionData,
  onSave,
}: EditParsedTransactionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  useEffect(() => {
    if (transactionData) {
      reset({
        ...transactionData.transaction,
        amount: Math.abs(transactionData.transaction.amount),
      });
    }
  }, [transactionData, reset]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!transactionData) return;

    // Determine if amount should be negative based on original sign
    const finalAmount = transactionData.transaction.amount < 0 
        ? -Math.abs(data.amount) 
        : Math.abs(data.amount);

    const updatedTransaction: ParsedTransaction = {
        ...transactionData.transaction,
        ...data,
        amount: finalAmount,
    };
    onSave(transactionData.index, updatedTransaction);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Parsed Transaction</DialogTitle>
          <DialogDescription>
            Correct any details before importing this transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <div className="col-span-3">
              <Input id="description" {...register('description')} className={errors.description ? 'border-destructive' : ''} />
              {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Amount</Label>
            <div className="col-span-3">
              <Input id="amount" type="number" step="any" min="0" {...register('amount')} className={errors.amount ? 'border-destructive' : ''} />
              <p className="text-xs text-muted-foreground mt-1">
                Original transaction was an {transactionData?.transaction?.amount && transactionData.transaction.amount < 0 ? 'expense' : 'income'}.
              </p>
              {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <div className="col-span-3">
              <Input id="category" {...register('category')} className={errors.category ? 'border-destructive' : ''} />
              {errors.category && <p className="text-destructive text-sm mt-1">{errors.category.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <div className="col-span-3">
              <Input id="date" type="date" {...register('date')} className={errors.date ? 'border-destructive' : ''} />
              {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
