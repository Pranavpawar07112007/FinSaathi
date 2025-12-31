
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Debt } from '@/app/debts/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


const debtSchema = z.object({
  name: z.string().min(1, 'Debt name is required'),
  type: z.enum(['Credit Card', 'Personal Loan', 'Auto Loan', 'Home Loan', 'Student Loan', 'Other']),
  currentBalance: z.coerce.number().min(0, 'Current balance cannot be negative.'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative.'),
  minimumPayment: z.coerce.number().min(0, 'Minimum payment cannot be negative.'),
});

type DebtFormData = z.infer<typeof debtSchema>;

interface EditDebtDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  debt: WithId<Debt> | null;
}

export function EditDebtDialog({ isOpen, setIsOpen, debt }: EditDebtDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
  });

  useEffect(() => {
    if (debt) {
        reset({ ...debt });
    }
  }, [debt, reset]);

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const onSubmit = async (data: DebtFormData) => {
    if (!user || !firestore || !debt) {
      setFormError('Could not update debt. Please try again.');
      return;
    }
    setFormError(null);

    try {
      const debtData = {
        ...data,
      };

      const debtRef = doc(firestore, 'users', user.uid, 'debts', debt.id);
      updateDocumentNonBlocking(debtRef, debtData);

      setIsOpen(false);
    } catch (error) {
      setFormError('Failed to update debt. Please try again.');
      console.error(error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setFormError(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Debt</DialogTitle>
          <DialogDescription>
            Update the details of your debt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <div className="col-span-3">
              <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''} />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <div className="col-span-3">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select debt type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                      <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                      <SelectItem value="Home Loan">Home Loan</SelectItem>
                      <SelectItem value="Student Loan">Student Loan</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-destructive text-sm mt-1">{errors.type.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentBalance" className="text-right">Current Balance</Label>
              <div className="col-span-3">
                <Input id="currentBalance" type="number" step="any" min="0" {...register('currentBalance')} className={errors.currentBalance ? 'border-destructive' : ''} />
                {errors.currentBalance && <p className="text-destructive text-sm mt-1">{errors.currentBalance.message}</p>}
              </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interestRate" className="text-right">Interest Rate %</Label>
              <div className="col-span-3">
                <Input id="interestRate" type="number" step="any" min="0" {...register('interestRate')} className={errors.interestRate ? 'border-destructive' : ''} />
                {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate.message}</p>}
              </div>
          </div>

           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minimumPayment" className="text-right">Min. Payment</Label>
              <div className="col-span-3">
                <Input id="minimumPayment" type="number" step="any" min="0" {...register('minimumPayment')} className={errors.minimumPayment ? 'border-destructive' : ''} />
                {errors.minimumPayment && <p className="text-destructive text-sm mt-1">{errors.minimumPayment.message}</p>}
              </div>
          </div>

          {formError && <p className="text-destructive text-sm text-center col-span-4">{formError}</p>}

          <DialogFooter className="pt-4">
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
