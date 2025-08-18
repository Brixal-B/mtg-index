'use client';

import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Info, RefreshCw } from 'lucide-react';
import { MTGCard, PriceHistory } from '@/lib/types';
import { getPriceHistoryForCard } from '@/lib/api/mtgjson';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

interface EnhancedPriceChartProps {
  card: MTGCard;
  timeframe?: '7d' | '30d' | '90d';
  showFoilPrices?: boolean;
  height?: number;
}

interface ChartDataPoint {
  date: string;
  normalPrice?: number;
  foilPrice?: number;
  dateFormatted: string;
}

export function EnhancedPriceChart({ 
  card, 
  timeframe = '30d', 
  showFoilPrices = false,
  height = 300 
}: EnhancedPriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'mtgjson' | 'mock'>('mock');

  useEffect(() => {
    loadPriceHistory();
  }, [card.id, timeframe]);

  const loadPriceHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const history = await getPriceHistoryForCard(card);
      
      if (history) {
        setPriceHistory(history);
        setDataSource(history.provider === 'mtgjson' ? 'mtgjson' : 'mock');
      } else {
        // Fallback to mock data
        setPriceHistory(generateMockPriceHistory());
        setDataSource('mock');
      }
    } catch (err) {
      console.error('Error loading price history:', err);
      setError('Failed to load price history');
      // Generate mock data as fallback
      setPriceHistory(generateMockPriceHistory());
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  };

  const generateMockPriceHistory = (): PriceHistory => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const currentPrice = card.prices.usd || 1;
    const prices = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const variation = (Math.random() - 0.5) * 0.1;
      const price = Math.max(0.01, currentPrice * (1 + variation));
      
      prices.push({
        cardId: card.id,
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        priceType: 'usd' as const,
      });

      if (showFoilPrices && card.prices.usdFoil) {
        const foilVariation = (Math.random() - 0.5) * 0.12;
        const foilPrice = Math.max(0.01, card.prices.usdFoil * (1 + foilVariation));
        
        prices.push({
          cardId: card.id,
          date: date.toISOString().split('T')[0],
          price: Math.round(foilPrice * 100) / 100,
          priceType: 'usdFoil' as const,
        });
      }
    }

    return {
      cardId: card.id,
      prices,
      trend: 'stable',
      volatility: 0.1,
      averagePrice: currentPrice,
      provider: 'mock',
    };
  };

  const chartData = useMemo(() => {
    if (!priceHistory) return [];

    const dataMap = new Map<string, ChartDataPoint>();
    
    priceHistory.prices.forEach(price => {
      const existing = dataMap.get(price.date) || {
        date: price.date,
        dateFormatted: new Date(price.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };

      if (price.priceType === 'usd') {
        existing.normalPrice = price.price;
      } else if (price.priceType === 'usdFoil') {
        existing.foilPrice = price.price;
      }

      dataMap.set(price.date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [priceHistory]);

  const priceStats = useMemo(() => {
    if (!priceHistory || priceHistory.prices.length === 0) {
      return {
        currentPrice: card.prices.usd || 0,
        change: 0,
        changePercent: 0,
        trend: 'stable' as const,
      };
    }

    const normalPrices = priceHistory.prices
      .filter(p => p.priceType === 'usd')
      .map(p => p.price);

    if (normalPrices.length < 2) {
      return {
        currentPrice: normalPrices[0] || 0,
        change: 0,
        changePercent: 0,
        trend: 'stable' as const,
      };
    }

    const currentPrice = normalPrices[normalPrices.length - 1];
    const previousPrice = normalPrices[normalPrices.length - 2];
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

    return {
      currentPrice,
      change,
      changePercent,
      trend: priceHistory.trend,
    };
  }, [priceHistory, card.prices.usd]);

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatChange = (change: number) => 
    `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
  const formatChangePercent = (percent: number) => 
    `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadPriceHistory}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Price History</h3>
            <p className="text-sm text-muted-foreground">{card.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            {dataSource === 'mock' && (
              <div className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Info className="h-3 w-3" />
                <span>Demo Data</span>
              </div>
            )}
            {dataSource === 'mtgjson' && (
              <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Info className="h-3 w-3" />
                <span>MTGJSON Data</span>
              </div>
            )}
          </div>
        </div>

        {/* Price Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-xl font-bold text-foreground">
              {formatPrice(priceStats.currentPrice)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Change</p>
            <p className={`text-xl font-bold ${getTrendColor(priceStats.trend)}`}>
              {formatChange(priceStats.change)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Change %</p>
            <p className={`text-xl font-bold ${getTrendColor(priceStats.trend)}`}>
              {formatChangePercent(priceStats.changePercent)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Trend</p>
            <div className="flex items-center justify-center">
              {getTrendIcon(priceStats.trend)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="dateFormatted" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={formatPrice}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {entry.name}: {formatPrice(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="normalPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Normal"
                connectNulls={false}
              />
              {showFoilPrices && (
                <Line
                  type="monotone"
                  dataKey="foilPrice"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Foil"
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
