'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Portfolio } from '@/lib/types';

interface PerformanceChartProps {
  portfolios: Portfolio[];
  timeframe: '7d' | '30d' | '90d' | '1y';
}

export function PerformanceChart({ portfolios, timeframe }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    return portfolios.map(portfolio => {
      const gainLoss = portfolio.totalValue - portfolio.totalCost;
      const performance = portfolio.totalCost > 0 ? (gainLoss / portfolio.totalCost) * 100 : 0;
      
      return {
        name: portfolio.name.length > 15 ? portfolio.name.substring(0, 15) + '...' : portfolio.name,
        fullName: portfolio.name,
        value: portfolio.totalValue,
        cost: portfolio.totalCost,
        gainLoss,
        performance,
        cardCount: portfolio.cards.length,
      };
    });
  }, [portfolios]);

  const formatCurrency = (value: number) => `$${value.toFixed(0)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Current Value: <span className="text-foreground font-medium">{formatCurrency(data.value)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total Cost: <span className="text-foreground font-medium">{formatCurrency(data.cost)}</span>
            </p>
            <p className={`text-sm ${data.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Gain/Loss: <span className="font-medium">
                {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss)} 
                ({data.performance >= 0 ? '+' : ''}{data.performance.toFixed(1)}%)
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cards: <span className="text-foreground font-medium">{data.cardCount}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxValue = Math.max(...chartData.map(d => Math.max(d.value, d.cost)));

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Portfolio Performance Comparison</h3>
        <p className="text-sm text-muted-foreground">
          Compare current value vs. cost basis across all portfolios
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="cost" 
              fill="hsl(var(--muted-foreground))" 
              opacity={0.7}
              name="Total Cost"
            />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))" 
              name="Current Value"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Best Performer</p>
            {chartData.length > 0 && (
              <div>
                <p className="font-medium text-foreground">
                  {chartData.reduce((best, current) => 
                    current.performance > best.performance ? current : best
                  ).fullName}
                </p>
                <p className="text-sm text-green-600">
                  +{chartData.reduce((best, current) => 
                    current.performance > best.performance ? current : best
                  ).performance.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Portfolios</p>
            <p className="text-lg font-semibold text-foreground">{portfolios.length}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Avg Performance</p>
            <p className={`text-lg font-semibold ${
              chartData.reduce((sum, p) => sum + p.performance, 0) / chartData.length >= 0 
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {chartData.length > 0 
                ? `${(chartData.reduce((sum, p) => sum + p.performance, 0) / chartData.length).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}






