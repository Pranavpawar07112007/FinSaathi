'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Bot,
  PieChart,
  Target,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  BarChart,
  Banknote,
  Languages,
  Briefcase,
  Repeat,
  Newspaper,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const features = [
  {
    icon: <Bot className="size-10 text-primary" />,
    title: 'AI Financial Advice',
    description:
      'Get personalized, data-driven advice. Ask questions in plain language and get insights on your spending, savings, and investments.',
  },
  {
    icon: <PieChart className="size-10 text-primary" />,
    title: 'Smart Budgeting',
    description:
      'Effortlessly track your income and expenses, and create budgets that work for you and visualize where your money is going.',
  },
  {
    icon: <Banknote className="size-10 text-primary" />,
    title: 'Debt Pay-down Planner',
    description:
      'Generate a personalized, step-by-step plan using Avalanche or Snowball methods to become debt-free faster.',
  },
  {
    icon: <Newspaper className="size-10 text-primary" />,
    title: 'Live Market Data',
    description: 'Stay on top of market trends with live stock charts and the latest financial news impacting your portfolio.',
  },
   {
    icon: <Languages className="size-10 text-primary" />,
    title: 'Multilingual Support',
    description:
      'Access all features in your preferred language. FinSaathi supports a wide range of Indian regional languages.',
  },
  {
    icon: <Target className="size-10 text-primary" />,
    title: 'Goal Tracking',
    description:
        'Set and track your savings goals, from a vacation fund to a down payment, and stay motivated to achieve them.',
  },
  {
    icon: <Briefcase className="size-10 text-primary" />,
    title: 'Investment Portfolio',
    description:
        'Manage all your investments, from stocks and crypto to fixed deposits, in one consolidated view.',
  },
  {
    icon: <Repeat className="size-10 text-primary" />,
    title: 'Subscription Management',
    description:
        'Let the AI automatically detect your recurring subscriptions and bills, so you never miss a payment or forget a trial.',
  },
  {
    icon: <ShieldCheck className="size-10 text-primary" />,
    title: 'Tax Center',
    description:
        'The AI automatically flags potentially tax-deductible expenses, collecting them in one place for easy tax filing.',
  },
];

const animatedFeatures = [
  {
    value: 'chat',
    title: 'AI Chatbot',
    icon: MessageSquare,
    image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=800',
    description:
      'Ask complex financial questions in plain language and get instant, data-driven answers.',
  },
  {
    value: 'analytics',
    title: 'Deep Analytics',
    icon: BarChart,
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    description:
      'Visualize your spending habits, track your income, and see your financial progress over time.',
  },
];

