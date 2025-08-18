/**
 * Market Data Service
 * 
 * Provides realistic simulated MTG market data for components that need
 * historical trends, market analysis, and price simulations.
 */

import { MTGCard } from '@/lib/types';

export interface MarketDataPoint {
  date: string;
  marketIndex: number;
  volume: number;
  volatility: number;
  avgPrice: number;
}

export interface CardPriceSimulation {
  cardId: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  confidence: number; // 0-1 scale
}

export interface MarketFactors {
  seasonalMultiplier: number;
  setReleaseImpact: number;
  formatLegalityImpact: number;
  rarityMultiplier: number;
  typeMultiplier: number;
}

class MarketDataService {
  private readonly MTG_SETS_RELEASE_MONTHS = [1, 4, 7, 10]; // Quarterly releases
  private readonly RARITY_VOLATILITY = {
    common: 0.05,
    uncommon: 0.08,
    rare: 0.15,
    mythic: 0.25,
  };

  private readonly TYPE_VOLATILITY = {
    creature: 0.12,
    instant: 0.18,
    sorcery: 0.16,
    enchantment: 0.14,
    artifact: 0.20,
    planeswalker: 0.30,
    land: 0.08,
  };

  /**
   * Generate realistic market trend data for a given timeframe
   */
  generateMarketTrends(timeframe: '7d' | '30d' | '90d' | '1y'): MarketDataPoint[] {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const data: MarketDataPoint[] = [];
    const now = new Date();

    // Base market parameters
    let baseIndex = 100;
    let momentum = 0; // Market momentum (-1 to 1)
    let volatilityTrend = 0.1; // Base volatility

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Calculate market factors
      const factors = this.calculateMarketFactors(date, days);
      
      // Update momentum with some persistence and random walk
      momentum = momentum * 0.8 + (Math.random() - 0.5) * 0.4;
      momentum = Math.max(-1, Math.min(1, momentum));
      
      // Calculate price movement
      const trendComponent = momentum * 0.02; // ±2% max trend per day
      const seasonalComponent = factors.seasonalMultiplier - 1;
      const randomComponent = (Math.random() - 0.5) * volatilityTrend;
      
      const dailyChange = trendComponent + seasonalComponent + randomComponent;
      baseIndex *= (1 + dailyChange);
      
      // Update volatility based on market conditions
      volatilityTrend = 0.05 + Math.abs(momentum) * 0.2 + factors.setReleaseImpact * 0.1;
      
      // Calculate volume (higher during volatile periods)
      const baseVolume = 1000;
      const volumeMultiplier = 1 + volatilityTrend * 2 + Math.random() * 0.5;
      const volume = baseVolume * volumeMultiplier;
      
      // Calculate average card price (correlated with market index)
      const avgPrice = (baseIndex * 0.8) + (Math.random() * 40);
      
      data.push({
        date: date.toISOString().split('T')[0],
        marketIndex: Math.round(baseIndex * 100) / 100,
        volume: Math.round(volume),
        volatility: Math.round(volatilityTrend * 10000) / 100, // Convert to percentage
        avgPrice: Math.round(avgPrice * 100) / 100,
      });
    }

