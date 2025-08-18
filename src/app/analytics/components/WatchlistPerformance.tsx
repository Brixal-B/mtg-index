'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, TrendingUp, TrendingDown, Eye, AlertCircle } from 'lucide-react';
import { MTGCard } from '@/lib/types';
import { getWatchlist, removeFromWatchlist } from '@/lib/utils/localStorage';
import { getCard } from '@/lib/api/scryfall';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { marketDataService } from '@/lib/services/marketDataService';

interface WatchlistPerformanceProps {
  timeframe: '7d' | '30d' | '90d' | '1y';
}

interface WatchlistCardData {
  card: MTGCard;
  priceChange: number;
  priceChangePercent: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  confidence: number;
}

export function WatchlistPerformance({ timeframe }: WatchlistPerformanceProps) {
  const [watchlistCards, setWatchlistCards] = useState<WatchlistCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWatchlistData = async () => {
      try {
        setLoading(true);
        setError(null);

        const watchlistIds = getWatchlist();
        if (watchlistIds.length === 0) {
          setWatchlistCards([]);
          return;
        }

        // Generate realistic market trends for context
        const marketTrends = marketDataService.generateMarketTrends(timeframe);

        // Load card data for watchlist items
        const cardPromises = watchlistIds.slice(0, 10).map(async (cardId) => {
          try {
            const card = await getCard(cardId);
            
            // Use the market data service for realistic price simulation
            const priceSimulation = marketDataService.simulateCardPriceChange(
              card, 
              timeframe, 
              marketTrends
            );

            return {
              card,
              priceChange: priceSimulation.priceChange,
              priceChangePercent: priceSimulation.priceChangePercent,
              trend: priceSimulation.trend,
              volatility: priceSimulation.volatility,
              confidence: priceSimulation.confidence,
            };
          } catch (err) {
            console.error(`Error loading card ${cardId}:`, err);
            return null;
          }
        });

        const results = await Promise.all(cardPromises);
        const validCards = results.filter((card): card is WatchlistCardData => card !== null);
        
        // Sort by price change percentage
        validCards.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
        
        setWatchlistCards(validCards);
      } catch (err) {
        console.error('Error loading watchlist:', err);
        setError('Failed to load watchlist data');
      } finally {
        setLoading(false);
      }
    };

    loadWatchlistData();
  }, [timeframe]);

  const handleRemoveFromWatchlist = (cardId: string) => {
    removeFromWatchlist(cardId);
    setWatchlistCards(prev => prev.filter(item => item.card.id !== cardId));
  };

  const timeframeLabel = {
    '7d': '7 days',
    '30d': '30 days', 
    '90d': '90 days',
    '1y': '1 year'
  }[timeframe];

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">Watchlist Performance</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Track price changes for cards you&apos;re watching over {timeframeLabel}
          </p>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">Watchlist Performance</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (watchlistCards.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">Watchlist Performance</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Track price changes for cards you&apos;re watching over {timeframeLabel}
          </p>
        </div>
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-md font-medium text-foreground mb-2">No cards in watchlist</h4>
          <p className="text-sm text-muted-foreground">
            Add cards to your watchlist from the card browser to track their performance.
          </p>
        </div>
      </div>
    );
  }

  const avgPerformance = watchlistCards.reduce((sum, item) => sum + item.priceChangePercent, 0) / watchlistCards.length;
  const gainers = watchlistCards.filter(item => item.trend === 'up').length;
  const losers = watchlistCards.filter(item => item.trend === 'down').length;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-foreground">Watchlist Performance</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Price changes for {watchlistCards.length} cards over {timeframeLabel}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-accent rounded-lg">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Avg Change</p>
          <p className={`text-lg font-semibold ${
            avgPerformance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {avgPerformance >= 0 ? '+' : ''}{avgPerformance.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Gainers</p>
          <p className="text-lg font-semibold text-green-600">{gainers}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Losers</p>
          <p className="text-lg font-semibold text-red-600">{losers}</p>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {watchlistCards.map((item) => {
          const isPositive = item.priceChangePercent >= 0;
          const TrendIcon = item.trend === 'up' ? TrendingUp : 
                           item.trend === 'down' ? TrendingDown : 
                           null;

          return (
            <div 
              key={item.card.id}
              className="flex items-center space-x-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
            >
              {/* Card Image */}
              <div className="w-10 h-14 bg-muted rounded border flex-shrink-0">
                {item.card.imageUrl ? (
                  <Image
                    src={item.card.imageUrl}
                    alt={item.card.name}
                    width={40}
                    height={56}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center p-1">
                    {item.card.name.substring(0, 8)}
                  </div>
                )}
              </div>

              {/* Card Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate text-sm">
                  {item.card.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {item.card.setName}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Current: ${(item.card.prices.usd || 0).toFixed(2)}
                  </span>
                  {TrendIcon && (
                    <TrendIcon className={`h-3 w-3 ${
                      item.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`} />
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}${item.priceChange.toFixed(2)}
                </div>
                <div className={`text-xs ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{item.priceChangePercent.toFixed(1)}%
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveFromWatchlist(item.card.id)}
                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                title="Remove from watchlist"
              >
                <Star className="h-4 w-4 fill-current" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}







