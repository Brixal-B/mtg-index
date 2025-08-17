'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Portfolio } from '@/lib/types';

interface PortfolioOverviewChartProps {
  portfolios: Portfolio[];
  timeframe: '7d' | '30d' | '90d' | '1y';
}

export function PortfolioOverviewChart({ portfolios, timeframe }: PortfolioOverviewChartProps) {
  const chartData = useMemo(() => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const data = [];
    const now = new Date();

    // Calculate total portfolio value
    const currentTotalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const currentTotalCost = portfolios.reduce((sum, p) => sum + p.totalCost, 0);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate historical values with some random variation
      // In a real app, this would come from stored historical data
      const randomFactor = 0.95 + (Math.random() * 0.1); // ±5% variation
      const daysFactor = 1 - (i / days) * 0.1; // Slight upward trend over time
      
      const simulatedValue = currentTotalValue * randomFactor * daysFactor;
      const simulatedCost = currentTotalCost; // Cost remains constant
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(simulatedValue * 100) / 100,
        cost: Math.round(simulatedCost * 100) / 100,
        gainLoss: Math.round((simulatedValue - simulatedCost) * 100) / 100,
      });
    }

    return data;
  }, [portfolios, timeframe]);

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
        <h3 className="text-lg font-semibold text-foreground mb-2">Portfolio Value Over Time</h3>
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






