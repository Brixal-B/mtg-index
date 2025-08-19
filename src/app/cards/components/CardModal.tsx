'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Star, Plus, DollarSign, TrendingUp, Calendar, Palette, Zap } from 'lucide-react';
import { MTGCard } from '@/lib/types';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage';
import { getPriceHistory } from '@/lib/api/scryfall';
import { EnhancedPriceChart } from '@/app/analytics/components/EnhancedPriceChart';

interface CardModalProps {
  card: MTGCard;
  isOpen: boolean;
  onClose: () => void;
}

interface PriceHistoryPoint {
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
}

export function CardModal({ card, isOpen, onClose }: CardModalProps) {
  const [isWatched, setIsWatched] = useState(isInWatchlist(card.id));
  const [imageError, setImageError] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && card.id) {
      setLoadingHistory(true);
      getPriceHistory(card.id)
        .then(setPriceHistory)
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, card.id]);

  const handleWatchlistToggle = () => {
    if (isWatched) {
      removeFromWatchlist(card.id);
      setIsWatched(false);
    } else {
      addToWatchlist(card.id);
      setIsWatched(true);
    }
  };

  const handleAddToPortfolio = () => {
    // TODO: Implement add to portfolio functionality
    console.log('Add to portfolio:', card.name);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const price = card.prices.usd || card.prices.eur || 0;
  const foilPrice = card.prices.usdFoil || card.prices.eurFoil || 0;

  // Calculate price trend (simplified)
  const priceChange = priceHistory.length >= 2 ? 
    priceHistory[priceHistory.length - 1].price - priceHistory[0].price : 0;
  const priceChangePercent = priceHistory.length >= 2 && priceHistory[0].price > 0 ?
    ((priceChange / priceHistory[0].price) * 100) : 0;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{card.name}</h2>
            <p className="text-muted-foreground">{card.setName} • {card.rarity}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Left Column - Image and Basic Info */}
          <div className="space-y-4">
            {/* Card Image */}
            <div className="aspect-[5/7] relative bg-muted rounded-lg overflow-hidden">
              {card.imageUrl && !imageError ? (
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                  <div className="text-center p-4">
                    <div className="text-lg font-medium mb-2">{card.name}</div>
                    <div className="text-sm">{card.setCode.toUpperCase()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleWatchlistToggle}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                  isWatched
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-accent text-accent-foreground hover:bg-accent/80'
                }`}
              >
                <Star className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`} />
                <span>{isWatched ? 'Watching' : 'Watch'}</span>
              </button>
              
              <button
                onClick={handleAddToPortfolio}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Portfolio</span>
              </button>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Price Information */}
            <div className="bg-accent rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Current Prices</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Regular</div>
                  <div className="text-lg font-semibold text-foreground">
                    {price > 0 ? `$${price.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
                {foilPrice > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Foil</div>
                    <div className="text-lg font-semibold text-foreground">
                      ${foilPrice.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Price Trend */}
              {priceHistory.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">30-day trend</span>
                    </div>
                    <div className={`text-sm font-medium ${
                      priceChangePercent > 0 ? 'text-green-600' : 
                      priceChangePercent < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Card Details</h3>
              
              <div className="space-y-3">
                {card.manaCost && (
                  <div className="flex items-center space-x-3">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Mana Cost:</span>
                    <span className="font-mono text-sm">{card.manaCost}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Colors:</span>
                  <div className="flex space-x-1">
                    {card.colors.length > 0 ? (
                      card.colors.map(color => (
                        <span key={color} className="text-sm px-2 py-1 bg-accent rounded">
                          {color}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Colorless</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <div className="text-sm mt-1">{card.type}</div>
                  </div>
                </div>

                {(card.power || card.toughness) && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">Power/Toughness:</span>
                    <span className="text-sm font-mono">
                      {card.power || '?'}/{card.toughness || '?'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Oracle Text */}
            {card.text && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Oracle Text</h3>
                <div className="text-sm text-muted-foreground leading-relaxed bg-accent p-3 rounded-lg">
                  {card.text}
                </div>
              </div>
            )}

            {/* Flavor Text */}
            {card.flavorText && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Flavor Text</h3>
                <div className="text-sm text-muted-foreground italic leading-relaxed">
                  &quot;{card.flavorText}&quot;
                </div>
              </div>
            )}

            {/* Set Information */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Set Information</h3>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Set:</span> {card.setName}</div>
                <div><span className="text-muted-foreground">Code:</span> {card.setCode.toUpperCase()}</div>
                {card.number && (
                  <div><span className="text-muted-foreground">Number:</span> {card.number}</div>
                )}
                {card.artist && (
                  <div><span className="text-muted-foreground">Artist:</span> {card.artist}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







