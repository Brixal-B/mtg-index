'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { Portfolio, PortfolioCard } from '@/lib/types';

interface TopPerformersTableProps {
  portfolios: Portfolio[];
  type: 'best' | 'worst';
}

interface CardPerformance {
  portfolioCard: PortfolioCard;
  gainLoss: number;
  gainLossPercent: number;
  currentValue: number;
  totalCost: number;
}

export function TopPerformersTable({ portfolios, type }: TopPerformersTableProps) {
  const performers = useMemo(() => {
    const allCards = portfolios.flatMap(p => p.cards);
    
    const cardPerformances: CardPerformance[] = allCards.map(card => {
      const currentPrice = card.card.prices.usd || 0;
      const currentValue = currentPrice * card.quantity;
      const totalCost = card.purchasePrice * card.quantity;
      const gainLoss = currentValue - totalCost;
      const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

      return {
        portfolioCard: card,
        gainLoss,
        gainLossPercent,
        currentValue,
        totalCost,
      };
    });

    // Sort by gain/loss
    const sorted = cardPerformances.sort((a, b) => 
      type === 'best' ? b.gainLoss - a.gainLoss : a.gainLoss - b.gainLoss
    );

    return sorted.slice(0, 5); // Top 5
  }, [portfolios, type]);

  const title = type === 'best' ? 'Top Performers' : 'Worst Performers';
  const icon = type === 'best' ? TrendingUp : TrendingDown;
  const IconComponent = icon;

  if (performers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <IconComponent className={`h-5 w-5 ${type === 'best' ? 'text-green-500' : 'text-red-500'}`} />
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Cards with {type === 'best' ? 'highest' : 'lowest'} returns in your portfolio
          </p>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          No cards available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <IconComponent className={`h-5 w-5 ${type === 'best' ? 'text-green-500' : 'text-red-500'}`} />
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cards with {type === 'best' ? 'highest' : 'lowest'} returns in your portfolio
        </p>
      </div>

      <div className="space-y-3">
        {performers.map((performer, index) => {
          const card = performer.portfolioCard;
          const isPositive = performer.gainLoss >= 0;

          return (
            <div 
              key={`${card.cardId}-${card.foil}-${card.condition}`}
              className="flex items-center space-x-3 p-3 rounded-lg bg-accent/50"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}
                </span>
              </div>

              {/* Card Image */}
              <div className="w-10 h-14 bg-muted rounded border flex-shrink-0">
                {card.card.imageUrl ? (
                  <Image
                    src={card.card.imageUrl}
                    alt={card.card.name}
                    width={40}
                    height={56}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center p-1">
                    {card.card.name.substring(0, 8)}
                  </div>
                )}
              </div>

              {/* Card Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-foreground truncate text-sm">
                      {card.card.name}
                      {card.foil && (
                        <Star className="inline h-3 w-3 text-yellow-500 ml-1" />
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {card.card.setName} • Qty: {card.quantity}
                    </p>
                    <div className="flex items-center space-x-3 mt-1 text-xs">
                      <span className="text-muted-foreground">
                        Purchased: ${card.purchasePrice.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        Current: ${(card.card.prices.usd || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}${performer.gainLoss.toFixed(2)}
                </div>
                <div className={`text-xs ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{performer.gainLossPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${performer.currentValue.toFixed(2)} total
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {type === 'best' ? 'Best' : 'Worst'} card: 
            <span className={`ml-1 font-medium ${
              type === 'best' ? 'text-green-600' : 'text-red-600'
            }`}>
              {performers[0]?.gainLoss >= 0 ? '+' : ''}${performers[0]?.gainLoss.toFixed(2)} 
              ({performers[0]?.gainLossPercent >= 0 ? '+' : ''}{performers[0]?.gainLossPercent.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}





