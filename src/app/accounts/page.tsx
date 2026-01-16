
'use client';

import Header from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Wallet, PiggyBank, TrendingUp, Landmark, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LinkAccountDialog } from '@/components/link-account-dialog';
import { DeleteAccountDialog } from '@/components/delete-account-dialog';
import type { WithId } from '@/firebase/firestore/use-collection';
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog';
import { AnimatedSection } from '@/components/animated-section';

export interface Account {
    id?: string;
    name: string;
    balance: number;
    userId: string;
}


const ICONS: { [key: string]: React.ElementType } = {
  Checking: Wallet,
  Savings: PiggyBank,
  Investment: TrendingUp,
  Default: Landmark,
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

export default function AccountsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLinkAccountDialogOpen, setIsLinkAccountDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<WithId<Account> | null>(null);

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'accounts'));
  }, [user, firestore]);

  const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

  const handleDeleteClick = (account: WithId<Account>) => {
    setSelectedAccount(account);
    setIsDeleteAccountDialogOpen(true);
  };
  
  const handleEditClick = (account: WithId<Account>) => {
    setSelectedAccount(account);
    setIsEditAccountDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <AnimatedSection>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>Accounts</CardTitle>
              <CardDescription>
                A summary of your financial accounts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setIsLinkAccountDialogOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    Link New Account
                </Button>
            </div>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <div className="flex gap-6 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="min-w-[300px] md:min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-4 w-48 mt-2" />
                    </CardContent>
                  </Card>
                ))
              : accounts?.map((account, index) => {
                  const Icon = ICONS[account.name] || ICONS.Default;
                  return (
                    <AnimatedSection key={account.id} delay={index * 0.1}>
                        <Card
                        className="min-w-[300px] md:min-w-0 h-full"
                        >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Icon className="size-5 text-muted-foreground" />
                            {account.name}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditClick(account)}>
                                <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDeleteClick(account)}>
                                <Trash2 className="size-4 text-destructive" />
                            </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                            {formatCurrency(account.balance)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                            Manually linked account
                            </p>
                        </CardContent>
                        </Card>
                    </AnimatedSection>
                  );
                })}
             {!isLoading && (!accounts || accounts.length === 0) && (
                <div className="col-span-full text-center text-muted-foreground py-10 w-full">
                    <p>No accounts linked yet.</p>
                    <p>Click "Link New Account" to get started.</p>
                </div>
            )}
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>
      </main>
      <LinkAccountDialog
        isOpen={isLinkAccountDialogOpen}
        setIsOpen={setIsLinkAccountDialogOpen}
        />
       <EditAccountDialog
        isOpen={isEditAccountDialogOpen}
        setIsOpen={setIsEditAccountDialogOpen}
        account={selectedAccount}
      />
      <DeleteAccountDialog
        isOpen={isDeleteAccountDialogOpen}
        setIsOpen={setIsDeleteAccountDialogOpen}
        account={selectedAccount}
      />
    </div>
  );
}
