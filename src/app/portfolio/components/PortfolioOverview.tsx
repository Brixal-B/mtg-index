'use client';

import { useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, Edit3, DollarSign } from 'lucide-react';
import { Portfolio, PortfolioCard } from '@/lib/types';
import { savePortfolio } from '@/lib/utils/localStorage';
import { AddCardModal } from './AddCardModal';
import { PortfolioCardItem } from './PortfolioCardItem';
import { TransactionHistory } from './TransactionHistory';

interface PortfolioOverviewProps {
  portfolio: Portfolio;
  onPortfolioUpdated: (portfolio: Portfolio) => void;
}

export function PortfolioOverview({ portfolio, onPortfolioUpdated }: PortfolioOverviewProps) {
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'performance' | 'quantity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleAddCard = (card: PortfolioCard) => {
    const existingCardIndex = portfolio.cards.findIndex(
      c => c.cardId === card.cardId && c.foil === card.foil && c.condition === card.condition
    );

    let updatedCards: PortfolioCard[];
    
    if (existingCardIndex >= 0) {
      // Update existing card quantity
      updatedCards = portfolio.cards.map((c, index) =>
        index === existingCardIndex
          ? { ...c, quantity: c.quantity + card.quantity }
          : c
      );
    } else {
      // Add new card
      updatedCards = [...portfolio.cards, card];
    }

    // Recalculate portfolio totals
    const totalValue = updatedCards.reduce((sum, c) => {
      const currentPrice = c.card.prices.usd || 0;
      return sum + (currentPrice * c.quantity);
    }, 0);

    const totalCost = updatedCards.reduce((sum, c) => {
      return sum + (c.purchasePrice * c.quantity);
    }, 0);

    const performance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    const updatedPortfolio: Portfolio = {
      ...portfolio,
      cards: updatedCards,
      totalValue,
      totalCost,
      performance,
      updatedAt: new Date().toISOString(),
    };

    savePortfolio(updatedPortfolio);
    onPortfolioUpdated(updatedPortfolio);
    setShowAddCardModal(false);
  };

  const handleRemoveCard = (cardId: string, foil: boolean, condition: string) => {
    const updatedCards = portfolio.cards.filter(
      c => !(c.cardId === cardId && c.foil === foil && c.condition === condition)
    );

    // Recalculate totals
    const totalValue = updatedCards.reduce((sum, c) => {
      const currentPrice = c.card.prices.usd || 0;
      return sum + (currentPrice * c.quantity);
    }, 0);

    const totalCost = updatedCards.reduce((sum, c) => {
      return sum + (c.purchasePrice * c.quantity);
    }, 0);

    const performance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    const updatedPortfolio: Portfolio = {
      ...portfolio,
      cards: updatedCards,
      totalValue,
      totalCost,
      performance,
      updatedAt: new Date().toISOString(),
    };

    savePortfolio(updatedPortfolio);
    onPortfolioUpdated(updatedPortfolio);
  };

  const handleUpdateCard = (updatedCard: PortfolioCard) => {
    const updatedCards = portfolio.cards.map(c =>
      c.cardId === updatedCard.cardId && 
      c.foil === updatedCard.foil && 
      c.condition === updatedCard.condition
        ? updatedCard
        : c
    );

    // Recalculate totals
    const totalValue = updatedCards.reduce((sum, c) => {
      const currentPrice = c.card.prices.usd || 0;
      return sum + (currentPrice * c.quantity);
    }, 0);

    const totalCost = updatedCards.reduce((sum, c) => {
      return sum + (c.purchasePrice * c.quantity);
    }, 0);

    const performance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    const updatedPortfolio: Portfolio = {
      ...portfolio,
      cards: updatedCards,
      totalValue,
      totalCost,
      performance,
      updatedAt: new Date().toISOString(),
    };

    savePortfolio(updatedPortfolio);
    onPortfolioUpdated(updatedPortfolio);
  };

  // Filter and sort cards
  const filteredCards = portfolio.cards.filter(card =>
    card.card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.card.setName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCards = filteredCards.sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.card.name;
        bValue = b.card.name;
        break;
      case 'value':
        aValue = (a.card.prices.usd || 0) * a.quantity;
        bValue = (b.card.prices.usd || 0) * b.quantity;
        break;
      case 'performance':
        const aGain = ((a.card.prices.usd || 0) - a.purchasePrice) * a.quantity;
        const bGain = ((b.card.prices.usd || 0) - b.purchasePrice) * b.quantity;
        aValue = aGain;
        bValue = bGain;
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      default:
        aValue = a.card.name;
        bValue = b.card.name;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const gainLoss = portfolio.totalValue - portfolio.totalCost;

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{portfolio.name}</h2>
            {portfolio.description && (
              <p className="text-muted-foreground mt-1">{portfolio.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddCardModal(true)}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Card</span>
          </button>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Cards</div>
            <div className="text-xl font-semibold text-foreground">
              {portfolio.cards.reduce((sum, c) => sum + c.quantity, 0)}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Current Value</div>
            <div className="text-xl font-semibold text-foreground">
              ${portfolio.totalValue.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
            <div className="text-xl font-semibold text-foreground">
              ${portfolio.totalCost.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Gain/Loss</div>
            <div className={`text-xl font-semibold flex items-center space-x-1 ${
              gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {gainLoss >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <span>
                {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
              </span>
              <span className="text-sm">
                ({portfolio.performance >= 0 ? '+' : ''}{portfolio.performance.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="name">Sort by Name</option>
            <option value="value">Sort by Value</option>
            <option value="performance">Sort by Performance</option>
            <option value="quantity">Sort by Quantity</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-accent transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Cards List */}
      {portfolio.cards.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No cards in portfolio</h3>
          <p className="text-muted-foreground mb-4">
            Start building your portfolio by adding some cards.
          </p>
          <button
            onClick={() => setShowAddCardModal(true)}
            className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Card</span>
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              Cards ({sortedCards.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {sortedCards.map((card) => (
              <PortfolioCardItem
                key={`${card.cardId}-${card.foil}-${card.condition}`}
                portfolioCard={card}
                onRemove={() => handleRemoveCard(card.cardId, card.foil, card.condition)}
                onUpdate={handleUpdateCard}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <TransactionHistory 
        portfolioId={portfolio.id}
        className="mt-6"
      />

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onAddCard={handleAddCard}
      />


    </div>
  );
}







