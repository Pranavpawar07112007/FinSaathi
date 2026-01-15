
'use client';

import { useMemo, useState } from 'react';
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
import { ShieldCheck, FileDown, HelpCircle, AlertTriangle, FilterX } from 'lucide-react';
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
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Transaction } from '@/app/transactions/page';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMonth, getYear, parseISO } from 'date-fns';
import { AnimatedSection } from '@/components/animated-section';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TaxCenterPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const allTransactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [user, firestore]);

  const { data: allTransactions, isLoading } = useCollection<Transaction>(allTransactionsQuery);

  const taxDeductibleTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => t.isTaxDeductible === true);
  }, [allTransactions]);

  const { availableYears, availableCategories } = useMemo(() => {
    if (!taxDeductibleTransactions) return { availableYears: [], availableCategories: [] };
    const years = new Set<string>();
    const categories = new Set<string>();
    taxDeductibleTransactions.forEach(t => {
      years.add(getYear(parseISO(t.date)).toString());
      categories.add(t.category);
    });
    return {
      availableYears: Array.from(years).sort((a, b) => Number(b) - Number(a)),
      availableCategories: Array.from(categories).sort()
    };
  }, [taxDeductibleTransactions]);

  const filteredTransactions = useMemo(() => {
    return taxDeductibleTransactions.filter(t => {
      const transactionDate = parseISO(t.date);
      const yearMatch = filterYear === 'all' || getYear(transactionDate).toString() === filterYear;
      const monthMatch = filterMonth === 'all' || getMonth(transactionDate).toString() === filterMonth;
      const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
      return yearMatch && monthMatch && categoryMatch;
    });
  }, [taxDeductibleTransactions, filterYear, filterMonth, filterCategory]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const category = t.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);
  
  const totalDeductibleAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  }, [filteredTransactions]);

  const clearFilters = () => {
    setFilterYear('all');
    setFilterMonth('all');
    setFilterCategory('all');
  };

  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['id', 'date', 'description', 'amount', 'category'];
    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map((row) => {
        const values = [
          row.id,
          row.date,
          `"${row.description.replace(/"/g, '""')}"`,
          Math.abs(row.amount),
          row.category,
        ];
        return values.join(',');
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'tax_deductible_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <AnimatedSection>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="text-primary"/>
                  Tax Center
                </CardTitle>
                <CardDescription>
                  Review and export your potentially tax-deductible expenses.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={downloadCSV} disabled={filteredTransactions.length === 0}>
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
                        <div className="space-y-2">
                            <p className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="text-destructive"/>Disclaimer</p>
                            <p className="text-sm text-muted-foreground">
                                This tool provides suggestions based on AI analysis and should not be considered financial or legal advice. Always consult with a qualified tax professional for your specific situation.
                            </p>
                        </div>
                    </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Button variant="outline" onClick={clearFilters}>
                <FilterX className="mr-2"/>
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : Object.keys(groupedTransactions).length > 0 ? (
                 <Accordion type="multiple" className="w-full">
                    {Object.entries(groupedTransactions).map(([category, items]) => (
                        <AccordionItem value={category} key={category}>
                             <AccordionTrigger className="hover:no-underline">
                                <div className="flex justify-between w-full pr-4">
                                    <span className="font-semibold">{category}</span>
                                    <Badge variant="secondary">{items.length} transaction(s)</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>{t.date}</TableCell>
                                                <TableCell>{t.description}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(Math.abs(t.amount))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <ShieldCheck className="size-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No Deductible Transactions Found</h3>
                    <p>{taxDeductibleTransactions.length > 0 ? 'No transactions match your current filters.' : 'We couldn\'t find any expenses flagged as potentially tax-deductible.'}</p>
                </div>
            )}
          </CardContent>
           {Object.keys(groupedTransactions).length > 0 && (
                <CardFooter>
                    <div className="w-full text-right font-bold text-lg">
                        Total Potential Deductions: {formatCurrency(totalDeductibleAmount)}
                    </div>
                </CardFooter>
            )}
        </Card>
        </AnimatedSection>
      </main>
    </div>
  );
}
