
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
    <>
      {showHeader && <Header />}
      <div className="flex-1">{children}</div>
    </>
  );
}
