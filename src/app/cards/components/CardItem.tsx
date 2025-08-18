'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MTGCard } from '@/lib/types';
import { Star, Plus, Eye, DollarSign } from 'lucide-react';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/utils/localStorage';
import { usePriceTrends } from '@/lib/hooks/usePriceTrends';
import { CompactPriceTrend } from '@/app/components/PriceTrendIndicator';

interface CardItemProps {
  card: MTGCard;
  onClick?: (card: MTGCard) => void;
  showActions?: boolean;
}

const rarityColors = {
  common: 'border-gray-400 bg-gray-50',
  uncommon: 'border-gray-600 bg-gray-100',
  rare: 'border-yellow-500 bg-yellow-50',
  mythic: 'border-orange-500 bg-orange-50',
};

const rarityTextColors = {
  common: 'text-gray-600',
  uncommon: 'text-gray-700',
  rare: 'text-yellow-600',
  mythic: 'text-orange-600',
};

const manaCostSymbols: Record<string, string> = {
  '{W}': '⚪',
  '{U}': '🔵',
  '{B}': '⚫',
  '{R}': '🔴',
  '{G}': '🟢',
  '{C}': '◇',
  '{X}': 'X',
};

function formatManaCost(manaCost: string = ''): string {
  let formatted = manaCost;
  Object.entries(manaCostSymbols).forEach(([symbol, replacement]) => {
    formatted = formatted.replace(new RegExp(symbol.replace(/[{}]/g, '\\$&'), 'g'), replacement);
  });
  // Replace generic mana costs like {1}, {2}, etc.
  formatted = formatted.replace(/\{(\d+)\}/g, '$1');
  return formatted;
}

export function CardItem({ card, onClick, showActions = true }: CardItemProps) {
  const [isWatched, setIsWatched] = useState(isInWatchlist(card.id));
  const [imageError, setImageError] = useState(false);
  
  // Fetch price trends for this card
  const { trends, loading: trendsLoading, isUsingMockData } = usePriceTrends(card.id, {
    enabled: true // Enable trend fetching for all cards
  });

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isWatched) {
      removeFromWatchlist(card.id);
      setIsWatched(false);
    } else {
      addToWatchlist(card.id);
      setIsWatched(true);
    }
  };

  const handleAddToPortfolio = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement add to portfolio functionality
    console.log('Add to portfolio:', card.name);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(card);
    }
  };

  // Enhanced price display with foil fallback
  const regularPrice = card.prices.usd || card.prices.eur;
  const foilPrice = card.prices.usdFoil || card.prices.eurFoil;
  
  let price = 0;
  let isUsingFoilPrice = false;
  
  if (regularPrice && regularPrice > 0) {
    price = regularPrice;
  } else if (foilPrice && foilPrice > 0) {
    price = foilPrice;
    isUsingFoilPrice = true;
  }
  
  const formattedPrice = price > 0 ? `$${price.toFixed(2)}` : 'N/A';

  return (
    <div
      className={`group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer ${
        rarityColors[card.rarity]
      }`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      data-testid="card-item"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Card Image */}
      <div className="aspect-[5/7] relative bg-muted">
        {card.imageUrl && !imageError ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
            <div className="text-center p-4">
              <div className="text-sm font-medium mb-1">{card.name}</div>
              <div className="text-xs">{card.setCode.toUpperCase()}</div>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4 text-white" />
            </button>
            
            {showActions && (
              <>
                <button
                  onClick={handleWatchlistToggle}
                  className={`p-2 backdrop-blur-sm rounded-full transition-colors ${
                    isWatched
                      ? 'bg-yellow-500/80 hover:bg-yellow-500'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                  title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  aria-label={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  <Star className={`h-4 w-4 ${isWatched ? 'text-white fill-current' : 'text-white'}`} />
                </button>
                
                <button
                  onClick={handleAddToPortfolio}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                  title="Add to Portfolio"
                >
                  <Plus className="h-4 w-4 text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3 space-y-2">
        <div className="space-y-1">
          <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2 truncate">
            {card.name}
          </h3>
          <div className="text-xs text-muted-foreground">
            {card.setName} • <span className={rarityTextColors[card.rarity]}>{card.rarity}</span>
          </div>
        </div>

        {/* Mana Cost */}
        {card.manaCost && (
          <div className="text-sm">
            <span className="text-muted-foreground">Mana: </span>
            <span className="font-mono">{formatManaCost(card.manaCost)}</span>
          </div>
        )}

        {/* Power/Toughness for creatures */}
        {card.power && card.toughness && (
          <div className="text-sm">
            <span className="text-muted-foreground">P/T: </span>
            <span className="font-medium">{card.power}/{card.toughness}</span>
          </div>
        )}

        {/* Loyalty for planeswalkers */}
        {card.loyalty && (
          <div className="text-sm">
            <span className="text-muted-foreground">Loyalty: </span>
            <span className="font-medium">{card.loyalty}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className={`text-sm font-medium ${
              price > 0 ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {formattedPrice}
              {isUsingFoilPrice && price > 0 && (
                <span className="text-xs text-muted-foreground ml-1">(Foil)</span>
              )}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Price trend indicator */}
            {!trendsLoading && trends?.trend7d && (
              <div className="flex items-center space-x-1">
                <CompactPriceTrend 
                  trend={trends.trend7d} 
                  timeframe="7d"
                  className="opacity-80"
                />
                {isUsingMockData && (
                  <div 
                    className="px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200"
                    title="Demo data - API unavailable"
                  >
                    Demo
                  </div>
                )}
              </div>
            )}
            
            {isWatched && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
          </div>
        </div>

        {/* Price trend details (for cards with significant changes) */}
        {!trendsLoading && trends?.trend7d && Math.abs(trends.trend7d.changePercent) >= 10 && (
          <div className="text-xs text-muted-foreground">
            <span className={trends.trend7d.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
              {trends.trend7d.direction === 'up' ? '↗' : '↘'} 
              {Math.abs(trends.trend7d.changePercent).toFixed(0)}% this week
            </span>
            {trends.volatility?.volatilityLevel === 'high' && (
              <span className="ml-2 text-orange-600">• High volatility</span>
            )}
          </div>
        )}

        {/* Type Line */}
        <div className="text-xs text-muted-foreground line-clamp-1">
          {card.type}
        </div>
      </div>
    </div>
  );
}







