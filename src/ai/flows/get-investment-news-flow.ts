
'use server';
/**
 * @fileOverview An AI agent for fetching and summarizing news about a user's investments, classifying them as opportunities or risks.
 *
 * - getInvestmentNews - A function that handles the news fetching and summarization.
 * - GetInvestmentNewsInput - The input type for the function.
 * - GetInvestmentNewsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getMarketNews, type MarketNewsItem } from '@/services/finnhub';
import { Part, GenerationResponse, Candidate } from '@genkit-ai/google-genai';

const GetInvestmentNewsInputSchema = z.object({
  investmentNames: z
    .array(z.string())
    .describe('A list of investment names from the user\'s portfolio (e.g., "Reliance Industries", "Bitcoin").'),
});
export type GetInvestmentNewsInput = z.infer<
  typeof GetInvestmentNewsInputSchema
>;

const NewsItemSchema = z.object({
  investmentName: z.string().describe('The name of the investment this news is about.'),
  headline: z.string().describe('A relevant, recent news headline.'),
  summary: z.string().describe('A one or two-sentence summary of the news article and its potential impact on the investment.'),
  source: z.string().describe('The name of the news source (e.g., "The Economic Times").'),
  url: z.string().url().describe('The URL to the original news article.'),
  alertType: z.enum(['Opportunity', 'Risk', 'Neutral']).describe('The classification of the news as an Opportunity, Risk, or Neutral event for the investor.'),
});

const GetInvestmentNewsOutputSchema = z.object({
  news: z
    .array(NewsItemSchema)
    .describe('A list of recent news items relevant to the user\'s investments, classified as alerts.'),
});
export type GetInvestmentNewsOutput = z.infer<
  typeof GetInvestmentNewsOutputSchema
>;


const getMarketNewsForTicker = ai.defineTool(
    {
      name: 'getMarketNewsForTicker',
      description: 'Get the latest market news for a given stock ticker symbol.',
      inputSchema: z.object({
        ticker: z.string().describe('The stock ticker symbol (e.g., "AAPL", "RELIANCE.NS").'),
      }),
      outputSchema: z.array(z.object({
          headline: z.string(),
          summary: z.string(),
          url: z.string(),
          source: z.string(),
          image: z.string(),
      })),
    },
    async ({ ticker }) => getMarketNews(ticker)
);

export async function getInvestmentNews(
  input: GetInvestmentNewsInput
): Promise<GetInvestmentNewsOutput> {
  return getInvestmentNewsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getInvestmentNewsPrompt',
  input: { schema: GetInvestmentNewsInputSchema },
  output: { schema: GetInvestmentNewsOutputSchema },
  tools: [getMarketNewsForTicker],
  system: `You are a financial news analyst. Your task is to find the single most relevant and recent news headline for each of the following investments and classify it as a potential opportunity, risk, or neutral event for the investor.
  
  For each investment, you MUST use the getMarketNewsForTicker tool. You will need to infer the stock ticker from the investment name. For Indian stocks, append '.NS'. For others, use the US ticker.
  
  From the news returned by the tool, select the most impactful article. Then, provide the headline, a brief summary, the source, a valid URL, and an 'alertType'.
  - **Opportunity**: The news suggests positive future performance (e.g., new product launch, favorable regulation).
  - **Risk**: The news suggests potential negative performance (e.g., regulatory trouble, poor earnings).
  - **Neutral**: The news is informational but not strongly positive or negative.

  Investments:
  {{#each investmentNames}}
  - {{{this}}}
  {{/each}}

  Return the results in the specified JSON format. If you cannot find relevant news for an investment, omit it from the list.`,
});

const getInvestmentNewsFlow = ai.defineFlow(
  {
    name: 'getInvestmentNewsFlow',
    inputSchema: GetInvestmentNewsInputSchema,
    outputSchema: GetInvestmentNewsOutputSchema,
  },
  async (input) => {
    // If there are no investments, return an empty array to avoid calling the AI unnecessarily.
    if (!input.investmentNames || input.investmentNames.length === 0) {
      return { news: [] };
    }

    const response = await prompt(input);
    const toolResponsePart = response.candidates[0].message.content.parts.find(
      (part) => 'toolResponse' in part
    );

    if (toolResponsePart && 'toolResponse' in toolResponsePart) {
      const toolResponse = toolResponsePart.toolResponse;
      if (Array.isArray(toolResponse.parts)) {
        const output = toolResponse.parts.reduce(
          (acc: GetInvestmentNewsOutput, part: any) => {
            if (part?.toolResponse?.name === 'getInvestmentNews' && part?.toolResponse?.output) {
              acc.news.push(...(part.toolResponse.output as any).news);
            }
            return acc;
          }, { news: [] });
        return output;
      }
    }

    const output = response.output();
    if (!output) {
      // If the AI fails to generate, return an empty array to prevent crashing.
      console.warn("AI failed to generate investment news. Returning empty array.");
      return { news: [] };
    }
    return output;
  }
);
