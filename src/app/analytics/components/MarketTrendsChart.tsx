'use client';

import { TrendingUp } from 'lucide-react';

interface MarketTrendsChartProps {
  timeframe: '7d' | '30d' | '90d' | '1y';
}

export function MarketTrendsChart({ timeframe }: MarketTrendsChartProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Market Trends</h3>
          <div className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
            <span>No Data Available</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Market trends unavailable - requires integration with external market data provider
        </p>
      </div>

      <div className="h-80 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
        <div className="text-center space-y-3">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto" />
          <div className="space-y-1">
            <div className="text-gray-600 font-medium">No Market Data</div>
            <div className="text-xs text-gray-500 max-w-xs">
              To display market trends, integrate with an external market data provider like MTGStocks or TCGPlayer API
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Market Index</p>
          <p className="text-lg font-semibold text-gray-400">--</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">24h Change</p>
          <p className="text-lg font-semibold text-gray-400">--</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Avg Volume</p>
          <p className="text-lg font-semibold text-gray-400">--</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Volatility</p>
          <p className="text-lg font-semibold text-gray-400">--</p>
        </div>
      </div>

      {/* Market Insights */}
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-md font-medium text-foreground mb-2">Market Insights</h4>
        <div className="text-sm text-gray-500">
          Market insights will be available once market data is integrated.
        </div>
      </div>
    </div>
  );
}