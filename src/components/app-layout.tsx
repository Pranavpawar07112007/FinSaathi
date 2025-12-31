'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const showHeader =
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    pathname !== '/';

  return (
    <div className="flex min-h-screen w-full flex-col">
      {showHeader && <Header />}
      {children}
    </div>
  );
}
