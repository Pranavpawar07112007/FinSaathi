
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, TrendingUp, DollarSign, Bitcoin, LandmarkIcon, PiggyBank, ReceiptText, AreaChart, CircleDot, CalendarDays, Percent, Newspaper, ExternalLink, AlertTriangle, ArrowUpCircle, Info } from 'lucide-react';
import { AddInvestmentDialog } from '@/components/investments/add-investment-dialog';
import { EditInvestmentDialog } from '@/components/investments/edit-investment-dialog';
import { DeleteInvestmentDialog } from '@/components/investments/delete-investment-dialog';
import type { WithId } from '@/firebase/firestore/use-collection';
import { differenceInMonths, parse, isValid, differenceInYears } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { getInvestmentNews, type GetInvestmentNewsOutput } from '@/ai/flows/get-investment-news-flow';
import { cn } from '@/lib/utils';

export interface Investment {
    name: string;
    type: 'Stock' | 'Mutual Fund' | 'Crypto' | 'Fixed Deposit' | 'Recurring Deposit' | 'Bonds' | 'ETF' | 'Gold' | 'Other';
    currentValue: number;
    targetValue?: number;
    userId: string;
    quantity?: number;
    purchasePrice?: number;
    principalAmount?: number;
    installmentAmount?: number;
    interestRate?: number;
    maturityDate?: string; // YYYY-MM-DD
    startDate?: string;
}

