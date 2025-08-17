'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { InvestmentAnalytics } from '@/lib/types';

interface DiversificationChartProps {
  analytics: InvestmentAnalytics | null;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 60%)',
  'hsl(280, 70%, 60%)',
  'hsl(340, 70%, 60%)',
  'hsl(40, 70%, 60%)',
  'hsl(120, 70%, 60%)',
  'hsl(180, 70%, 60%)',
  'hsl(260, 70%, 60%)',
];

const rarityColors = {
  common: 'hsl(210, 10%, 60%)',
  uncommon: 'hsl(210, 15%, 45%)',
  rare: 'hsl(45, 70%, 55%)',
  mythic: 'hsl(15, 70%, 55%)',
};

const colorIdentityColors = {
  W: 'hsl(45, 70%, 85%)',
  U: 'hsl(210, 70%, 60%)',
  B: 'hsl(0, 0%, 20%)',
  R: 'hsl(0, 70%, 60%)',
  G: 'hsl(120, 70%, 45%)',
  Colorless: 'hsl(0, 0%, 50%)',
};

export function DiversificationChart({ analytics }: DiversificationChartProps) {
  const { setData, rarityData, colorData } = useMemo(() => {
    if (!analytics) {
      return { setData: [], rarityData: [], colorData: [] };
    }

    const setData = Object.entries(analytics.diversification.bySet)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 sets

    const rarityData = Object.entries(analytics.diversification.byRarity)
      .map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value,
        color: rarityColors[name as keyof typeof rarityColors] || COLORS[0]
      }));

    const colorData = Object.entries(analytics.diversification.byColor)
      .map(([name, value]) => ({ 
        name, 
        value,
        color: colorIdentityColors[name as keyof typeof colorIdentityColors] || COLORS[0]
      }));

    return { setData, rarityData, colorData };
  }, [analytics]);

  const formatCurrency = (value: number) => `$${value.toFixed(0)}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-primary">
            Value: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {((data.value / analytics!.portfolioValue) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!analytics || analytics.portfolioValue === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Portfolio Diversification</h3>
          <p className="text-sm text-muted-foreground">
            Analyze your portfolio distribution across sets, rarities, and colors
          </p>
        </div>
        <div className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No portfolio data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Portfolio Diversification</h3>
        <p className="text-sm text-muted-foreground">
          Distribution of your portfolio value across different categories
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* By Set */}
        <div>
          <h4 className="text-md font-medium text-foreground mb-3 text-center">By Set</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={setData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={CustomLabel}
                  labelLine={false}
                >
                  {setData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {setData.slice(0, 3).map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="truncate">{entry.name}: {formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Rarity */}
        <div>
          <h4 className="text-md font-medium text-foreground mb-3 text-center">By Rarity</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rarityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={CustomLabel}
                  labelLine={false}
                >
                  {rarityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {rarityData.map((entry) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}: {formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Color */}
        <div>
          <h4 className="text-md font-medium text-foreground mb-3 text-center">By Color</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={colorData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={CustomLabel}
                  labelLine={false}
                >
                  {colorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {colorData.map((entry) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}: {formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-foreground">Diversification Score</h4>
            <p className="text-sm text-muted-foreground">
              Lower concentration = better diversification
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              analytics.riskScore > 70 ? 'text-red-600' : 
              analytics.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {(100 - analytics.riskScore).toFixed(0)}/100
            </div>
            <p className="text-sm text-muted-foreground">
              Risk Score: {analytics.riskScore.toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}





