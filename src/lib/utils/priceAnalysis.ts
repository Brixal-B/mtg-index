// Define the PriceHistoryPoint interface to match scryfall.ts
interface PriceHistoryPoint {
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  changeAmount: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface VolatilityMetrics {
  standardDeviation: number;
  volatilityLevel: 'low' | 'medium' | 'high';
  priceRange: {
    min: number;
    max: number;
    current: number;
  };
}

export interface PriceTrendAnalysis {
  trend7d: TrendData | null;
  trend30d: TrendData | null;
  volatility: VolatilityMetrics | null;
  lastUpdated: Date;
}

/**
 * Calculate price trend over a specific timeframe
 */
export function calculateTrend(
  priceHistory: PriceHistoryPoint[], 
  timeframe: '7d' | '30d' | '90d'
): TrendData | null {
  if (!priceHistory || priceHistory.length < 2) {
    return null;
  }

  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timeframe) {
    case '7d':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      cutoffDate.setDate(now.getDate() - 90);
      break;
  }

  // Filter prices within the timeframe
  const relevantPrices = priceHistory.filter(point => 
    new Date(point.date) >= cutoffDate
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (relevantPrices.length < 2) {
    return null;
  }

  const startPrice = relevantPrices[0].price;
  const endPrice = relevantPrices[relevantPrices.length - 1].price;
  
  if (startPrice === 0) {
    return null;
  }

  const changeAmount = endPrice - startPrice;
  const changePercent = (changeAmount / startPrice) * 100;

  // Determine trend direction with threshold
  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(changePercent) < 2) {
    direction = 'stable';
  } else if (changePercent > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  // Calculate confidence based on data points and consistency
  const confidence = calculateTrendConfidence(relevantPrices, direction);

  return {
    direction,
    changePercent,
    changeAmount,
    confidence
  };
}

/**
 * Calculate trend confidence based on data consistency
 */
function calculateTrendConfidence(
  prices: PriceHistoryPoint[], 
  direction: 'up' | 'down' | 'stable'
): 'high' | 'medium' | 'low' {
  if (prices.length < 3) return 'low';
  if (prices.length < 7) return 'medium';

  // Check for trend consistency
  let consistentMoves = 0;
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1].price;
    const currentPrice = prices[i].price;
    const moveDirection = currentPrice > prevPrice ? 'up' : 
                         currentPrice < prevPrice ? 'down' : 'stable';
    
    if (moveDirection === direction || direction === 'stable') {
      consistentMoves++;
    }
  }

  const consistencyRatio = consistentMoves / (prices.length - 1);
  
  if (consistencyRatio > 0.7) return 'high';
  if (consistencyRatio > 0.5) return 'medium';
  return 'low';
}

/**
 * Calculate volatility metrics for a price history
 */
export function calculateVolatility(priceHistory: PriceHistoryPoint[]): VolatilityMetrics | null {
  if (!priceHistory || priceHistory.length < 2) {
    return null;
  }

  const prices = priceHistory.map(p => p.price).filter(p => p > 0);
  if (prices.length < 2) return null;

  // Calculate standard deviation
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const standardDeviation = Math.sqrt(variance);

  // Calculate volatility level as coefficient of variation
  const coefficientOfVariation = standardDeviation / mean;
  let volatilityLevel: 'low' | 'medium' | 'high';
  
  if (coefficientOfVariation < 0.1) {
    volatilityLevel = 'low';
  } else if (coefficientOfVariation < 0.3) {
    volatilityLevel = 'medium';
  } else {
    volatilityLevel = 'high';
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const current = prices[prices.length - 1];

  return {
    standardDeviation,
    volatilityLevel,
    priceRange: {
      min,
      max,
      current
    }
  };
}

/**
 * Get a complete trend analysis for a card's price history
 */
export function analyzePriceTrends(priceHistory: PriceHistoryPoint[]): PriceTrendAnalysis {
  return {
    trend7d: calculateTrend(priceHistory, '7d'),
    trend30d: calculateTrend(priceHistory, '30d'),
    volatility: calculateVolatility(priceHistory),
    lastUpdated: new Date()
  };
}

/**
 * Format trend data for display
 */
export function formatTrendDisplay(trend: TrendData | null): {
  arrow: string;
  text: string;
  colorClass: string;
} {
  if (!trend) {
    return {
      arrow: '–',
      text: 'No data',
      colorClass: 'text-muted-foreground'
    };
  }

  const { direction, changePercent, confidence } = trend;
  const absPercent = Math.abs(changePercent);
  
  let arrow: string;
  let colorClass: string;
  
  switch (direction) {
    case 'up':
      arrow = '↑';
      colorClass = 'text-green-600';
      break;
    case 'down':
      arrow = '↓';
      colorClass = 'text-red-600';
      break;
    case 'stable':
      arrow = '↔';
      colorClass = 'text-muted-foreground';
      break;
  }

  // Adjust opacity based on confidence
  if (confidence === 'low') {
    colorClass += ' opacity-60';
  } else if (confidence === 'medium') {
    colorClass += ' opacity-80';
  }

  const text = `${absPercent.toFixed(1)}%`;

  return {
    arrow,
    text,
    colorClass
  };
}

/**
 * Get volatility badge info
 */
export function getVolatilityBadge(volatility: VolatilityMetrics | null): {
  text: string;
  colorClass: string;
  show: boolean;
} {
  if (!volatility) {
    return { text: '', colorClass: '', show: false };
  }

  const { volatilityLevel } = volatility;
  
  switch (volatilityLevel) {
    case 'high':
      return {
        text: 'High Vol',
        colorClass: 'bg-red-100 text-red-800 border-red-200',
        show: true
      };
    case 'medium':
      return {
        text: 'Med Vol',
        colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        show: false // Only show high volatility by default
      };
    case 'low':
      return {
        text: 'Low Vol',
        colorClass: 'bg-green-100 text-green-800 border-green-200',
        show: false
      };
  }
}
