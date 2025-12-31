'use server';

import {
  chatWithFinSaathi,
  type ChatInput,
} from '@/ai/flows/financial-chatbot-flow';
import { z } from 'zod';

const formSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
  history: z.string().optional(), // JSON string of the history
  financialContext: z.string().optional(),
});

type State = {
  response?: string | null;
  error?: string | null;
};

export async function getChatbotResponseAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = formSchema.safeParse({
    message: formData.get('message'),
    history: formData.get('history'),
    financialContext: formData.get('financialContext'),
  });

  if (!validatedFields.success) {
    return {
      error: 'Invalid submission. Please try again.',
    };
  }

  const { message, history, financialContext } = validatedFields.data;

  try {
    const parsedHistory = history ? JSON.parse(history) : [];
    const input: ChatInput = {
      message,
      history: parsedHistory,
      financialContext:
        financialContext || 'No financial data provided to the chatbot.',
    };

    const result = await chatWithFinSaathi(input);
    return { response: result.response };
  } catch (error) {
    console.error('AI Error in getChatbotResponseAction:', error);
    return {
      error:
        'Failed to get a response from the AI. The service may be temporarily unavailable.',
    };
  }
}