const ICONS: { [key: string]: React.ElementType } = {
    'Stock': TrendingUp,
    'Mutual Fund': LandmarkIcon,
    'Crypto': Bitcoin,
    'Fixed Deposit': PiggyBank,
    'Recurring Deposit': ReceiptText,
    'Bonds': AreaChart,
    'ETF': AreaChart,
    'Gold': CircleDot,
    'Other': DollarSign,
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

// Calculates Future Value for Recurring Deposit
const calculateRDValue = (P: number, r: number, n: number, t: number): number => {
    const i = r / n;
    const nt = n * t;
    // FV = P * [(((1 + i)^nt) - 1) / i]
    return P * ( (Math.pow(1 + i, nt) - 1) / i);
};

// Calculates Compound Interest for Fixed Deposit
const calculateFDValue = (P: number, r: number, n: number, t: number): number => {
    const i = r / n;
    const nt = n * t;
    // A = P * (1 + r/n)^(nt)
    return P * Math.pow(1 + i, nt);
};


export default function InvestmentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<WithId<Investment> | null>(null);
  
  const [news, setNews] = useState<GetInvestmentNewsOutput['news']>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const investmentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'investments'));
  }, [user, firestore]);

  const { data: investments, isLoading } = useCollection<Investment>(investmentsQuery);

  const fetchNews = useCallback(async () => {
    if (!investments || investments.length === 0) {
      setNews([]);
      return;
    }
    setIsNewsLoading(true);
    try {
      const investmentNames = investments.map(inv => inv.name);
      const newsData = await getInvestmentNews({ investmentNames });
      setNews(newsData.news);
    } catch (error) {
      console.error("Failed to fetch investment news:", error);
    } finally {
      setIsNewsLoading(false);
    }
  }, [investments]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);
  
  const processedInvestments = useMemo(() => {
    if (!investments) return [];
    return investments.map(inv => {
        let displayValue = inv.currentValue;
        let gainLoss: number | null = null;
        let progressTarget: number | null = null;
        
        if (inv.type === 'Fixed Deposit' && inv.principalAmount && inv.interestRate && inv.maturityDate && inv.startDate) {
            const maturity = parse(inv.maturityDate, 'yyyy-MM-dd', new Date());
            const start = parse(inv.startDate, 'yyyy-MM-dd', new Date());
            if(isValid(maturity) && isValid(start)) {
                const yearsTotal = differenceInYears(maturity, start);
                if (yearsTotal > 0) {
                    displayValue = calculateFDValue(inv.principalAmount, inv.interestRate / 100, 4, yearsTotal); // Compounding quarterly
                    gainLoss = displayValue - inv.principalAmount;
                    progressTarget = displayValue;
                }
            }
        } else if (inv.type === 'Recurring Deposit' && inv.installmentAmount && inv.interestRate && inv.maturityDate && inv.startDate) {
            const maturity = parse(inv.maturityDate, 'yyyy-MM-dd', new Date());
            const start = parse(inv.startDate, 'yyyy-MM-dd', new Date());
            if(isValid(maturity) && isValid(start)) {
                const monthsTotal = differenceInMonths(maturity, start);
                if (monthsTotal > 0) {
                    displayValue = calculateRDValue(inv.installmentAmount, inv.interestRate / 100, 12, monthsTotal / 12); // Compounding monthly
                    const totalInvested = inv.installmentAmount * monthsTotal;
                    gainLoss = displayValue - totalInvested;
                    progressTarget = displayValue;
                }
            }
        } else if (inv.purchasePrice && typeof inv.quantity === 'number') {
             const purchaseValue = inv.purchasePrice * inv.quantity;
             if (purchaseValue > 0) {
                gainLoss = inv.currentValue - purchaseValue;
             }
        }

        if (inv.targetValue && inv.targetValue > 0) {
            progressTarget = inv.targetValue;
        }

        return {
            ...inv,
            displayValue,
            gainLoss,
            progressTarget,
        }
    });
  }, [investments]);

  const totalPortfolioValue = useMemo(() =>
    processedInvestments.reduce((acc, inv) => acc + inv.currentValue, 0) || 0
  , [processedInvestments]);

  const handleEditClick = (investment: WithId<Investment>) => {
    setSelectedInvestment(investment);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (investment: WithId<Investment>) => {
    setSelectedInvestment(investment);
    setIsDeleteOpen(true);
  };
  
  const alertIcons: { [key: string]: React.ElementType } = {
    Opportunity: ArrowUpCircle,
    Risk: AlertTriangle,
    Neutral: Info,
  };

  const alertColors: { [key: string]: string } = {
    Opportunity: 'border-green-500/50 bg-green-500/10',
    Risk: 'border-destructive/50 bg-destructive/10',
    Neutral: 'border-blue-500/50 bg-blue-500/10',
  };
  
  const alertIconColors: { [key: string]: string } = {
    Opportunity: 'text-green-500',
    Risk: 'text-destructive',
    Neutral: 'text-blue-500',
  };


  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-8 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Investments</CardTitle>
              <CardDescription>
                Track your investment portfolio and its performance.
              </CardDescription>
            </div>
             <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</p>
                </div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    Add Investment
                </Button>
            </div>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <div className="flex gap-6 pb-4 sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="min-w-[300px] sm:min-w-0">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-8 w-1/2" />
                            <div className="flex justify-between">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </CardContent>
                    </Card>
                  ))
                : processedInvestments.map((investment) => {
                    const Icon = ICONS[investment.type] || ICONS.Other;
                    const isProfit = investment.gainLoss !== null && investment.gainLoss >= 0;
                    const progressPercentage = investment.progressTarget ? (investment.currentValue / investment.progressTarget) * 100 : null;

                    return (
                      <Card key={investment.id} className="flex flex-col min-w-[300px] sm:min-w-0">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icon className="size-6 text-muted-foreground"/>
                                <div>
                                    <CardTitle className="text-lg">{investment.name}</CardTitle>
                                    <CardDescription>{investment.type}</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditClick(investment)}>
                                    <Pencil className="size-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDeleteClick(investment)}>
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    {investment.type === 'Fixed Deposit' || investment.type === 'Recurring Deposit' ? 'Est. Maturity Value' : 'Current Value' }
                                </p>
                                <p className="text-2xl font-bold">{formatCurrency(investment.displayValue)}</p>
                            </div>
                            {progressPercentage !== null && investment.progressTarget !== null && (
                                <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>{formatCurrency(investment.currentValue)}</span>
                                        <span>{formatCurrency(investment.progressTarget)}</span>
                                    </div>
                                    <Progress value={progressPercentage} />
                                </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {investment.interestRate && (
                                    <div className="flex items-center gap-1">
                                        <Percent className="size-4"/>
                                        <span>{investment.interestRate}%</span>
                                    </div>
                                )}
                                {investment.maturityDate && (
                                     <div className="flex items-center gap-1">
                                        <CalendarDays className="size-4"/>
                                        <span>{investment.maturityDate}</span>
                                     </div>
                                )}
                            </div>
                             {typeof investment.quantity === 'number' && (
                                <p className="text-sm text-muted-foreground">Quantity: {investment.quantity}</p>
                             )}
                        </CardContent>
                        {investment.gainLoss !== null && (
                             <CardFooter className="flex flex-col items-start pt-4 border-t">
                                <p className="text-sm">
                                    Overall Return: 
                                    <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-destructive'}`}>
                                        {' '}{formatCurrency(investment.gainLoss)}
                                    </span>
                                </p>
                             </CardFooter>
                        )}
                      </Card>
                    );
                  })}
                {!isLoading && (!processedInvestments || processedInvestments.length === 0) && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        <p>You haven't added any investments yet.</p>
                        <p>Click "Add Investment" to get started.</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Newspaper />
                    Market Alerts
                </CardTitle>
                <CardDescription>
                    AI-analyzed news and events relevant to your portfolio.
                </CardDescription>
            </CardHeader>
             <CardContent className="w-full overflow-x-auto">
                <div className="flex gap-4 pb-4 md:grid md:grid-cols-2">
                {isNewsLoading ? (
                     <>
                        {Array.from({ length: 2 }).map((_, i) => (
                             <Card key={i} className="p-4 space-y-2 min-w-[300px] md:min-w-0">
                                <Skeleton className="h-5 w-3/4"/>
                                <Skeleton className="h-4 w-full"/>
                                <Skeleton className="h-4 w-1/2"/>
                             </Card>
                        ))}
                    </>
                ) : news.length > 0 ? (
                    <>
                        {news.map((item, index) => {
                             const AlertIcon = alertIcons[item.alertType] || Info;
                             return (
                                <Card key={index} className={cn("p-4 flex flex-col min-w-[300px] md:min-w-0", alertColors[item.alertType])}>
                                    <div className="flex items-start gap-3 mb-2">
                                        <AlertIcon className={cn("size-5 mt-1", alertIconColors[item.alertType])} />
                                        <div>
                                            <p className="font-semibold">{item.headline}</p>
                                            <p className="text-xs text-muted-foreground">{item.source} - for {item.investmentName}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground flex-grow">{item.summary}</p>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-2 flex items-center gap-1">
                                        Read More <ExternalLink className="size-3"/>
                                    </a>
                                </Card>
                             )
                        })}
                    </>
                ) : (
                    <div className="w-full text-center text-muted-foreground py-8">
                        <p>No news to display. Add some investments to get started.</p>
                    </div>
                )}
                </div>
             </CardContent>
        </Card>

      </main>
      <AddInvestmentDialog isOpen={isAddOpen} setIsOpen={setIsAddOpen} />
      <EditInvestmentDialog isOpen={isEditOpen} setIsOpen={setIsEditOpen} investment={selectedInvestment} />
      <DeleteInvestmentDialog isOpen={isDeleteOpen} setIsOpen={setIsDeleteOpen} investmentId={selectedInvestment?.id} />
    </div>
  );
}
