'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CircleDollarSign,
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Landmark,
  Target,
  Bot,
  Briefcase,
  Repeat,
  Trophy,
  MessageCircle,
  Banknote,
  AreaChart,
  ShieldCheck,
  Newspaper,
} from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import React from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { href: '/analytics', label: 'Analytics', icon: AreaChart },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/accounts', label: 'Accounts', icon: Landmark },
  { href: '/investments', label: 'Investments', icon: Briefcase },
  { href: '/stock-market', label: 'Stock Market', icon: Newspaper },
  { href: '/debts', label: 'Debts', icon: Banknote },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/tax-center', label: 'Tax Center', icon: ShieldCheck },
  { href: '/advice', label: 'AI Advice', icon: Bot },
  { href: '/chatbot', label: 'AI Chatbot', icon: MessageCircle },
];

export function Sidebar({ isInSheet = false }: { isInSheet?: boolean }) {
  const pathname = usePathname();

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        pathname === href && 'bg-muted text-primary'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );

  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border bg-card/85 shadow-sm backdrop-blur-xl">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CircleDollarSign className="h-6 w-6" />
          <span className="">FinSaathi</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {menuItems.map((item) =>
            isInSheet ? (
              <SheetClose asChild key={item.label}>
                <NavLink {...item} />
              </SheetClose>
            ) : (
              <NavLink key={item.label} {...item} />
            )
          )}
        </nav>
      </div>
    </div>
  );
}
