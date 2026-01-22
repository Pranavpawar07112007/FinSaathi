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
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Transaction } from '@/app/transactions/page';
import { useToast } from '@/hooks/use-toast';
import { learnFromCategorization } from '@/ai/flows/learn-from-categorization-flow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

const bulkEditSchema = z.object({
  category: z.string().min(1, 'Category is required'),
});

type BulkEditFormData = z.infer<typeof bulkEditSchema>;

interface BulkEditCategoryDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transactions: WithId<Transaction>[];
  availableCategories: string[];
  onConfirm: () => void;
}

export function BulkEditCategoryDialog({
  isOpen,
  setIsOpen,
  transactions,
  availableCategories,
  onConfirm,
}: BulkEditCategoryDialogProps) {
  const {
    handleSubmit,
    control,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BulkEditFormData>({
    resolver: zodResolver(bulkEditSchema),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setIsCreatingNewCategory(false);
  }, [isOpen]);

  const onSubmit = async (data: BulkEditFormData) => {
    if (!user || !firestore || transactions.length === 0) {
      setFormError('An error occurred. Please try again.');
      return;
    }
    setFormError(null);

    try {
      const batch = writeBatch(firestore);
      const newCategory = data.category;

      for (const transaction of transactions) {
        // Update the transaction category
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transaction.id);
        batch.update(transactionRef, { category: newCategory });

        // Teach the AI in the background
        learnFromCategorization({
          userId: user.uid,
          description: transaction.description,
          category: newCategory,
        });
      }

      await batch.commit();

      toast({
        title: 'Transactions Updated',
        description: `${transactions.length} transaction(s) have been moved to the "${newCategory}" category.`,
      });

      onConfirm();
      setIsOpen(false);

    } catch (error) {
      setFormError('Failed to update transactions. Please try again.');
      console.error('Bulk Update Error:', error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setFormError(null);
      setIsCreatingNewCategory(false);
    }
    setIsOpen(open);
  };
  
  const handleToggleNewCategory = () => {
    setValue('category', '');
    clearErrors('category');
    setIsCreatingNewCategory((prev) => !prev);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Category</DialogTitle>
          <DialogDescription>
            Choose a new category for the {transactions.length} selected transaction(s). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                New Category
                </Label>
                <div className="col-span-3">
                <Controller
                    name="category"
                    control={control}
                    render={({ field }) =>
                    isCreatingNewCategory ? (
                        <Input
                        {...field}
                        placeholder="Enter new category name"
                        className={errors.category ? 'border-destructive' : ''}
                        autoFocus
                        />
                    ) : (
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground',
                                errors.category && 'border-destructive'
                            )}
                            aria-expanded={popoverOpen}
                            >
                            {field.value
                                ? availableCategories.find(
                                    (category) => category === field.value
                                )
                                : 'Select category...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                            <CommandInput 
                                placeholder="Search category..." 
                                value={searchValue}
                                onValueChange={setSearchValue}
                            />
                            <CommandList>
                                <CommandEmpty>No existing categories found.</CommandEmpty>
                                <CommandGroup>
                                {availableCategories.map((category) => (
                                    <CommandItem
                                    key={category}
                                    value={category}
                                    onSelect={(currentValue) => {
                                        setValue('category', currentValue === field.value ? '' : currentValue, { shouldValidate: true });
                                        setPopoverOpen(false);
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value === category
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                    />
                                    {category}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                            </Command>
                        </PopoverContent>
                        </Popover>
                    )
                    }
                />
                {errors.category && (
                    <p className="text-destructive text-sm mt-1">
                    {errors.category.message}
                    </p>
                )}
                </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <div/>
                <div className="col-span-3">
                    <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={handleToggleNewCategory}>
                        {isCreatingNewCategory ? 'Or select an existing category' : 'Or create a new category'}
                    </Button>
                </div>
            </div>

          {formError && (
            <p className="text-destructive text-sm text-center col-span-4">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
