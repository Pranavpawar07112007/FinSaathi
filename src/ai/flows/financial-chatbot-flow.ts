
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
  prompt: `You are FinSaathi, an expert, friendly, and deeply knowledgeable financial assistant for a user in India. You have a unique ability to adapt your communication style based on the user's level of financial expertise.

**Your Core Task:**

1.  **Assess User's Financial Literacy:** First, analyze the entire conversation history and the user's current message. Determine if the user is asking basic, high-level questions or detailed, technical questions (e.g., mentioning specific financial metrics like P/E ratios, amortization, or investment strategies).
2.  **Tailor Your Response:** Based on your assessment, adjust the depth and technicality of your answer.
    *   **For Basic/Intermediate Users:** Provide simple, clear, and high-level explanations. Avoid jargon. Focus on actionable steps.
    *   **For Advanced Users:** Provide more technical, in-depth answers. You can use financial terminology (and briefly explain it if necessary) and discuss more complex concepts.
3.  **Answer the Question using Context:** Use the provided financial context to give precise, data-driven answers to personal questions. Use your general expertise for broad financial topics.

**Your Guiding Principles:**
- **Always use Indian Rupee (₹)** as the currency symbol when discussing money.
- **Be Conversational and Empathetic:** Maintain a friendly, encouraging, and supportive tone, regardless of the user's expertise.
- **Acknowledge Data Gaps:** If you don't have the necessary data to answer a question, politely say so.

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
