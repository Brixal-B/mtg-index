'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle, Target, Info } from 'lucide-react';
import { MTGCard, PriceAlert, PriceHistory } from '@/lib/types';
import { getPriceHistoryForCard } from '@/lib/api/mtgjson';
import { searchCards } from '@/lib/api/scryfall';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

interface EnhancedPriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
}

interface AlertSuggestion {
  type: 'support' | 'resistance' | 'trend' | 'volatility';
  price: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export function EnhancedPriceAlertModal({ isOpen, onClose, onCreateAlert }: EnhancedPriceAlertModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MTGCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<MTGCard | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [suggestions, setSuggestions] = useState<AlertSuggestion[]>([]);

  useEffect(() => {
    if (selectedCard) {
      loadPriceHistoryAndSuggestions();
    }
  }, [selectedCard]);

  const loadPriceHistoryAndSuggestions = async () => {
    if (!selectedCard) return;

    setLoading(true);
    try {
      const history = await getPriceHistoryForCard(selectedCard);
      setPriceHistory(history);
      
      if (history) {
        const alertSuggestions = generateAlertSuggestions(history);
        setSuggestions(alertSuggestions);
      }
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlertSuggestions = (history: PriceHistory): AlertSuggestion[] => {
    const suggestions: AlertSuggestion[] = [];
    const prices = history.prices.map(p => p.price);
    
    if (prices.length < 7) {
      return suggestions; // Need at least a week of data
    }

    const currentPrice = prices[prices.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Support level suggestion (buy opportunity)
    const supportLevel = minPrice * 1.05; // 5% above historical low
    if (currentPrice > supportLevel) {
      suggestions.push({
        type: 'support',
        price: Math.round(supportLevel * 100) / 100,
        confidence: 'high',
        reason: `Near historical support level (${Math.round(((supportLevel - minPrice) / minPrice) * 100)}% above lowest price)`
      });
    }

    // Resistance level suggestion (sell opportunity)
    const resistanceLevel = maxPrice * 0.95; // 5% below historical high
    if (currentPrice < resistanceLevel) {
      suggestions.push({
        type: 'resistance',
        price: Math.round(resistanceLevel * 100) / 100,
        confidence: 'high',
        reason: `Near historical resistance level (${Math.round(((maxPrice - resistanceLevel) / maxPrice) * 100)}% below highest price)`
      });
    }

    // Trend-based suggestions
    const recentPrices = prices.slice(-7); // Last 7 days
    const recentAvg = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const previousWeekPrices = prices.slice(-14, -7);
    const previousWeekAvg = previousWeekPrices.reduce((sum, price) => sum + price, 0) / previousWeekPrices.length;

    if (recentAvg > previousWeekAvg * 1.1) {
      // Upward trend - suggest selling alert
      const trendTarget = currentPrice * 1.15; // 15% above current
      suggestions.push({
        type: 'trend',
        price: Math.round(trendTarget * 100) / 100,
        confidence: 'medium',
        reason: `Strong upward trend detected (+${Math.round(((recentAvg - previousWeekAvg) / previousWeekAvg) * 100)}% this week)`
      });
    } else if (recentAvg < previousWeekAvg * 0.9) {
      // Downward trend - suggest buying alert
      const trendTarget = currentPrice * 0.85; // 15% below current
      suggestions.push({
        type: 'trend',
        price: Math.round(trendTarget * 100) / 100,
        confidence: 'medium',
        reason: `Downward trend detected (${Math.round(((recentAvg - previousWeekAvg) / previousWeekAvg) * 100)}% this week)`
      });
    }

    // Volatility-based suggestions
    if (history.volatility > avgPrice * 0.2) {
      // High volatility - suggest alerts at extremes
      const volatilityHigh = currentPrice * 1.2;
      const volatilityLow = currentPrice * 0.8;
      
      suggestions.push({
        type: 'volatility',
        price: Math.round(volatilityHigh * 100) / 100,
        confidence: 'low',
        reason: `High volatility detected - potential spike opportunity`
      });
      
      suggestions.push({
        type: 'volatility',
        price: Math.round(volatilityLow * 100) / 100,
        confidence: 'low',
        reason: `High volatility detected - potential dip opportunity`
      });
    }

    return suggestions.slice(0, 4); // Limit to top 4 suggestions
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchCards(query, { limit: 10 });
      setSearchResults(results.cards);
    } catch (error) {
      console.error('Error searching cards:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleCardSelect = (card: MTGCard) => {
    setSelectedCard(card);
    setSearchQuery(card.name);
    setSearchResults([]);
    setTargetPrice(card.prices.usd?.toString() || '');
  };

  const handleSuggestionSelect = (suggestion: AlertSuggestion) => {
    setTargetPrice(suggestion.price.toString());
    setCondition(
      suggestion.type === 'support' || suggestion.type === 'trend' && suggestion.price < (selectedCard?.prices.usd || 0)
        ? 'below' 
        : 'above'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCard || !targetPrice) return;

    const alert: Omit<PriceAlert, 'id' | 'createdAt'> = {
      cardId: selectedCard.id,
      targetPrice: parseFloat(targetPrice),
      condition,
      active: true,
    };

    onCreateAlert(alert);
    onClose();
  };

  const getSuggestionIcon = (type: AlertSuggestion['type']) => {
    switch (type) {
      case 'support': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'resistance': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'trend': return <Target className="h-4 w-4 text-blue-500" />;
      case 'volatility': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getSuggestionColor = (confidence: AlertSuggestion['confidence']) => {
    switch (confidence) {
      case 'high': return 'border-green-200 bg-green-50';
      case 'medium': return 'border-blue-200 bg-blue-50';
      case 'low': return 'border-amber-200 bg-amber-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Create Enhanced Price Alert</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Card Search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search for Card
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Enter card name..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-lg">
                {searchResults.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardSelect(card)}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">{card.name}</p>
                      <p className="text-sm text-muted-foreground">{card.setName}</p>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      ${card.prices.usd || 'N/A'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Card Info */}
          {selectedCard && (
            <div className="bg-accent rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{selectedCard.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCard.setName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    ${selectedCard.prices.usd || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Smart Alert Suggestions</h3>
              </div>
              <div className="grid gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`p-3 rounded-lg border text-left hover:shadow-sm transition-all ${getSuggestionColor(suggestion.confidence)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getSuggestionIcon(suggestion.type)}
                        <div>
                          <p className="font-medium text-foreground">
                            ${suggestion.price} ({suggestion.type})
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.reason}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        suggestion.confidence === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {suggestion.confidence}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Alert Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Target Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Alert When Price Goes
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="above">Above Target</option>
                <option value="below">Below Target</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-muted-foreground">Analyzing price history...</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCard || !targetPrice || loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
