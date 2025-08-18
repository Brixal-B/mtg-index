'use client';

import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Portfolio } from '@/lib/types';
import { Info } from 'lucide-react';
import { useBatchPriceTrends } from '@/lib/hooks/usePriceTrends';
import { PriceTrendAnalysis } from '@/lib/utils/priceAnalysis';
import { marketDataService } from '@/lib/services/marketDataService';

interface PortfolioOverviewChartProps {
  portfolios: Portfolio[];
  timeframe: '7d' | '30d' | '90d' | '1y';
}

export function PortfolioOverviewChart({ portfolios, timeframe }: PortfolioOverviewChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get all unique card IDs from portfolios
  const cardIds = useMemo(() => {
    const allCards = portfolios.flatMap(portfolio => 
      portfolio.cards.map(portfolioCard => portfolioCard.card.id)
    );
    // Remove duplicates
    return [...new Set(allCards)];
  }, [portfolios]);

  // Use the new batch price trends hook
  const { trendsMap, loading: loadingHistories } = useBatchPriceTrends(cardIds);

  // Check if we're using real current prices (even if historical is estimated)
  const usingRealPrices = useMemo(() => {
    // We have real current prices from Scryfall, but historical data is estimated
    return portfolios.length > 0 && portfolios.some(p => p.cards.length > 0);
  }, [portfolios]);

  const usingEstimatedHistory = useMemo(() => {
    // Historical portfolio values are estimated based on current prices and trends
    return true;
  }, []);

  const chartData = useMemo(() => {
    if (!isClient) return [];
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const data = [];
    const now = new Date();

    // Calculate current total portfolio value
    const currentTotalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const currentTotalCost = portfolios.reduce((sum, p) => sum + p.totalCost, 0);

    // Generate market trends for correlation
    const marketTrends = marketDataService.generateMarketTrends(timeframe);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      let totalValue = 0;
      let hasRealData = false;

      // Calculate portfolio value using trend data and mock price changes
      portfolios.forEach(portfolio => {
        portfolio.cards.forEach(portfolioCard => {
          const trends = trendsMap.get(portfolioCard.card.id);
          const currentPrice = portfolioCard.foil 
            ? portfolioCard.card.prices.usdFoil || portfolioCard.card.prices.usd || 0
            : portfolioCard.card.prices.usd || 0;
          
          let historicalPrice = currentPrice;
          
          if (trends) {
            // Use trend data to estimate historical price
            const daysAgo = i;
            const trend = days <= 7 ? trends.trend7d : trends.trend30d;
            
            if (trend) {
              // Calculate what the price would have been based on the trend
              const totalChangePercent = trend.changePercent;
              const dailyChangeRate = Math.pow(1 + (totalChangePercent / 100), 1 / days);
              
              // Calculate price at this historical point
              historicalPrice = currentPrice / Math.pow(dailyChangeRate, daysAgo);
              hasRealData = true;
            }
          }
          
          totalValue += historicalPrice * portfolioCard.quantity;
        });
      });

      // Use market correlation for more realistic estimation when no trend data is available
      if (!hasRealData) {
        const marketTrendPoint = marketTrends.find(trend => trend.date === dateString);
        const marketMultiplier = marketTrendPoint 
          ? marketTrendPoint.marketIndex / 100 // Normalize to 1.0 baseline
          : 1;

        // Apply market correlation to portfolio value
        totalValue = currentTotalValue * marketMultiplier;
      }
      
      const simulatedCost = currentTotalCost; // Cost remains constant
      
      data.push({
        date: dateString,
        value: Math.round(totalValue * 100) / 100,
        cost: Math.round(simulatedCost * 100) / 100,
        gainLoss: Math.round((totalValue - simulatedCost) * 100) / 100,
      });
    }

    return data;
  }, [portfolios, timeframe, isClient, trendsMap, usingRealPrices]);

  const formatCurrency = (value: number) => `$${value.toFixed(0)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-foreground">Portfolio Value Over Time</h3>
            {loadingHistories && (
              <div className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Info className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
              </div>
            )}

            {!loadingHistories && usingRealPrices && usingEstimatedHistory && (
              <div className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                <Info className="h-3 w-3" />
                <span>Real Prices, Estimated History</span>
              </div>
            )}
            {!loadingHistories && !usingRealPrices && (
              <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <Info className="h-3 w-3" />
                <span>Simulated Data</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your portfolio value and cost basis over the selected timeframe
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
              name="Portfolio Value"
            />
            <Line 
              type="monotone" 
              dataKey="cost" 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Total Cost"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Current Value</p>
          <p className="text-lg font-semibold text-primary">
            {formatCurrency(chartData[chartData.length - 1]?.value || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(chartData[chartData.length - 1]?.cost || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Gain/Loss</p>
          <p className={`text-lg font-semibold ${
            (chartData[chartData.length - 1]?.gainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(chartData[chartData.length - 1]?.gainLoss || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}







