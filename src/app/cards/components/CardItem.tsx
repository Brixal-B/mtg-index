'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MTGCard } from '@/lib/types';
import { Star, Plus, Eye, DollarSign } from 'lucide-react';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/utils/localStorage';

interface CardItemProps {
  card: MTGCard;
  onClick?: () => void;
  showActions?: boolean;
}

const rarityColors = {
  common: 'border-gray-400 bg-gray-50',
  uncommon: 'border-gray-600 bg-gray-100',
  rare: 'border-yellow-500 bg-yellow-50',
  mythic: 'border-orange-500 bg-orange-50',
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

  const price = card.prices.usd || card.prices.eur || 0;
  const formattedPrice = price > 0 ? `$${price.toFixed(2)}` : 'N/A';

  return (
    <div
      className={`group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${
        rarityColors[card.rarity]
      }`}
      onClick={onClick}
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
              <div className="text-xs">{card.set.toUpperCase()}</div>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
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
          <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2">
            {card.name}
          </h3>
          <div className="text-xs text-muted-foreground">
            {card.setName} • {card.rarity}
          </div>
        </div>

        {/* Mana Cost */}
        {card.manaCost && (
          <div className="text-sm">
            <span className="text-muted-foreground">Mana: </span>
            <span className="font-mono">{formatManaCost(card.manaCost)}</span>
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
            </span>
          </div>
          
          {isWatched && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
        </div>

        {/* Type Line */}
        <div className="text-xs text-muted-foreground line-clamp-1">
          {card.type}
        </div>
      </div>
    </div>
  );
}






