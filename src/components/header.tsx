
'use client';

import Image from 'next/image';
import {
  Bell,
  Search,
  LogOut,
  User,
  CreditCard,
  Settings,
  CircleDollarSign,
  Menu,
  LogIn,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import {
  useUser,
  useAuth,
  useCollection,
  useMemoFirebase,
  useFirestore,
} from '@/firebase';
import { ThemeToggle } from './theme-toggle';
import { collection, query, orderBy } from 'firebase/firestore';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction } from '@/app/transactions/page';
import type { Budget } from '@/app/budgets/page';
import { Badge } from './ui/badge';
import { Sidebar } from './dashboard/sidebar';
import { detectSubscriptions, type DetectSubscriptionsOutput } from '@/ai/flows/detect-subscriptions-flow';
import { ScrollArea } from './ui/scroll-area';
import { differenceInDays, parseISO } from 'date-fns';


const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

interface Notification {
    id: string;
    type: 'bill' | 'budget';
    title: string;
    description: string;
}

const DISMISSED_NOTIFICATIONS_KEY = 'dismissedNotifications';

export default function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);


  useEffect(() => {
    const date = new Date();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    setCurrentDate(`${month} ${year}`);
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [user, firestore]);

  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const budgetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'budgets'));
  }, [user, firestore]);
  const { data: budgets, isLoading: isLoadingBudgets } = useCollection<Budget>(budgetsQuery);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery || !transactions) return [];
    return transactions.filter((t) =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, transactions]);
  
  const fetchNotifications = useCallback(async () => {
    if ((!transactions || transactions.length === 0) && (!budgets || budgets.length === 0)) {
      setNotifications([]);
      return;
    }
    setIsNotificationsLoading(true);
    const allNotifications: Notification[] = [];
    const dismissedIds = JSON.parse(sessionStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]');


    // 1. Fetch upcoming bills with new reminder logic
    try {
      if (transactions && transactions.length > 0) {
          const result = await detectSubscriptions({ transactions });
          const today = new Date();
          const upcomingBills = result.subscriptions
            .filter(sub => {
                if (!sub.nextDueDate) return false;
                const dueDate = parseISO(sub.nextDueDate);
                const daysUntilDue = differenceInDays(dueDate, today);
                const reminderDays = [0, 1, 3, 7, 15];
                return reminderDays.includes(daysUntilDue);
            })
            .map(sub => ({
                id: `bill-${sub.name}-${sub.nextDueDate}`,
                type: 'bill' as const,
                title: `${sub.name} payment due`,
                description: `${formatCurrency(sub.lastAmount)} on ${sub.nextDueDate}`,
            }));
          allNotifications.push(...upcomingBills);
      }
    } catch (error) {
        console.error("Failed to fetch bill notifications:", error);
    }

    // 2. Check for budget warnings
    if (budgets && transactions) {
        budgets.forEach(budget => {
            const spent = transactions
                .filter(t => t.category === budget.name && t.type === 'expense')
                .reduce((acc, t) => acc + Math.abs(t.amount), 0);
            
            const usage = (spent / budget.limit) * 100;

            if (usage > 100) {
                 allNotifications.push({
                    id: `budget-${budget.id}-over`,
                    type: 'budget' as const,
                    title: `Budget Exceeded: ${budget.name}`,
                    description: `You are ${formatCurrency(spent - budget.limit)} over your budget.`,
                });
            } else if (usage >= 80) {
                allNotifications.push({
                    id: `budget-${budget.id}-warning`,
                    type: 'budget' as const,
                    title: `Budget Warning: ${budget.name}`,
                    description: `You\'ve spent ${formatCurrency(spent)} (${usage.toFixed(0)}%) of your ${formatCurrency(budget.limit)} budget.`,
                });
            }
        });
    }
    
    // Filter out dismissed notifications
    const finalNotifications = allNotifications.filter(n => !dismissedIds.includes(n.id));

    // Sort all notifications (e.g., by title)
    finalNotifications.sort((a, b) => a.title.localeCompare(b.title));
    setNotifications(finalNotifications);
    setIsNotificationsLoading(false);

  }, [transactions, budgets]);

  useEffect(() => {
    if (!isLoadingTransactions && !isLoadingBudgets) {
      fetchNotifications();
    }
  }, [transactions, budgets, isLoadingTransactions, isLoadingBudgets, fetchNotifications]);

  const dismissNotification = (idToRemove: string) => {
    // Optimistically update UI
    setNotifications(prev => prev.filter(n => n.id !== idToRemove));

    // Update session storage
    const dismissedIds = JSON.parse(sessionStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]');
    if (!dismissedIds.includes(idToRemove)) {
      dismissedIds.push(idToRemove);
      sessionStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissedIds));
    }
  };
  
  const clearAllNotifications = () => {
    const currentNotificationIds = notifications.map(n => n.id);
    const dismissedIds = JSON.parse(sessionStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]');
    const newDismissedIds = [...new Set([...dismissedIds, ...currentNotificationIds])];
    sessionStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(newDismissedIds));

    setNotifications([]);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      <div className="hidden items-center gap-4 md:flex">
        <span className="text-sm font-medium text-muted-foreground">{currentDate}</span>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverAnchor asChild>
                <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search transactions..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                />
                </div>
            </PopoverAnchor>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                {filteredTransactions.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                    {filteredTransactions.map((t) => (
                    <Link
                        href="/transactions"
                        key={t.id}
                        className="block p-3 hover:bg-muted"
                        onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                        }}
                    >
                        <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-sm">{t.description}</p>
                            <p className="text-xs text-muted-foreground">{t.date}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className={`text-sm font-bold ${t.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {Math.abs(t.amount).toLocaleString('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                            })}
                            </span>
                            <Badge variant="outline" className="mt-1">{t.category}</Badge>
                        </div>
                        </div>
                    </Link>
                    ))}
                </div>
                ) : searchQuery ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    No transactions found.
                </div>
                ) : null}
            </PopoverContent>
            </Popover>
        </div>
        <ThemeToggle />
         {user && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="size-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">You have {notifications.length} unread notifications.</p>
              </div>
              <ScrollArea className="h-auto max-h-80">
                <div className="p-4 space-y-4">
                  {isNotificationsLoading ? (
                    <p className="text-sm text-muted-foreground text-center">Loading notifications...</p>
                  ) : notifications.length > 0 ? (
                    notifications.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 group">
                        {item.type === 'budget' && <AlertTriangle className="size-4 mt-1 text-yellow-500" />}
                        {item.type === 'bill' && <CreditCard className="size-4 mt-1 text-blue-500" />}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100" onClick={() => dismissNotification(item.id)}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No new notifications.</p>
                  )}
                </div>
              </ScrollArea>
              {notifications.length > 0 && (
                <div className="p-2 border-t">
                  <Button variant="link" className="w-full" onClick={clearAllNotifications}>
                    Clear all notifications
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
        {isUserLoading ? null : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  {user.photoURL && (
                    <AvatarImage
                      src={user.photoURL}
                      alt="User avatar"
                    />
                  )}
                  <AvatarFallback>
                    {user.displayName ? user.displayName.charAt(0) : user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.displayName || 'FinSaathi User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </Link>
               <Link href="/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button>
              <LogIn className="mr-2" />
              Login
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
