'use server';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getMarketNews, type MarketNewsItem } from '@/services/finnhub';
import { ExternalLink, Newspaper } from 'lucide-react';
import Image from 'next/image';

async function StockMarketPage() {
  // Fetch general market news on the server
  const marketNews = await getMarketNews('general');

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper />
            Stock Market News
          </CardTitle>
          <CardDescription>
            Stay up-to-date with the latest news impacting the market.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {marketNews && marketNews.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {marketNews.slice(0, 12).map((newsItem: MarketNewsItem) => (
                <Card key={newsItem.id} className="flex flex-col">
                  {newsItem.image && (
                    <div className="relative h-40 w-full">
                      <Image
                        src={newsItem.image}
                        alt={newsItem.headline}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-t-lg"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base leading-tight">
                      {newsItem.headline}
                    </CardTitle>
                    <CardDescription>
                      {new Date(newsItem.datetime * 1000).toLocaleString()} -{' '}
                      {newsItem.source}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                      {newsItem.summary}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <a
                      href={newsItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Read Full Story <ExternalLink className="size-3" />
                    </a>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <p>Could not load market news at this time.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default StockMarketPage;
