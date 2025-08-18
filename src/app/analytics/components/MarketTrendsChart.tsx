'use client';

import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { marketDataService } from '@/lib/services/marketDataService';

interface MarketTrendsChartProps {
  timeframe: '7d' | '30d' | '90d' | '1y';
}

export function MarketTrendsChart({ timeframe }: MarketTrendsChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = useMemo(() => {
    if (!isClient) return [];
    
    // Use the new market data service for realistic MTG market trends
    return marketDataService.generateMarketTrends(timeframe);
  }, [timeframe, isClient]);

  const formatNumber = (value: number, type: 'currency' | 'index' | 'volume' | 'percent') => {
    switch (type) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'index':
        return value.toFixed(1);
      case 'volume':
        return `${(value / 1000).toFixed(1)}k`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Market Index' ? formatNumber(entry.value, 'index') :
                            entry.name === 'Volume' ? formatNumber(entry.value, 'volume') :
                            entry.name === 'Avg Price' ? formatNumber(entry.value, 'currency') :
                            formatNumber(entry.value, 'percent')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate trend indicators
  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const marketChange = latestData && previousData 
    ? ((latestData.marketIndex - previousData.marketIndex) / previousData.marketIndex) * 100
    : 0;

  const avgVolatility = chartData.reduce((sum, d) => sum + d.volatility, 0) / chartData.length;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Market Trends</h3>
          <div className="flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
            <span>Simulated Market</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Simulated MTG market overview - actual market trends vary by format and individual cards
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="marketGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                });
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatNumber(value, 'index')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="marketIndex"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#marketGradient)"
              strokeWidth={2}
              name="Market Index"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Market Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Market Index</p>
          <p className="text-lg font-semibold text-foreground">
            {formatNumber(latestData?.marketIndex || 0, 'index')}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">24h Change</p>
          <p className={`text-lg font-semibold ${
            marketChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {marketChange >= 0 ? '+' : ''}{formatNumber(marketChange, 'percent')}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Avg Volume</p>
          <p className="text-lg font-semibold text-foreground">
            {formatNumber(
              chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length, 
              'volume'
            )}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Volatility</p>
          <p className={`text-lg font-semibold ${
            avgVolatility > 7 ? 'text-red-600' : avgVolatility > 4 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {formatNumber(avgVolatility, 'percent')}
          </p>
        </div>
      </div>

      {/* Market Insights */}
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-md font-medium text-foreground mb-2">Market Insights</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Sentiment:</span>
            <span className={`font-medium ${
              marketChange > 2 ? 'text-green-600' : 
              marketChange < -2 ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {marketChange > 2 ? 'Bullish' : marketChange < -2 ? 'Bearish' : 'Neutral'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trading Activity:</span>
            <span className="font-medium text-foreground">
              {latestData?.volume > 1200 ? 'High' : latestData?.volume > 800 ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Risk:</span>
            <span className={`font-medium ${
              avgVolatility > 7 ? 'text-red-600' : avgVolatility > 4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {avgVolatility > 7 ? 'High' : avgVolatility > 4 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}







