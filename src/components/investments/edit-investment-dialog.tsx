
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
import type { Investment } from '@/app/investments/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const investmentSchema = z.object({
  name: z.string().min(1, 'Investment name is required'),
  type: z.enum(['Stock', 'Mutual Fund', 'Crypto', 'Fixed Deposit', 'Recurring Deposit', 'Bonds', 'ETF', 'Gold', 'Other']),
  currentValue: z.coerce.number().min(0, 'Current value cannot be negative.'),
  targetValue: z.coerce.number().positive('Target value must be positive.').optional().or(z.literal('')),
  quantity: z.coerce.number().optional().or(z.literal('')),
  purchasePrice: z.coerce.number().optional().or(z.literal('')),
  principalAmount: z.coerce.number().optional().or(z.literal('')),
  installmentAmount: z.coerce.number().optional().or(z.literal('')),
  interestRate: z.coerce.number().optional().or(z.literal('')),
  maturityDate: z.string().regex(DATE_REGEX, "Date must be in YYYY-MM-DD format.").optional().or(z.literal('')),
  startDate: z.string().regex(DATE_REGEX, "Date must be in YYYY-MM-DD format.").optional().or(z.literal('')),
}).refine(data => {
    if (data.type === 'Fixed Deposit' || data.type === 'Recurring Deposit') {
        return !!data.interestRate && !!data.maturityDate && !!data.startDate;
    }
    return true;
}, {
    message: "Interest Rate, Start Date, and Maturity Date are required for deposits.",
    path: ["interestRate"], 
}).refine(data => {
    if (data.type === 'Fixed Deposit') {
        return !!data.principalAmount;
    }
    return true;
}, {
    message: "Principal Amount is required for Fixed Deposits.",
    path: ["principalAmount"],
}).refine(data => {
    if (data.type === 'Recurring Deposit') {
        return !!data.installmentAmount;
    }
    return true;
}, {
    message: "Installment Amount is required for Recurring Deposits.",
    path: ["installmentAmount"],
});


type InvestmentFormData = z.infer<typeof investmentSchema>;

interface EditInvestmentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  investment: WithId<Investment> | null;
}

export function EditInvestmentDialog({ isOpen, setIsOpen, investment }: EditInvestmentDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
  });

  const investmentType = watch('type');

  useEffect(() => {
    if (investment) {
        reset({
            ...investment,
            maturityDate: investment.maturityDate ?? '',
            startDate: investment.startDate ?? '',
            currentValue: investment.currentValue ?? 0,
            targetValue: investment.targetValue ?? undefined,
            quantity: investment.quantity ?? undefined,
            purchasePrice: investment.purchasePrice ?? undefined,
            principalAmount: investment.principalAmount ?? undefined,
            installmentAmount: investment.installmentAmount ?? undefined,
            interestRate: investment.interestRate ?? undefined,
        });
    }
  }, [investment, reset]);

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const onSubmit = async (data: InvestmentFormData) => {
    if (!user || !firestore || !investment) {
      setFormError('Could not update investment. Please try again.');
      return;
    }
    setFormError(null);

    try {
       const investmentData = {
        ...data,
        userId: user.uid,
        quantity: data.quantity || null,
        purchasePrice: data.purchasePrice || null,
        principalAmount: data.principalAmount || null,
        installmentAmount: data.installmentAmount || null,
        interestRate: data.interestRate || null,
        maturityDate: data.maturityDate || null,
        startDate: data.startDate || null,
        targetValue: data.targetValue || null,
      };

      const investmentRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
      updateDocumentNonBlocking(investmentRef, investmentData);

      setIsOpen(false);
    } catch (error) {
      setFormError('Failed to update investment. Please try again.');
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

  const isDeposit = investmentType === 'Fixed Deposit' || investmentType === 'Recurring Deposit';
  const isStockLike = ['Stock', 'Crypto', 'ETF'].includes(investmentType || '');

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Investment</DialogTitle>
          <DialogDescription>
            Update the details of your investment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <div className="col-span-3">
              <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''}/>
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
                      <SelectValue placeholder="Select investment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stock">Stock</SelectItem>
                      <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                      <SelectItem value="Fixed Deposit">Fixed Deposit (FD)</SelectItem>
                      <SelectItem value="Recurring Deposit">Recurring Deposit (RD)</SelectItem>
                      <SelectItem value="Bonds">Bonds</SelectItem>
                      <SelectItem value="ETF">ETF</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-destructive text-sm mt-1">{errors.type.message}</p>}
            </div>
          </div>

           
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentValue" className="text-right">Current Value</Label>
                <div className="col-span-3">
                    <Input id="currentValue" type="number" step="any" min="0" {...register('currentValue')} className={errors.currentValue ? 'border-destructive' : ''} />
                    {errors.currentValue && <p className="text-destructive text-sm mt-1">{errors.currentValue.message}</p>}
                </div>
            </div>

            {!isDeposit && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="targetValue" className="text-right">Target Value</Label>
                    <div className="col-span-3">
                    <Input id="targetValue" type="number" step="any" min="0" {...register('targetValue')} placeholder="Optional goal value" />
                    {errors.targetValue && <p className="text-destructive text-sm mt-1">{errors.targetValue.message}</p>}
                    </div>
                </div>
            )}
          

          {isStockLike && (
            <>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">Quantity</Label>
                    <div className="col-span-3">
                        <Input id="quantity" type="number" step="any" min="0" {...register('quantity')} />
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purchasePrice" className="text-right">Purchase Price</Label>
                    <div className="col-span-3">
                        <Input id="purchasePrice" type="number" step="any" min="0" {...register('purchasePrice')} />
                    </div>
                </div>
            </>
          )}

          {isDeposit && (
             <>
                {investmentType === 'Fixed Deposit' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="principalAmount" className="text-right">Principal</Label>
                        <div className="col-span-3">
                            <Input id="principalAmount" type="number" step="any" min="0" {...register('principalAmount')} className={errors.principalAmount ? 'border-destructive' : ''}/>
                             {errors.principalAmount && <p className="text-destructive text-sm mt-1">{errors.principalAmount.message}</p>}
                        </div>
                    </div>
                )}
                {investmentType === 'Recurring Deposit' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="installmentAmount" className="text-right">Installment</Label>
                        <div className="col-span-3">
                            <Input id="installmentAmount" type="number" step="any" min="0" {...register('installmentAmount')} className={errors.installmentAmount ? 'border-destructive' : ''}/>
                            {errors.installmentAmount && <p className="text-destructive text-sm mt-1">{errors.installmentAmount.message}</p>}
                        </div>
                    </div>
                )}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="interestRate" className="text-right">Interest Rate</Label>
                    <div className="col-span-3">
                        <Input id="interestRate" type="number" step="any" min="0" {...register('interestRate')} className={errors.interestRate ? 'border-destructive' : ''}/>
                         {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate.message}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startDate" className="text-right">Start Date</Label>
                    <div className="col-span-3">
                        <Input id="startDate" type="date" {...register('startDate')} className={errors.startDate ? 'border-destructive' : ''} placeholder="YYYY-MM-DD" />
                         {errors.startDate && <p className="text-destructive text-sm mt-1">{errors.startDate.message}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="maturityDate" className="text-right">Maturity Date</Label>
                    <div className="col-span-3">
                        <Input id="maturityDate" type="date" {...register('maturityDate')} className={errors.maturityDate ? 'border-destructive' : ''} placeholder="YYYY-MM-DD" />
                        {errors.maturityDate && <p className="text-destructive text-sm mt-1">{errors.maturityDate.message}</p>}
                    </div>
                </div>
             </>
          )}

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
