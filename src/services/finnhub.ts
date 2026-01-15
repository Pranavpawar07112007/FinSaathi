
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
 * @returns A promise that resolves to an array of news items.
 */
export async function getMarketNews(
  category: string
): Promise<MarketNewsItem[]> {
  if (!FINNHUB_API_KEY) {
    console.error('Finnhub API key is not configured.');
    return [];
  }

  try {
    const url = `${FINNHUB_BASE_URL}/news?category=${category}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.statusText}`);
      return [];
    }

    const news = await response.json();
    return news as MarketNewsItem[];
  } catch (error) {
    console.error('Error fetching market news from Finnhub:', error);
    return [];
  }
}