// Reusable component for scroll-triggered animations
function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate={controls}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const headlineText = 'Meet FinSaathi, Your AI Financial Companion';
  const sentence = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.5,
        staggerChildren: 0.04,
      },
    },
  };
  const letter = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center gap-6 px-4 py-20 text-center md:py-32 overflow-hidden">
        <div className="max-w-3xl text-foreground">
          <motion.h1
            className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl"
            variants={sentence}
            initial="hidden"
            animate="visible"
          >
            {headlineText.split('').map((char, index) => (
              <motion.span key={char + '-' + index} variants={letter}>
                {char}
              </motion.span>
            ))}
            <span className="text-primary">.</span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.5 }}
          >
            Take control of your finances with intelligent tracking,
            personalized advice, and seamless management of your entire
            financial life.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.5 }}
        >
          <Button asChild size="lg">
            <Link href="/dashboard">
              Get Started Free <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Animated Feature Showcase */}
      <AnimatedSection>
        <section className="container mx-auto px-4 py-20 md:px-6 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              A Smarter Way to Manage Your Money
            </h2>
            <p className="mt-2 text-muted-foreground md:text-lg">
              FinSaathi is packed with intelligent features to simplify your
              financial life.
            </p>
          </div>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
              {animatedFeatures.map((feature) => (
                <TabsTrigger
                  key={feature.value}
                  value={feature.value}
                  className="gap-2"
                >
                  <feature.icon className="size-4" /> {feature.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {animatedFeatures.map((feature) => (
              <TabsContent key={feature.value} value={feature.value}>
                <Card className="mt-6 overflow-hidden">
                  <div className="grid md:grid-cols-2">
                    <div className="p-8 flex flex-col justify-center">
                      <h3 className="text-2xl font-semibold mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <div className="relative h-64 md:h-full min-h-[250px]">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        layout="fill"
                        objectFit="cover"
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </section>
      </AnimatedSection>

      {/* How It Works Section */}
      <AnimatedSection>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Get Started in 3 Simple Steps
              </h2>
              <p className="mt-2 text-muted-foreground md:text-lg">
                Take control of your finances in minutes.
              </p>
            </div>
            <div className="grid gap-12 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 inline-block rounded-full bg-primary/10 p-4 text-primary">
                  <span className="text-3xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold">
                  Consolidate Your Finances
                </h3>
                <p className="text-muted-foreground mt-2">
                  Securely add your transactions and link your accounts for a
                  complete financial picture.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-block rounded-full bg-primary/10 p-4 text-primary">
                  <span className="text-3xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold">Get AI-Powered Insights</h3>
                <p className="text-muted-foreground mt-2">
                  FinSaathi analyzes your data to generate a Financial Wellness
                  Score and provide personalized advice.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-block rounded-full bg-primary/10 p-4 text-primary">
                  <span className="text-3xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold">Act and Save</h3>
                <p className="text-muted-foreground mt-2">
                  Use the AI Chatbot, Debt Planner, and Goal Tracker to make
                  smarter decisions and achieve your financial goals faster.
                </p>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Comparison Table Section */}
      <AnimatedSection>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                The FinSaathi Advantage
              </h2>
              <p className="mt-2 text-muted-foreground md:text-lg">
                A smarter approach to financial management.
              </p>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-lg">The Old Way</TableHead>
                    <TableHead className="text-lg text-primary">
                      The FinSaathi Way
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Manual expense entry</TableCell>
                    <TableCell>
                      Upload a statement; AI does the work.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Guessing at budgets</TableCell>
                    <TableCell>
                      AI analyzes spending and suggests budgets.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Paying the listed price on bills</TableCell>
                    <TableCell>
                      AI generates a script to help you negotiate.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Static charts and reports</TableCell>
                    <TableCell>
                      Ask complex financial questions in plain English.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Manually calculating debt payoffs</TableCell>
                    <TableCell>
                      AI generates a step-by-step debt pay-down plan.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Vague ideas for savings goals</TableCell>
                    <TableCell>
                      Describe a goal; AI creates it with a target amount.
                    </TableCell>
                  </TableRow>
                   <TableRow>
                    <TableCell>Sorting through expenses for taxes</TableCell>
                    <TableCell>
                      AI automatically flags potential tax deductions.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </section>
      </AnimatedSection>

      {/* Features Section */}
      <AnimatedSection>
        <section className="container mx-auto px-4 py-20 md:px-6 md:py-32">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Why FinSaathi is Different
            </h2>
            <p className="mt-2 text-muted-foreground md:text-lg">
              We go beyond simple tracking to provide a truly intelligent
              financial partner.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <Card className="flex flex-col text-center h-full">
                  <CardHeader className="items-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* Trust & Security Section */}
      <AnimatedSection>
        <section className="py-20 md:py-32">
          <div className="container mx-auto grid items-center gap-12 px-4 md:grid-cols-2 md:px-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Your Data, Your Control
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                FinSaathi is built on a foundation of privacy and security. We
                use industry-leading Firebase services to protect your data,
                ensuring it remains yours and yours alone. You have complete
                control over your information.
              </p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-green-500" />
                  <span className="font-medium">Bank-Level Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-green-500" />
                  <span className="font-medium">Privacy First</span>
                </div>
              </div>
            </div>
            <Image
              src="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxjeWJlciUyMHNlY3VyaXR5fGVufDB8fHx8MTc2MzgwNDY2OXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Cyber security"
              width={800}
              height={600}
              className="rounded-xl object-cover shadow-lg"
            />
          </div>
        </section>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Image src="/favicon.ico" alt="FinSaathi Logo" width={24} height={24} />
            <span className="">FinSaathi</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Made by Team NEURALNEXUS
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FinSaathi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
