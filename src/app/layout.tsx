
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { PageTransition } from '@/components/page-transition';
import { AppLayout } from '@/components/app-layout';
import Script from 'next/script';


export const metadata: Metadata = {
  title: 'FinSaathi - Your Financial Companion',
  description:
    'Take control of your finances with FinSaathi. Track expenses, manage budgets, and get personalized AI-powered advice.',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background" suppressHydrationWarning>
        <div
          className="fixed inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute left-[max(50%,25rem)] top-0 h-[64rem] w-[64rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-[48rem] w-[48rem] -translate-x-1/4 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -left-48 top-1/4 h-[56rem] w-[56rem] -translate-x-1/4 -translate-y-1/2 rounded-full bg-chart-3/10 blur-3xl" />
          <div className="absolute -right-48 bottom-0 h-[56rem] w-[56rem] translate-x-1/4 translate-y-1/2 rounded-full bg-chart-4/10 blur-3xl" />
          <div className="absolute left-1/2 bottom-1/4 h-[48rem] w-[48rem] -translate-x-1/2 translate-y-1/2 rounded-full bg-chart-5/10 blur-3xl" />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <AppLayout>
              <main className="flex-1">
                <PageTransition>{children}</PageTransition>
              </main>
            </AppLayout>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
