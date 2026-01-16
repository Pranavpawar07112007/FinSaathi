
'use server';

export interface MarketNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetches market news from Finnhub.
 * @param category - The category of news to fetch (e.g., 'general', 'forex', 'crypto', 'merger').
 * @returns A promise that resolves to an object with news items and an optional error.
 */
export async function getMarketNews(
  category: string
): Promise<{ news: MarketNewsItem[]; error?: string }> {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'd5keajpr01qitje46aa0d5keajpr01qitje46aag') {
    const errorMsg = 'Finnhub API key is not configured or is invalid.';
    console.error(errorMsg);
    return { news: [], error: errorMsg };
  }

  try {
    const url = `${FINNHUB_BASE_URL}/news?category=${category}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Finnhub API error: ${response.status} ${response.statusText}. Response: ${errorText}`;
      console.error(errorMsg);
      return { news: [], error: `Could not connect to news service. Please check your API key.` };
    }

    const newsData = await response.json();
    if (!Array.isArray(newsData)) {
      const errorMsg = 'Unexpected response format from Finnhub API.';
      console.error(errorMsg, newsData);
      return { news: [], error: errorMsg };
    }
    return { news: newsData as MarketNewsItem[] };
  } catch (error) {
    const errorMsg = 'Network error fetching market news from Finnhub.';
    console.error(errorMsg, error);
    return { news: [], error: errorMsg };
  }
}
