
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="CNdBodxAAPeBe5ExemyFQNf-XYfsFWpd9nxiP67WFj0" />
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
          <div className="absolute -top-16 -left-16 h-[13rem] w-[13rem] rounded-full bg-primary/20 blur-3xl animate-move-circle-1" />
          <div className="absolute -bottom-16 -right-16 h-[13rem] w-[13rem] rounded-full bg-accent/20 blur-3xl animate-move-circle-2" />
          <div className="absolute top-1/2 left-1/2 h-[12rem] w-[12rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-3/20 blur-3xl animate-move-circle-3" />
          <div className="absolute -bottom-24 left-1/4 h-[11rem] w-[11rem] rounded-full bg-chart-4/20 blur-3xl animate-move-circle-4" />
          <div className="absolute -top-24 right-1/4 h-[11rem] w-[11rem] rounded-full bg-chart-5/20 blur-3xl animate-move-circle-5" />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
            <FirebaseClientProvider>
              <AppLayout>
                <main className="flex-1 overflow-x-hidden">
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
