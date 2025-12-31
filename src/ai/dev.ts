
'use server';

import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

enableFirebaseTelemetry();

import '@/ai/flows/categorize-transaction-flow.ts';
import '@/ai/flows/generate-financial-overview.ts';
import '@/ai/flows/financial-advice-flow.ts';
import '@/ai/flows/detect-subscriptions-flow.ts';
import '@/ai/flows/financial-chatbot-flow.ts';
import '@/ai/flows/create-goal-from-text-flow.ts';
import '@/ai/flows/generate-debt-plan-flow.ts';
import '@/ai/flows/detect-tax-deductible-flow.ts'
import '@/ai/flows/get-investment-news-flow.ts';
import '@/ai/flows/import-transactions-flow.ts';
import '@/ai/flows/import-from-image-flow.ts';
import '@/ai/flows/import-from-pdf-flow.ts';
import '@/ai/flows/award-achievement-flow.ts';
import '@/ai/flows/generate-negotiation-script-flow.ts';