    return data;
  }

  /**
   * Simulate realistic price changes for a specific card
   */
  simulateCardPriceChange(
    card: MTGCard, 
    timeframe: '7d' | '30d' | '90d' | '1y',
    marketTrends?: MarketDataPoint[]
  ): CardPriceSimulation {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const currentPrice = card.prices.usd || 0;
    
    if (currentPrice === 0) {
      return {
        cardId: card.id,
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        trend: 'stable',
        volatility: 0,
        confidence: 0,
      };
    }

    // Get card-specific factors
    const rarity = this.extractRarity(card.rarity || '');
    const primaryType = this.extractPrimaryType(card.type);
    
    // Base volatility from card characteristics
    const baseVolatility = (
      (this.RARITY_VOLATILITY[rarity] || 0.1) +
      (this.TYPE_VOLATILITY[primaryType] || 0.12)
    ) / 2;

    // Time-adjusted volatility (longer periods = more potential change)
    const timeMultiplier = Math.sqrt(days / 30);
    const adjustedVolatility = baseVolatility * timeMultiplier;

    // Market correlation (higher value cards are more correlated with market)
    const marketCorrelation = Math.min(0.8, currentPrice / 50);
    
    // Generate market-influenced price change
    let marketInfluence = 0;
    if (marketTrends && marketTrends.length > 0) {
      const firstIndex = marketTrends[0].marketIndex;
      const lastIndex = marketTrends[marketTrends.length - 1].marketIndex;
      marketInfluence = (lastIndex - firstIndex) / firstIndex;
    }

    // Combine market influence with card-specific randomness
    const marketComponent = marketInfluence * marketCorrelation;
    const randomComponent = (Math.random() - 0.5) * 2 * adjustedVolatility;
    const totalChange = marketComponent + randomComponent * (1 - marketCorrelation);

    // Calculate final values
    const priceChange = currentPrice * totalChange;
    const priceChangePercent = totalChange * 100;
    
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(priceChangePercent) < 2 ? 'stable' :
      priceChangePercent > 0 ? 'up' : 'down';

    // Confidence based on price stability and market correlation
    const confidence = Math.max(0.3, Math.min(0.95, 
      0.7 + marketCorrelation * 0.2 - adjustedVolatility * 0.5
    ));

    return {
      cardId: card.id,
      currentPrice,
      priceChange: Math.round(priceChange * 100) / 100,
      priceChangePercent: Math.round(priceChangePercent * 100) / 100,
      trend,
      volatility: Math.round(adjustedVolatility * 10000) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Generate system health metrics based on actual app usage
   */
  generateSystemHealthMetrics(options: {
    portfolioCount: number;
    totalCards: number;
    storageUsagePercent: number;
    apiCallsLast24h?: number;
  }) {
    const { portfolioCount, totalCards, storageUsagePercent, apiCallsLast24h = 0 } = options;

    // Calculate realistic response times based on data load
    const baseResponseTime = 50;
    const dataLoadFactor = Math.min(2, totalCards / 1000); // Slower with more cards
    const storageFactor = Math.max(1, storageUsagePercent / 50); // Slower when storage is full
    const avgResponseTime = baseResponseTime * dataLoadFactor * storageFactor;

    // Calculate error rate based on system stress
    const stressFactor = (storageUsagePercent / 100) + (apiCallsLast24h / 10000);
    const errorRate = Math.min(5, stressFactor * 2); // Max 5% error rate

    // Calculate uptime (very high for client-side app)
    const uptime = Math.max(99.0, 99.9 - stressFactor * 0.5);

    return {
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: Math.round(uptime * 100) / 100,
      dataLoadFactor: Math.round(dataLoadFactor * 100) / 100,
      systemStress: Math.round(stressFactor * 100) / 100,
    };
  }

  /**
   * Calculate market factors for a specific date
   */
  private calculateMarketFactors(date: Date, timeframeDays: number): MarketFactors {
    const month = date.getMonth() + 1;
    const dayOfYear = this.getDayOfYear(date);
    
    // Seasonal effects (MTG has quarterly set releases)
    const nearestReleaseMonth = this.MTG_SETS_RELEASE_MONTHS.reduce((prev, curr) => 
      Math.abs(curr - month) < Math.abs(prev - month) ? curr : prev
    );
    const monthsFromRelease = Math.abs(month - nearestReleaseMonth);
    const seasonalMultiplier = 1 + (0.1 * Math.exp(-monthsFromRelease / 2)); // Boost near releases

    // Set release impact (higher volatility around release months)
    const setReleaseImpact = monthsFromRelease <= 1 ? 0.3 : 0.1;

    // Format legality impact (simulate rotation effects)
    const isRotationMonth = month === 9; // September rotations
    const formatLegalityImpact = isRotationMonth ? 0.2 : 0;

    // Holiday effects (increased activity around holidays)
    const holidayBoost = this.getHolidayEffect(month, dayOfYear);

    return {
      seasonalMultiplier: seasonalMultiplier + holidayBoost,
      setReleaseImpact,
      formatLegalityImpact,
      rarityMultiplier: 1,
      typeMultiplier: 1,
    };
  }

  private extractRarity(rarity: string): keyof typeof this.RARITY_VOLATILITY {
    const normalized = rarity.toLowerCase();
    if (normalized.includes('mythic')) return 'mythic';
    if (normalized.includes('rare')) return 'rare';
    if (normalized.includes('uncommon')) return 'uncommon';
    return 'common';
  }

  private extractPrimaryType(typeLine: string): keyof typeof this.TYPE_VOLATILITY {
    const normalized = typeLine.toLowerCase();
    if (normalized.includes('creature')) return 'creature';
    if (normalized.includes('instant')) return 'instant';
    if (normalized.includes('sorcery')) return 'sorcery';
    if (normalized.includes('enchantment')) return 'enchantment';
    if (normalized.includes('artifact')) return 'artifact';
    if (normalized.includes('planeswalker')) return 'planeswalker';
    if (normalized.includes('land')) return 'land';
    return 'creature'; // Default fallback
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getHolidayEffect(month: number, dayOfYear: number): number {
    // Black Friday/Holiday shopping (late November)
    if (month === 11 && dayOfYear >= 325 && dayOfYear <= 335) return 0.15;
    
    // Christmas/New Year (December)
    if (month === 12) return 0.1;
    
    // Back to school (August/September)
    if (month === 8 || month === 9) return 0.05;
    
    return 0;
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
