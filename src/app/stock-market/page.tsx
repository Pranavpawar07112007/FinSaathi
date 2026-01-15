
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getMarketNews, type MarketNewsItem } from '@/services/finnhub';
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react';
import Image from 'next/image';
import TradingViewWidget from '@/components/trading-view-widget';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

function StockMarketPage() {
  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleNewsCount, setVisibleNewsCount] = useState(4);

  useEffect(() => {
    async function fetchNews() {
      setIsLoading(true);
      const news = await getMarketNews('general');
      setMarketNews(news);
      setIsLoading(false);
    }
    fetchNews();
  }, []);

  const handleLoadMore = () => {
    setVisibleNewsCount(prevCount => prevCount + 2);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper />
            Stock Market
          </CardTitle>
          <CardDescription>
            Live market data and the latest news impacting stocks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full mb-8">
            <TradingViewWidget />
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-4">Market News</h2>
          {isLoading ? (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="flex flex-col">
                        <div className="relative h-40 w-full bg-muted rounded-t-lg"></div>
                        <CardHeader>
                            <div className="h-5 bg-muted rounded w-3/4"></div>
                             <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <div className="h-4 bg-muted rounded w-full mb-2"></div>
                              <div className="h-4 bg-muted rounded w-5/6"></div>
                        </CardContent>
                        <CardFooter>
                             <div className="h-5 bg-muted rounded w-24"></div>
                        </CardFooter>
                    </Card>
                ))}
             </div>
          ) : marketNews && marketNews.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {marketNews.slice(0, visibleNewsCount).map((newsItem: MarketNewsItem) => (
                <Card key={newsItem.id} className="flex flex-col">
                  {newsItem.image ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={newsItem.image}
                        alt={newsItem.headline}
                        fill
                        style={{objectFit: "cover"}}
                        className="rounded-t-lg"
                      />
                    </div>
                  ) : (
                     <div className="relative h-40 w-full bg-muted rounded-t-lg flex items-center justify-center">
                        <Newspaper className="size-10 text-muted-foreground"/>
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
          
          {!isLoading && visibleNewsCount < marketNews.length && (
            <div className="mt-8 flex justify-center">
              <Button onClick={handleLoadMore}>
                <Loader2 className="mr-2 h-4 w-4" />
                Load More News
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default StockMarketPage;
