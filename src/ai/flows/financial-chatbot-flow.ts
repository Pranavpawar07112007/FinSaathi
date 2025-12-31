
'use server';
/**
 * @fileOverview A conversational AI chatbot for personalized financial questions.
 *
 * - chatWithFinSaathi - A function that handles a single turn in the conversation.
 * - ChatInput - The input type for the function.
 * - ChatOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe("The user's message to the chatbot."),
  history: z
    .array(z.object({ user: z.string(), model: z.string() }))
    .describe('The previous conversation history.'),
  financialContext: z
    .string()
    .describe(
      'A JSON string containing the user\'s financial data (transactions, goals, debts, etc.).'
    ),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user's message."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chatWithFinSaathi(
  input: ChatInput
): Promise<ChatOutput> {
  return financialChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialChatbotPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema, format: 'json' },
  prompt: `You are FinSaathi, an expert, friendly, and deeply knowledgeable financial assistant for a user in India. Your primary role is to help the user understand their finances and make smarter financial decisions.

You have two core capabilities:

1.  **Personalized Financial Analysis:** You have access to the user's real-time financial data (transactions, budgets, goals, debts, etc.). When the user asks a question about their own finances (e.g., "How much did I spend on groceries last month?", "What's my highest interest debt?"), you MUST use the provided financial context to give a precise, data-driven answer.

2.  **General Financial Expertise:** You are also an expert on general financial topics relevant to India. This includes, but is not limited to, investment options (stocks, mutual funds, FDs), debt management strategies (like avalanche vs. snowball), and general best practices for personal finance. When asked a general question, you should provide accurate, helpful, and up-to-date information.

**Your Guiding Principles:**
- **Always use Indian Rupee (₹)** as the currency symbol when discussing money.
- **Be Conversational and Empathetic:** Talk to the user in a friendly, encouraging, and supportive tone.
- **Be Data-Driven:** For personal questions, ground your answers in the user's data. For general questions, rely on your broad financial knowledge.
- **Be Concise but Thorough:** Get to the point, but don't leave out important details. Use formatting like lists or bold text to make your answers easy to read.
- **Acknowledge Data Gaps:** If the user asks a personal question and the necessary data isn't in the context, politely state that you don't have that information. For example: "I can't see your transaction history from before this year, but based on what I have..."

USER'S FINANCIAL CONTEXT:
\`\`\`json
{{{financialContext}}}
\`\`\`

CONVERSATION HISTORY:
{{#each history}}
User: {{{this.user}}}
FinSaathi: {{{this.model}}}
{{/each}}

CURRENT USER MESSAGE:
{{{message}}}
`,
});

const financialChatbotFlow = ai.defineFlow(
  {
    name: 'financialChatbotFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a response.');
    }
    return output;
  }
);
