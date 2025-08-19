'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Calendar,
  DollarSign,
  Activity,
  Info
} from 'lucide-react';
import { MTGCard, PriceHistory, ProcessedCardPrice } from '@/lib/types';
import { getPriceHistoryForCard } from '@/lib/api/mtgjson';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

interface PriceHistoryChartProps {
  card: MTGCard;
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
  showVolatility?: boolean;
  showMovingAverage?: boolean;
  height?: number;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  formattedDate: string;
  usd?: number;
  usdFoil?: number;
  eur?: number;
  eurFoil?: number;
  tix?: number;
  movingAverage?: number;
  volatility?: number;
  volume?: number;
}

interface PriceStats {
  current: number;
  high: number;
  low: number;
  average: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
}

export function PriceHistoryChart({ 
  card, 
  timeframe = '30d',
  showVolatility = false,
  showMovingAverage = true,
  height = 400,
  className = ''
}: PriceHistoryChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadPriceHistory = async () => {
      if (!isClient) return;
      
      setLoading(true);
      setError(null);

      try {
        const history = await getPriceHistoryForCard(card);
        
        if (!isCancelled) {
          if (history && history.prices.length > 0) {
            setPriceHistory(history);
          } else {
            // Generate fallback mock data for demonstration
            const mockHistory = generateMockPriceHistory(card, timeframe);
            setPriceHistory(mockHistory);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading price history:', err);
          setError('Failed to load price history');
          // Still generate mock data as fallback
          const mockHistory = generateMockPriceHistory(card, timeframe);
          setPriceHistory(mockHistory);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadPriceHistory();

    return () => {
      isCancelled = true;
    };
  }, [card.id, timeframe, isClient]);

  // Generate mock price history when real data isn't available
  const generateMockPriceHistory = (card: MTGCard, timeframe: string): PriceHistory => {
    const currentPrice = card.prices.usd || 1.0;
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    
    const prices: ProcessedCardPrice[] = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic price variation based on card rarity and current price
      const volatilityFactor = card.rarity === 'mythic' ? 0.15 : 
                              card.rarity === 'rare' ? 0.12 : 
                              card.rarity === 'uncommon' ? 0.08 : 0.05;
      
      const trendFactor = Math.sin(i / days * Math.PI * 2) * 0.1; // Seasonal variation
      const randomFactor = (Math.random() - 0.5) * volatilityFactor;
      const basePrice = currentPrice * (1 + trendFactor + randomFactor);
      
      const price = Math.max(0.01, basePrice);
      
      prices.push({
        cardId: card.id,
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        priceType: 'usd',
        volume: Math.floor(Math.random() * 100) + 10, // Mock volume
      });
      
      // Add foil prices if the card has foil pricing
      if (card.prices.usdFoil) {
        prices.push({
          cardId: card.id,
          date: date.toISOString().split('T')[0],
          price: Math.round(price * 1.5 * 100) / 100, // Foil typically 1.5x normal
          priceType: 'usdFoil',
          volume: Math.floor(Math.random() * 20) + 5,
        });
      }
    }
    
    // Calculate stats
    const usdPrices = prices.filter(p => p.priceType === 'usd').map(p => p.price);
    const averagePrice = usdPrices.reduce((sum, p) => sum + p, 0) / usdPrices.length;
    const variance = usdPrices.reduce((sum, p) => sum + Math.pow(p - averagePrice, 2), 0) / usdPrices.length;
    const volatility = Math.sqrt(variance);
    
    // Determine trend
    const recent = usdPrices.slice(-7);
    const previous = usdPrices.slice(-14, -7);
    const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
    const previousAvg = previous.reduce((sum, p) => sum + p, 0) / previous.length;
    
    const trend: 'up' | 'down' | 'stable' = 
      recentAvg > previousAvg * 1.05 ? 'up' :
      recentAvg < previousAvg * 0.95 ? 'down' : 'stable';

    return {
      cardId: card.id,
      prices,
      trend,
      volatility,
      averagePrice,
      percentChange24h: usdPrices.length >= 2 ? 
        ((usdPrices[usdPrices.length - 1] - usdPrices[usdPrices.length - 2]) / usdPrices[usdPrices.length - 2]) * 100 : 0,
      percentChange7d: ((recentAvg - previousAvg) / previousAvg) * 100,
      lastUpdated: new Date().toISOString(),
      provider: 'mock'
    };
  };

  // Process price history data for chart
  const chartData = useMemo(() => {
    if (!priceHistory || !isClient) return [];

    // Group prices by date
    const pricesByDate = new Map<string, ChartDataPoint>();
    
    priceHistory.prices.forEach(price => {
      const existing = pricesByDate.get(price.date) || {
        date: price.date,
        formattedDate: new Date(price.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
      };
      
      existing[price.priceType] = price.price;
      pricesByDate.set(price.date, existing);
    });

    const data = Array.from(pricesByDate.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate moving average if requested
    if (showMovingAverage && data.length > 0) {
      const window = Math.min(7, Math.floor(data.length / 4)); // 7-day or 25% of data window
      data.forEach((point, index) => {
        const start = Math.max(0, index - window + 1);
        const slice = data.slice(start, index + 1);
        const prices = slice.map(d => d.usd).filter(Boolean) as number[];
        if (prices.length > 0) {
          point.movingAverage = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        }
      });
    }

    return data;
  }, [priceHistory, showMovingAverage, isClient]);

  // Calculate price statistics
  const priceStats: PriceStats | null = useMemo(() => {
    if (!priceHistory) return null;

    const usdPrices = priceHistory.prices
      .filter(p => p.priceType === 'usd')
      .map(p => p.price);

    if (usdPrices.length === 0) return null;

    const current = usdPrices[usdPrices.length - 1];
    const high = Math.max(...usdPrices);
    const low = Math.min(...usdPrices);

    return {
      current,
      high,
      low,
      average: priceHistory.averagePrice,
      change24h: priceHistory.percentChange24h,
      change7d: priceHistory.percentChange7d,
      volatility: priceHistory.volatility,
      trend: priceHistory.trend
    };
  }, [priceHistory]);

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center" style={{ height }}>
          <LoadingSpinner />
          <span className="ml-2 text-muted-foreground">Loading price history...</span>
        </div>
      </div>
    );
  }

  if (error || !priceHistory) {
    return (
      <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Unable to load price history</p>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Price History</h3>
          <p className="text-sm text-muted-foreground">
            {card.name} • {timeframe.toUpperCase()}
            {priceHistory.provider === 'mock' && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                Demo Data
              </span>
            )}
          </p>
        </div>
        
        {priceStats && (
          <div className="flex items-center space-x-2">
            {getTrendIcon(priceStats.trend)}
            <span className={`font-medium ${getTrendColor(priceStats.trend)}`}>
              {formatPrice(priceStats.current)}
            </span>
          </div>
        )}
      </div>

      {/* Price Statistics */}
      {priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">High</p>
            <p className="font-semibold text-foreground">{formatPrice(priceStats.high)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Low</p>
            <p className="font-semibold text-foreground">{formatPrice(priceStats.low)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-semibold text-foreground">{formatPrice(priceStats.average)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {timeframe === '7d' ? '7d Change' : '24h Change'}
            </p>
            <p className={`font-semibold ${
              (priceStats.change7d || priceStats.change24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercent(priceStats.change7d || priceStats.change24h || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatPrice}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
              formatter={(value: number, name: string) => [
                formatPrice(value),
                name === 'usd' ? 'USD' : 
                name === 'usdFoil' ? 'USD Foil' :
                name === 'movingAverage' ? 'Moving Average' : name
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            
            {/* Main USD price line */}
            <Line
              type="monotone"
              dataKey="usd"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="USD"
            />
            
            {/* USD Foil price line */}
            {chartData.some(d => d.usdFoil) && (
              <Line
                type="monotone"
                dataKey="usdFoil"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                name="USD Foil"
                strokeDasharray="5 5"
              />
            )}
            
            {/* Moving average */}
            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                stroke="#10B981"
                strokeWidth={1}
                dot={false}
                name="Moving Average"
                strokeDasharray="2 2"
                opacity={0.7}
              />
            )}
            
            {/* Price reference lines */}
            {priceStats && (
              <>
                <ReferenceLine 
                  y={priceStats.average} 
                  stroke="#6B7280" 
                  strokeDasharray="1 3"
                  opacity={0.5}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer with data source info */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <Info className="h-3 w-3" />
          <span>
            Data source: {priceHistory.provider === 'mtgjson' ? 'MTGJSON' : 'Simulated'}
          </span>
        </div>
        <div>
          Last updated: {priceHistory.lastUpdated ? new Date(priceHistory.lastUpdated).toLocaleDateString() : 'Unknown'}
        </div>
      </div>
    </div>
  );
}

