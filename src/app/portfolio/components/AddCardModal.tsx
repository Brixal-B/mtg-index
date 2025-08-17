'use client';

import { useState, useCallback } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { MTGCard, PortfolioCard } from '@/lib/types';
import { searchCards } from '@/lib/api/scryfall';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { CardItem } from '@/app/cards/components/CardItem';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (card: PortfolioCard) => void;
}

const conditionOptions = [
  { value: 'mint', label: 'Mint (M)' },
  { value: 'near_mint', label: 'Near Mint (NM)' },
  { value: 'excellent', label: 'Excellent (EX)' },
  { value: 'good', label: 'Good (GD)' },
  { value: 'light_played', label: 'Light Played (LP)' },
  { value: 'played', label: 'Played (PL)' },
  { value: 'poor', label: 'Poor (PR)' },
] as const;

export function AddCardModal({ isOpen, onClose, onAddCard }: AddCardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MTGCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<MTGCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [condition, setCondition] = useState<PortfolioCard['condition']>('near_mint');
  const [foil, setFoil] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchCards(query, { page: 1 });
      setSearchResults(result.cards.slice(0, 20)); // Limit to 20 results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search cards';
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCardSelect = (card: MTGCard) => {
    setSelectedCard(card);
    // Auto-fill purchase price with current price if available
    const currentPrice = card.prices.usd || card.prices.eur || 0;
    if (currentPrice > 0) {
      setPurchasePrice(currentPrice.toString());
    }
  };

  const handleAddToPortfolio = () => {
    if (!selectedCard) return;

    const portfolioCard: PortfolioCard = {
      cardId: selectedCard.id,
      card: selectedCard,
      quantity,
      purchasePrice: parseFloat(purchasePrice) || 0,
      purchaseDate: new Date().toISOString(),
      condition,
      foil,
      notes: notes.trim() || undefined,
    };

    onAddCard(portfolioCard);
    
    // Reset form
    setSelectedCard(null);
    setQuantity(1);
    setPurchasePrice('');
    setCondition('near_mint');
    setFoil(false);
    setNotes('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    // Reset all state
    setSelectedCard(null);
    setQuantity(1);
    setPurchasePrice('');
    setCondition('near_mint');
    setFoil(false);
    setNotes('');
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Add Card to Portfolio</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedCard ? (
            /* Card Search Step */
            <div className="p-6 space-y-6">
              {/* Search Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Search for a card
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter card name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Search Results */}
              {error && (
                <ErrorMessage 
                  message={error}
                  onRetry={() => handleSearch(searchQuery)}
                />
              )}

              {loading && (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="large" />
                </div>
              )}

              {searchResults.length > 0 && !loading && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Search Results ({searchResults.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {searchResults.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => handleCardSelect(card)}
                        className="cursor-pointer"
                      >
                        <CardItem
                          card={card}
                          onClick={() => handleCardSelect(card)}
                          showActions={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && !loading && searchResults.length === 0 && !error && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No cards found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or check the spelling.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Card Details Step */
            <div className="p-6 space-y-6">
              {/* Selected Card Display */}
              <div className="bg-accent rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-22 bg-muted rounded border flex-shrink-0">
                    {selectedCard.imageUrl ? (
                      <img
                        src={selectedCard.imageUrl}
                        alt={selectedCard.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center p-1">
                        {selectedCard.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{selectedCard.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedCard.setName}</p>
                    <p className="text-sm text-muted-foreground">
                      Current Price: ${selectedCard.prices.usd?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Purchase Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as PortfolioCard['condition'])}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {conditionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Foil
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="foil"
                      checked={foil}
                      onChange={(e) => setFoil(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="foil" className="text-sm text-foreground">
                      This is a foil card
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this card..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedCard && (
          <div className="p-6 border-t border-border">
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedCard(null)}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Back to Search
              </button>
              <button
                onClick={handleAddToPortfolio}
                disabled={!purchasePrice || parseFloat(purchasePrice) < 0}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Portfolio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}





