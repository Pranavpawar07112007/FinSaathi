'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import { ReactNode } from 'react';
import { Sidebar } from './dashboard/sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const showNav =
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    pathname !== '/';

  if (!showNav) {
    return (
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block sticky top-0 h-screen p-4">
        <Sidebar isInSheet={false} />
      </aside>
      <div className="flex flex-col overflow-x-hidden">
        <Header />
        {children}
      </div>
    </div>
  );
}
