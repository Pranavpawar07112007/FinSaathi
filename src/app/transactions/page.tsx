
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Pencil, FilterX, FileDown, HelpCircle, ShieldCheck, ArrowRightLeft, Upload } from 'lucide-react';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteTransactionDialog } from '@/components/dashboard/delete-transaction-dialog';
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog';
import type { WithId } from '@/firebase/firestore/use-collection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMonth, getYear, parseISO } from 'date-fns';
import type { Investment } from '@/app/investments/page';
import type { Account } from '@/app/accounts/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImportTransactionsDialog } from '@/components/transactions/import-transactions-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteMultipleTransactionsDialog } from '@/components/transactions/delete-multiple-transactions-dialog';


export interface Transaction {
  id?: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense' | 'investment' | 'transfer';
  category: string;
  userId: string;
  investmentId?: string;
  goalId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  isTaxDeductible?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];


export default function TransactionsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteMultipleDialogOpen, setIsDeleteMultipleDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WithId<Transaction> | null>(null);

  // State for bulk selection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter states
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');


  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [user, firestore]);

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  const investmentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'investments'));
  }, [user, firestore]);

  const { data: investments, isLoading: isLoadingInvestments } = useCollection<Investment>(investmentsQuery);

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);

  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<Account>(accountsQuery);

  const accountsMap = useMemo(() => {
    if (!accounts) return new Map<string, string>();
    return new Map(accounts.map(acc => [acc.id!, acc.name]));
  }, [accounts]);


  const { availableYears, availableCategories } = useMemo(() => {
    if (!transactions) return { availableYears: [], availableCategories: [] };
    const years = new Set<string>();
    const categories = new Set<string>();
    transactions.forEach(t => {
      years.add(getYear(parseISO(t.date)).toString());
      categories.add(t.category);
    });
    return { 
      availableYears: Array.from(years).sort((a, b) => Number(b) - Number(a)), 
      availableCategories: Array.from(categories).sort() 
    };
  }, [transactions]);


  const filteredTransactions = useMemo(() => {
    return transactions?.filter(t => {
      const transactionDate = parseISO(t.date);
      const yearMatch = filterYear === 'all' || getYear(transactionDate).toString() === filterYear;
      const monthMatch = filterMonth === 'all' || getMonth(transactionDate).toString() === filterMonth;
      const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
      const typeMatch = filterType === 'all' || t.type === filterType;
      return yearMatch && monthMatch && categoryMatch && typeMatch;
    }) || [];
  }, [transactions, filterYear, filterMonth, filterCategory, filterType]);

  const selectedTransactions = useMemo(() => {
    return transactions?.filter(t => selectedIds.has(t.id)) || [];
  }, [transactions, selectedIds]);
  
  const clearFilters = () => {
    setFilterYear('all');
    setFilterMonth('all');
    setFilterCategory('all');
    setFilterType('all');
  };

  const handleEditClick = (transaction: WithId<Transaction>) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (transaction: WithId<Transaction>) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };
  
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set()); // Clear selections when toggling mode
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  
  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const renderTransactionDetails = (t: WithId<Transaction>) => {
    if (t.type === 'transfer' && t.fromAccountId && t.toAccountId) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{accountsMap.get(t.fromAccountId) || 'Unknown Account'}</span>
            <ArrowRightLeft className="size-3"/>
            <span>{accountsMap.get(t.toAccountId) || 'Unknown Account'}</span>
        </div>
      );
    }
    if (t.accountId) {
      return (
        <div className="text-xs text-muted-foreground">
          {accountsMap.get(t.accountId) || 'Unknown Account'}
        </div>
      );
    }
    return null;
  };

  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = [
      'id',
      'date',
      'description',
      'amount',
      'type',
      'category',
      'accountId',
      'fromAccountId',
      'toAccountId',
      'investmentId',
      'isTaxDeductible'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map((row) => {
        const values = [
          row.id,
          row.date,
          `"${row.description.replace(/"/g, '""')}"`,
          row.amount,
          row.type,
          row.category,
          row.accountId || '',
          row.fromAccountId || '',
          row.toAccountId || '',
          row.investmentId || '',
          row.isTaxDeductible || false
        ];
        return values.join(',');
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                    A complete history of your financial activities. Filter and view your transactions below.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-4">
                  <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                    <Upload />
                    Import Transactions
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={downloadCSV}>
                        <FileDown />
                        Download as CSV
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <HelpCircle className="size-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <p className="text-sm">
                                The CSV file will contain only the transactions that match the currently active filters (Year, Month, Category, and Type).
                            </p>
                        </PopoverContent>
                    </Popover>
                </div>
                {isSelectionMode ? (
                    <>
                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteMultipleDialogOpen(true)} disabled={selectedIds.size === 0}>
                            <Trash2/>
                            Delete ({selectedIds.size})
                        </Button>
                        <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>
                            Cancel
                        </Button>
                    </>
                ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                            <Pencil/>
                            Edit
                        </Button>
                        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle />
                            Add Transaction
                        </Button>
                      </>
                )}
            </div>
            <div className="pt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                </Select>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {MONTHS.map((month, index) => <SelectItem key={month} value={index.toString()}>{month}</SelectItem>)}
                    </SelectContent>
                </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" className="col-span-2 md:col-span-1" onClick={clearFilters}>
                    <FilterX className="mr-2"/>
                    Clear Filters
                </Button>
            </div>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    {isSelectionMode && (
                        <TableHead className="w-12">
                            <Checkbox 
                                onCheckedChange={handleSelectAll}
                                checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                                aria-label="Select all rows"
                            />
                        </TableHead>
                    )}
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isLoadingAccounts ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {isSelectionMode && <TableCell><Skeleton className="h-5 w-5" /></TableCell>}
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-5 w-20 mx-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                           <Skeleton className="h-8 w-8" />
                           <Skeleton className="h-8 w-8" />
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} data-state={selectedIds.has(transaction.id) && "selected"}>
                      {isSelectionMode && (
                        <TableCell>
                            <Checkbox 
                                checked={selectedIds.has(transaction.id)}
                                onCheckedChange={(checked) => handleRowSelect(transaction.id, !!checked)}
                                aria-label={`Select row ${transaction.id}`}
                            />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                            {transaction.isTaxDeductible && (
                                <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <ShieldCheck className="size-4 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Potentially tax-deductible</p>
                                    </TooltipContent>
                                </Tooltip>
                                </TooltipProvider>
                            )}
                            <div className="font-medium">{transaction.description}</div>
                        </div>
                        {renderTransactionDetails(transaction)}
                      </TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                           transaction.type === 'income' ? 'text-green-600' : 
                           transaction.type === 'expense' ? 'text-destructive' : ''
                        }`}
                      >
                        {Math.abs(transaction.amount).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         {!isSelectionMode && (
                             <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditClick(transaction)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(transaction)}
                                >
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSelectionMode ? 6 : 5} className="text-center h-24">
                      {transactions?.length === 0 ? "No transactions found." : "No transactions match your current filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <AddTransactionDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        investments={investments || []}
        accounts={accounts || []}
      />
      <EditTransactionDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        transaction={selectedTransaction}
        investments={investments || []}
        accounts={accounts || []}
      />
       <DeleteTransactionDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        transaction={selectedTransaction}
      />
       <DeleteMultipleTransactionsDialog
        isOpen={isDeleteMultipleDialogOpen}
        setIsOpen={setIsDeleteMultipleDialogOpen}
        transactions={selectedTransactions}
        onConfirm={() => {
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }}
      />
      <ImportTransactionsDialog 
        isOpen={isImportDialogOpen}
        setIsOpen={setIsImportDialogOpen}
      />
    </div>
  );
}
