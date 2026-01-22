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
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { extractKeywordFromDescriptions } from '@/ai/flows/extract-keyword-flow';
import { saveRuleAction } from '@/app/transactions/rules.actions';
import { useUser } from '@/firebase';
import type { WithId } from '@/firebase/firestore/use-collection';
import type { Transaction } from '@/app/transactions/page';

interface CreateRuleDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transactions: WithId<Transaction>[];
  newCategory: string;
}

export function CreateRuleDialog({
  isOpen,
  setIsOpen,
  transactions,
  newCategory,
}: CreateRuleDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transactions.length > 0 && newCategory) {
      const getKeyword = async () => {
        setIsExtracting(true);
        setError(null);
        setKeyword(null);
        try {
          const descriptions = transactions.map((t) => t.description);
          const result = await extractKeywordFromDescriptions({ descriptions });
          setKeyword(result.keyword);
        } catch (e: any) {
          setError(e.message || 'Failed to suggest a keyword from the AI.');
          console.error(e);
        } finally {
          setIsExtracting(false);
        }
      };
      getKeyword();
    }
  }, [isOpen, transactions, newCategory]);

  const handleConfirm = async () => {
    if (!user || !keyword || !newCategory) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required information to create a rule.' });
        return;
    }
    setIsSaving(true);
    setError(null);
    try {
        const result = await saveRuleAction({ userId: user.uid, keyword, category: newCategory });
        if (!result.success) {
            throw new Error(result.error);
        }
        toast({
            title: 'Rule Created!',
            description: `Future transactions containing "${keyword}" will be categorized as "${newCategory}".`,
        });
        handleClose();
    } catch (e: any) {
        setError(e.message || 'An unknown error occurred while saving the rule.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Add a delay to allow the dialog to animate out before resetting state
    setTimeout(() => {
      setIsExtracting(false);
      setIsSaving(false);
      setError(null);
      setKeyword(null);
    }, 300);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Create an Automation Rule
          </DialogTitle>
          <DialogDescription>
            Let FinSaathi automatically categorize future transactions for you.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isExtracting ? (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mb-3" />
              <p>AI is analyzing transactions...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : keyword ? (
            <div className="text-center space-y-2">
                <p className="text-muted-foreground">Always categorize transactions containing:</p>
                <p className="font-bold text-lg p-2 bg-muted rounded-md">"{keyword}"</p>
                <p className="text-muted-foreground">as:</p>
                <p className="font-bold text-lg p-2 bg-muted rounded-md">"{newCategory}"</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isExtracting || isSaving || !keyword}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
