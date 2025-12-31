
'use client';

import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  importTransactionsAction,
  importFromImageAction,
  importFromPdfAction,
} from '@/app/transactions/actions';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Check, Loader2, Upload, Sparkles, FileCheck, Info, Image as ImageIcon, FileText, Landmark, ShieldAlert } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { collection, writeBatch, doc, query, orderBy, increment } from 'firebase/firestore';
import type { Transaction } from '@/app/transactions/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Account } from '@/app/accounts/page';
import type { WithId } from '@/firebase/firestore/use-collection';
import { Label } from '../ui/label';

interface ImportTransactionsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type Step = 'upload' | 'review';
type ImportSource = 'csv' | 'image' | 'pdf';

type ParsedTransaction = {
    date: string;
    description: string;
    amount: number;
    category: string;
    bankTransactionId?: string;
}

export function ImportTransactionsDialog({
  isOpen,
  setIsOpen,
}: ImportTransactionsDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] =
    useState<ParsedTransaction[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [source, setSource] = useState<ImportSource>('csv');
  const [duplicates, setDuplicates] = useState<ParsedTransaction[]>([]);


  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<Account>(accountsQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [user, firestore]);
  const { data: existingTransactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const existingTransactionSignatures = useMemo(() => {
      if (!existingTransactions) return new Set();
      // Use Math.abs on the amount to ensure positive and negative values match
      return new Set(existingTransactions.map(t => `${t.date}-${Math.abs(t.amount)}-${t.description}`));
  }, [existingTransactions]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: ImportSource) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        let isValid = false;
        let errorMessage = 'Invalid file type.';
        
        if (type === 'csv' && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
            isValid = true;
        } else if (type === 'image' && selectedFile.type.startsWith('image/')) {
            isValid = true;
        } else if (type === 'pdf' && selectedFile.type === 'application/pdf') {
            isValid = true;
        }

        if (isValid) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setError(null);
            setSource(type);
             if (type === 'image') {
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result as string);
                reader.readAsDataURL(selectedFile);
            } else {
                setImagePreview(null);
            }
        } else {
             if (type === 'csv') errorMessage = 'Please upload a CSV file.';
             if (type === 'image') errorMessage = 'Please upload an image file.';
             if (type === 'pdf') errorMessage = 'Please upload a PDF file.';
             setError(errorMessage);
             setFile(null);
             setFileName('');
             setImagePreview(null);
        }
    }
  };


  const handleParse = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      let result;
      const reader = new FileReader();
      
      result = await new Promise((resolve, reject) => {
        reader.onloadend = async () => {
            try {
                const dataUri = reader.result as string;
                if (source === 'csv') {
                    const fileContent = await file.text();
                    const res = await importTransactionsAction(fileContent);
                    resolve(res);
                } else if (source === 'image') {
                    const res = await importFromImageAction(dataUri);
                    resolve(res);
                } else if (source === 'pdf') {
                    const res = await importFromPdfAction(dataUri);
                    resolve(res);
                }
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = reject;
        
        if (source === 'csv') {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
      });
      
      if ((result as any).error || !(result as any).transactions) {
        throw new Error((result as any).error || 'Failed to parse transactions.');
      }

      // Check for duplicates before showing review step
      const uniqueTransactions: ParsedTransaction[] = [];
      const foundDuplicates: ParsedTransaction[] = [];
      (result as any).transactions.forEach((t: ParsedTransaction) => {
          // Use Math.abs on the amount to ensure positive and negative values match
          const signature = `${t.date}-${Math.abs(t.amount)}-${t.description}`;
          if (existingTransactionSignatures.has(signature)) {
              foundDuplicates.push(t);
          } else {
              uniqueTransactions.push(t);
          }
      });
      
      setDuplicates(foundDuplicates);
      setParsedTransactions(uniqueTransactions);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred during parsing.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!user || !firestore || parsedTransactions.length === 0) {
      setError('No new transactions to import or user not logged in.');
      return;
    }
     if (!selectedAccountId) {
        setError('Please select an account to assign these transactions to.');
        return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const batch = writeBatch(firestore);
      const transactionsRef = collection(firestore, `users/${user.uid}/transactions`);
      let totalImpact = 0;

      parsedTransactions.forEach(transaction => {
        const docRef = doc(transactionsRef);
        
        let type: Transaction['type'] = transaction.amount < 0 ? 'expense' : 'income';
        totalImpact += transaction.amount;

        const newTransaction: Omit<Transaction, 'id'> = {
          userId: user.uid,
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.date,
          category: transaction.category,
          type: type,
          source: source,
          accountId: selectedAccountId,
          bankTransactionId: transaction.bankTransactionId || null,
          isTaxDeductible: false,
          fromAccountId: null,
          toAccountId: null,
          goalId: null,
          investmentId: null,
        };

        batch.set(docRef, newTransaction);
      });
      
      // Add the account balance update to the batch
      if (totalImpact !== 0) {
        const accountRef = doc(firestore, 'users', user.uid, 'accounts', selectedAccountId);
        batch.update(accountRef, { balance: increment(totalImpact) });
      }

      await batch.commit();
      
      toast({
        title: 'Import Successful',
        description: `${parsedTransactions.length} transactions have been imported. ${duplicates.length} duplicates were skipped.`,
      });
      handleClose();

    } catch (e: any)      {
       console.error("Error saving imported transactions:", e);
       setError('Failed to save transactions to the database. Check console for details.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setFileName('');
    setIsParsing(false);
    setIsSaving(false);
    setError(null);
    setParsedTransactions([]);
    setImagePreview(null);
    setSelectedAccountId('');
    setDuplicates([]);
    setIsOpen(false);
  };
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
  };

  const renderUploadStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Import Transactions</DialogTitle>
        <DialogDescription>
          Upload a file to automatically import your transactions.
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="csv" onClick={() => setSource('csv')}>From CSV</TabsTrigger>
            <TabsTrigger value="image" onClick={() => setSource('image')}>From Image</TabsTrigger>
            <TabsTrigger value="pdf" onClick={() => setSource('pdf')}>From PDF</TabsTrigger>
        </TabsList>
        <TabsContent value="csv">
             <div className="py-4 space-y-4">
                <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Expected CSV Format</AlertTitle>
                <AlertDescription>
                    <p>Your file should have columns for date, description, and amount. Use negative values for expenses.</p>
                </AlertDescription>
                </Alert>
                <Button
                variant="outline"
                className="w-full"
                onClick={() => csvInputRef.current?.click()}
                >
                <Upload className="mr-2" />
                {fileName && source === 'csv' ? 'Change File' : 'Select CSV File'}
                </Button>
                <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'csv')}
                />
            </div>
        </TabsContent>
        <TabsContent value="image">
            <div className="py-4 space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Upload UPI Screenshot</AlertTitle>
                    <AlertDescription>
                        Upload a screenshot of your transaction history from apps like Google Pay, PhonePe, or Paytm.
                    </AlertDescription>
                </Alert>
                {imagePreview && (
                    <div className="relative w-full h-48 border rounded-md overflow-hidden">
                        <Image src={imagePreview} alt="Selected screenshot preview" layout="fill" objectFit="contain" />
                    </div>
                )}
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => imageInputRef.current?.click()}
                >
                    <ImageIcon className="mr-2" />
                    {fileName && source === 'image' ? 'Change Image' : 'Select Image'}
                </Button>
                 <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'image')}
                />
            </div>
        </TabsContent>
         <TabsContent value="pdf">
            <div className="py-4 space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Upload Bank Statement</AlertTitle>
                    <AlertDescription>
                        Upload a PDF of your bank or credit card statement.
                    </AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => pdfInputRef.current?.click()}
                >
                    <FileText className="mr-2" />
                    {fileName && source === 'pdf' ? 'Change File' : 'Select PDF File'}
                </Button>
                 <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'pdf')}
                />
            </div>
        </TabsContent>
      </Tabs>

      {fileName && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileCheck className="text-primary"/>
            <p>{fileName}</p>
        </div>
      )}
      
      {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="size-4"/>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
            Cancel
            </Button>
            <Button onClick={handleParse} disabled={!file || isParsing}>
            {isParsing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2"/>}
            Parse with AI
            </Button>
      </DialogFooter>
    </>
  );

  const renderReviewStep = () => (
    <>
       <DialogHeader>
        <DialogTitle>Review & Import Transactions</DialogTitle>
        <DialogDescription>
          FinSaathi has parsed {parsedTransactions.length} new transactions. Please review them and select an account before importing.
        </DialogDescription>
      </DialogHeader>
        
        {duplicates.length > 0 && (
             <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                <ShieldAlert className="h-4 w-4 text-yellow-500" />
                <AlertTitle>Duplicates Found</AlertTitle>
                <AlertDescription>
                    {duplicates.length} transaction(s) already exist in your records and will be skipped.
                </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountId" className="text-right">
                Import to Account
            </Label>
            <div className="col-span-3">
                 <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                    <SelectTrigger className={!selectedAccountId && error ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select an account..." />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoadingAccounts ? (
                            <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                        ) : (
                            accounts?.map(acc => (
                                <SelectItem key={acc.id} value={acc.id!}>{acc.name}</SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <ScrollArea className="h-80 rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedTransactions.map((t, index) => (
                <TableRow key={index}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className={`text-right font-medium ${t.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(Math.abs(t.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {parsedTransactions.length === 0 && !isSaving && (
             <p className="text-center text-muted-foreground py-4">No new transactions to import.</p>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="size-4"/>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      <DialogFooter>
        <Button variant="outline" onClick={() => {
            setStep('upload');
            setError(null);
            setParsedTransactions([]);
            setDuplicates([]);
        }}>Back</Button>
        <Button onClick={handleConfirmImport} disabled={isSaving || parsedTransactions.length === 0}>
            {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Check className="mr-2"/>}
            Confirm & Import
        </Button>
      </DialogFooter>
    </>
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-3xl">
        {step === 'upload' && renderUploadStep()}
        {step === 'review' && renderReviewStep()}
      </DialogContent>
    </Dialog>
  );
}
