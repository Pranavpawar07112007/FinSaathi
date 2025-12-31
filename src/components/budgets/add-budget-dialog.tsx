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
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
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
import { checkAndAwardAchievementsAction } from '@/app/achievements/actions';
import { useToast } from '@/hooks/use-toast';


const budgetSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  limit: z.coerce.number().positive('Limit must be a positive number.'),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface AddBudgetDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  availableCategories: string[];
}

export function AddBudgetDialog({
  isOpen,
  setIsOpen,
  availableCategories,
}: AddBudgetDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset category creation mode when dialog opens/closes
    setIsCreatingNewCategory(false);
  }, [isOpen]);
  
  useEffect(() => {
    // If no categories are available, force creation mode.
    if(availableCategories.length === 0 && isOpen) {
      setIsCreatingNewCategory(true);
    }
  }, [availableCategories, isOpen]);


  const onSubmit = async (data: BudgetFormData) => {
    if (!user || !firestore) {
      setFormError('You must be logged in to create a budget.');
      return;
    }
    setFormError(null);

    try {
      const budgetData = {
        userId: user.uid,
        name: data.name,
        limit: data.limit,
      };

      const budgetsRef = collection(firestore, 'users', user.uid, 'budgets');
      addDocumentNonBlocking(budgetsRef, budgetData);

      reset();
      setIsOpen(false);
      
      // Post-budget creation achievement check
      const { awarded } = await checkAndAwardAchievementsAction({
        userId: user.uid,
        transactionCount: 0, // Not relevant here
        budgetCount: 1, // We just added one
      });

      if (awarded.length > 0) {
         toast({
            title: "Achievement Unlocked!",
            description: `You've earned the "${awarded.join(", ")}" badge!`,
        });
      }

    } catch (error) {
      setFormError('Failed to create budget. Please try again.');
      console.error(error);
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
    setValue('name', '');
    clearErrors('name');
    setIsCreatingNewCategory((prev) => !prev);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>
            Set a spending limit for a specific category.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Controller
                name="name"
                control={control}
                render={({ field }) =>
                  isCreatingNewCategory ? (
                    <Input
                      {...field}
                      placeholder="Enter new category name"
                      className={errors.name ? 'border-destructive' : ''}
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
                            errors.name && 'border-destructive'
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
                                    setValue('name', currentValue === field.value ? '' : currentValue, { shouldValidate: true });
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
              {errors.name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
             <div/>
             <div className="col-span-3">
                 <Button type="button" variant="link" className="p-0 h-auto" onClick={handleToggleNewCategory} disabled={availableCategories.length === 0}>
                    {isCreatingNewCategory ? 'Or select an existing category' : 'Or create a new category'}
                </Button>
             </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="limit" className="text-right">
              Spending Limit
            </Label>
            <div className="col-span-3">
              <Input
                id="limit"
                type="number"
                step="any"
                min="0"
                {...register('limit')}
                className={errors.limit ? 'border-destructive' : ''}
                placeholder="e.g., 20000"
              />
              {errors.limit && (
                <p className="text-destructive text-sm mt-1">
                  {errors.limit.message}
                </p>
              )}
            </div>
          </div>

          {formError && (
            <p className="text-destructive text-sm text-center">{formError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
