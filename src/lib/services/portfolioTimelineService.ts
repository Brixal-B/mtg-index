/**
 * Portfolio Timeline Service (Proof of Concept)
 * 
 * Tracks portfolio changes over time with transaction history
 * Enables accurate historical portfolio value calculations
 */

import { 
  PortfolioTransaction, 
  PortfolioSnapshot, 
  PortfolioTimelineEntry,
  EnhancedPortfolio,
  Portfolio,
  PortfolioCard,
  MTGCard
} from '@/lib/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getPriceHistoryForCard } from '@/lib/api/mtgjson';

export class PortfolioTimelineService {
  private static readonly STORAGE_KEY = 'mtg-portfolio-transactions';
  private static readonly SNAPSHOTS_KEY = 'mtg-portfolio-snapshots';

  /**
   * Record a new transaction when cards are added/removed/updated
   */
  static recordTransaction(
    portfolioId: string,
    type: PortfolioTransaction['type'],
    cardId: string,
    quantityChange: number,
    pricePerCard: number,
    previousQuantity: number,
    notes?: string
  ): PortfolioTransaction {
    const transaction: PortfolioTransaction = {
      id: generateUUID(),
      portfolioId,
      type,
      timestamp: new Date().toISOString(),
      cardId,
      quantityChange,
      pricePerCard,
      previousQuantity,
      newQuantity: previousQuantity + quantityChange,
      notes,
      source: 'manual'
    };

    // Store transaction
    const existingTransactions = this.getTransactions(portfolioId);
    existingTransactions.push(transaction);
    
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY}-${portfolioId}`, 
        JSON.stringify(existingTransactions)
      );
    } catch (error) {
      console.error('Error storing transaction:', error);
    }

    return transaction;
  }

  /**
   * Get all transactions for a portfolio
   */
  static getTransactions(portfolioId: string): PortfolioTransaction[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}-${portfolioId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }

  /**
   * Calculate portfolio composition at a specific date
   */
  static getPortfolioAtDate(
    portfolioId: string, 
    targetDate: string
  ): Map<string, { quantity: number; totalCost: number; averageCostBasis: number }> {
    const transactions = this.getTransactions(portfolioId)
      .filter(t => t.timestamp.split('T')[0] <= targetDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const cardPositions = new Map<string, { 
      quantity: number; 
      totalCost: number; 
      averageCostBasis: number;
      costBasis: number[]; // For FIFO/LIFO tracking
    }>();

    for (const transaction of transactions) {
      const existing = cardPositions.get(transaction.cardId) || {
        quantity: 0,
        totalCost: 0,
        averageCostBasis: 0,
        costBasis: []
      };

      if (transaction.type === 'add') {
        // Add cards with their cost basis
        existing.quantity += transaction.quantityChange;
        existing.totalCost += transaction.quantityChange * transaction.pricePerCard;
        
        // Add individual cost basis entries for FIFO/LIFO
        for (let i = 0; i < transaction.quantityChange; i++) {
          existing.costBasis.push(transaction.pricePerCard);
        }
      } else if (transaction.type === 'remove' && transaction.quantityChange < 0) {
        // Remove cards (quantityChange is negative)
        const removeQuantity = Math.abs(transaction.quantityChange);
        const actualRemove = Math.min(removeQuantity, existing.quantity);
        
        existing.quantity -= actualRemove;
        
        // Remove cost basis using FIFO method (for simplicity in PoC)
        const removedCosts = existing.costBasis.splice(0, actualRemove);
        const removedCost = removedCosts.reduce((sum, cost) => sum + cost, 0);
        existing.totalCost -= removedCost;
      }

      // Calculate average cost basis
      existing.averageCostBasis = existing.quantity > 0 
        ? existing.totalCost / existing.quantity 
        : 0;

      if (existing.quantity > 0) {
        cardPositions.set(transaction.cardId, existing);
      } else {
        cardPositions.delete(transaction.cardId);
      }
    }

    // Convert to simpler format for return
    const result = new Map<string, { quantity: number; totalCost: number; averageCostBasis: number }>();
    cardPositions.forEach((position, cardId) => {
      result.set(cardId, {
        quantity: position.quantity,
        totalCost: position.totalCost,
        averageCostBasis: position.averageCostBasis
      });
    });

    return result;
  }

  /**
   * Generate historical timeline with accurate portfolio values
   */
  static async generateHistoricalTimeline(
    portfolioId: string,
    startDate: string,
    endDate: string,
    currentCards: Map<string, MTGCard>
  ): Promise<PortfolioTimelineEntry[]> {
    const timeline: PortfolioTimelineEntry[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate entry for each day
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      
      // Get portfolio composition at this date
      const portfolioAtDate = this.getPortfolioAtDate(portfolioId, dateString);
      
      let portfolioValue = 0;
      let portfolioCost = 0;
      let cardCount = 0;
      const uniqueCards = portfolioAtDate.size;

      // Calculate portfolio value using historical prices where available
      portfolioAtDate.forEach((position, cardId) => {
        const card = currentCards.get(cardId);
        if (!card) return; // Use return instead of continue in forEach

        cardCount += position.quantity;
        portfolioCost += position.totalCost;

        // Try to get historical price for this date
        let priceAtDate = card.prices.usd || 0;
        
        // TODO: In full implementation, we'd fetch historical price for this specific date
        // For PoC, we'll use current price (this would be enhanced with real MTGJSON data)
        
        portfolioValue += priceAtDate * position.quantity;
      });

      // Calculate daily change if we have previous day
      let dailyChange: number | undefined;
      let dailyChangePercent: number | undefined;
      
      if (timeline.length > 0) {
        const previousEntry = timeline[timeline.length - 1];
        dailyChange = portfolioValue - previousEntry.portfolioValue;
        dailyChangePercent = previousEntry.portfolioValue > 0 
          ? (dailyChange / previousEntry.portfolioValue) * 100 
          : 0;
      }

      timeline.push({
        date: dateString,
        portfolioValue,
        portfolioCost,
        cardCount,
        uniqueCards,
        dailyChange,
        dailyChangePercent
      });
    }

    return timeline;
  }

  /**
   * Convert regular portfolio to enhanced portfolio with timeline tracking
   */
  static convertToEnhancedPortfolio(portfolio: Portfolio): EnhancedPortfolio {
    const transactions = this.getTransactions(portfolio.id);
    
    // If no transactions exist, create initial transactions for existing cards
    if (transactions.length === 0) {
      const initialTransactions: PortfolioTransaction[] = portfolio.cards.map(card => ({
        id: generateUUID(),
        portfolioId: portfolio.id,
        type: 'add' as const,
        timestamp: portfolio.createdAt,
        cardId: card.cardId,
        quantityChange: card.quantity,
        pricePerCard: card.purchasePrice,
        previousQuantity: 0,
        newQuantity: card.quantity,
        notes: 'Initial portfolio creation',
        source: 'manual' as const
      }));

      // Store the initial transactions
      try {
        localStorage.setItem(
          `${this.STORAGE_KEY}-${portfolio.id}`, 
          JSON.stringify(initialTransactions)
        );
      } catch (error) {
        console.error('Error storing initial transactions:', error);
      }
    }

    return {
      ...portfolio,
      transactions: this.getTransactions(portfolio.id),
      settings: {
        trackTimeline: true,
        costBasisMethod: 'fifo'
      }
    };
  }

  /**
   * Get transaction history for a date range
   */
  static getTransactionHistory(
    portfolioId: string,
    startDate: string,
    endDate: string
  ): PortfolioTransaction[] {
    return this.getTransactions(portfolioId)
      .filter(t => {
        const transactionDate = t.timestamp.split('T')[0];
        return transactionDate >= startDate && transactionDate <= endDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clear all timeline data for a portfolio (useful for testing)
   */
  static clearTimelineData(portfolioId: string): void {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}-${portfolioId}`);
      localStorage.removeItem(`${this.SNAPSHOTS_KEY}-${portfolioId}`);
    } catch (error) {
      console.error('Error clearing timeline data:', error);
    }
  }

  /**
   * Get summary statistics for portfolio timeline
   */
  static getTimelineStats(portfolioId: string): {
    totalTransactions: number;
    firstTransaction: string | null;
    lastTransaction: string | null;
    totalCardsAdded: number;
    totalCardsRemoved: number;
    totalInvested: number;
  } {
    const transactions = this.getTransactions(portfolioId);
    
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        firstTransaction: null,
        lastTransaction: null,
        totalCardsAdded: 0,
        totalCardsRemoved: 0,
        totalInvested: 0
      };
    }

    const sorted = [...transactions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const stats = {
      totalTransactions: transactions.length,
      firstTransaction: sorted[0].timestamp,
      lastTransaction: sorted[sorted.length - 1].timestamp,
      totalCardsAdded: 0,
      totalCardsRemoved: 0,
      totalInvested: 0
    };

    for (const transaction of transactions) {
      if (transaction.type === 'add') {
        stats.totalCardsAdded += transaction.quantityChange;
        stats.totalInvested += transaction.quantityChange * transaction.pricePerCard;
      } else if (transaction.type === 'remove') {
        stats.totalCardsRemoved += Math.abs(transaction.quantityChange);
      }
    }

    return stats;
  }
}

export default PortfolioTimelineService;
