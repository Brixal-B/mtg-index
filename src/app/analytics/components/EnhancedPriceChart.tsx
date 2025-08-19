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
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Portfolio, PortfolioCard, PriceHistory } from '@/lib/types';
import { batchGetPriceHistories } from '@/lib/api/mtgjson';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

interface EnhancedPriceChartProps {
  portfolios: Portfolio[];
  timeframe: '7d' | '30d' | '90d' | '1y';
  showIndividualCards?: boolean;
  maxCardsToShow?: number;
}

interface ChartDataPoint {
  date: string;
  formattedDate: string;
  totalValue: number;
  [cardId: string]: any; // Individual card values
}

interface CardPerformance {
  card: PortfolioCard;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  priceHistory?: PriceHistory;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
];

export function EnhancedPriceChart({ 
  portfolios, 
  timeframe,
  showIndividualCards = false,
  maxCardsToShow = 5
}: EnhancedPriceChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceHistories, setPriceHistories] = useState<Map<string, PriceHistory>>(new Map());
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get all unique cards from portfolios
  const allCards = useMemo(() => {
    const cardMap = new Map<string, PortfolioCard>();
    
    portfolios.forEach(portfolio => {
      portfolio.cards.forEach(portfolioCard => {
        const existing = cardMap.get(portfolioCard.cardId);
        if (existing) {
          existing.quantity += portfolioCard.quantity;
        } else {
          cardMap.set(portfolioCard.cardId, { ...portfolioCard });
        }
      });
    });

    return Array.from(cardMap.values()).sort((a, b) => {
      const aValue = (a.card.prices.usd || 0) * a.quantity;
      const bValue = (b.card.prices.usd || 0) * b.quantity;
      return bValue - aValue; // Sort by total value descending
    });
  }, [portfolios]);

  // Get top valuable cards for default selection
  useEffect(() => {
    if (allCards.length > 0 && selectedCards.length === 0) {
      const topCards = allCards.slice(0, maxCardsToShow).map(card => card.cardId);
      setSelectedCards(topCards);
    }
  }, [allCards, maxCardsToShow, selectedCards.length]);

  useEffect(() => {
    let isCancelled = false;

    const loadPriceData = async () => {
      if (!isClient || allCards.length === 0) return;

      setLoading(true);

      try {
        // Get price histories for all cards
        const cards = allCards.map(pc => pc.card);
        const histories = await batchGetPriceHistories(cards);
        
        if (!isCancelled) {
          setPriceHistories(histories);
          
          // Generate chart data
          const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
          const chartPoints: ChartDataPoint[] = [];
          
          for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dataPoint: ChartDataPoint = {
              date: dateStr,
              formattedDate: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              totalValue: 0
            };
            
            // Calculate portfolio value for this date
            portfolios.forEach(portfolio => {
              portfolio.cards.forEach(portfolioCard => {
                const history = histories.get(portfolioCard.cardId);
                let priceForDate = portfolioCard.card.prices.usd || 0;
                
                if (history) {
                  // Find price for this specific date or closest previous date
                  const pricePoints = history.prices
                    .filter(p => p.priceType === 'usd' && p.date <= dateStr)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  
                  if (pricePoints.length > 0) {
                    priceForDate = pricePoints[0].price;
                  }
                } else {
                  // Generate mock historical price based on current price and some volatility
                  const volatility = 0.1; // 10% daily volatility
                  const randomFactor = (Math.random() - 0.5) * volatility;
                  const trendFactor = Math.sin(i / days * Math.PI) * 0.05; // Slight trend
                  priceForDate = (portfolioCard.card.prices.usd || 0) * (1 + randomFactor + trendFactor);
                }
                
                const cardValue = priceForDate * portfolioCard.quantity;
                dataPoint.totalValue += cardValue;
                
                // Add individual card data if showing individual cards
                if (showIndividualCards && selectedCards.includes(portfolioCard.cardId)) {
                  dataPoint[portfolioCard.cardId] = cardValue;
                }
              });
            });
            
            chartPoints.push(dataPoint);
          }
          
          setChartData(chartPoints);
        }
      } catch (error) {
        console.error('Error loading price data:', error);
        if (!isCancelled) {
          // Generate fallback mock data
          generateMockChartData();
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    const generateMockChartData = () => {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
      const currentTotalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
      const chartPoints: ChartDataPoint[] = [];
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Generate realistic portfolio value variation
        const volatility = 0.08; // 8% daily volatility for portfolio
        const randomFactor = (Math.random() - 0.5) * volatility;
        const trendFactor = Math.sin(i / days * Math.PI) * 0.03; // Slight upward trend
        const dayValue = currentTotalValue * (1 + randomFactor + trendFactor);
        
        const dataPoint: ChartDataPoint = {
          date: dateStr,
          formattedDate: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          totalValue: Math.max(0, dayValue)
        };
        
        // Add individual card mock data
        if (showIndividualCards) {
          selectedCards.forEach((cardId, index) => {
            const card = allCards.find(c => c.cardId === cardId);
            if (card) {
              const cardCurrentValue = (card.card.prices.usd || 0) * card.quantity;
              const cardDayValue = cardCurrentValue * (1 + randomFactor * 1.2 + trendFactor);
              dataPoint[cardId] = Math.max(0, cardDayValue);
            }
          });
        }
        
        chartPoints.push(dataPoint);
      }
      
      setChartData(chartPoints);
    };

    loadPriceData();

    return () => {
      isCancelled = true;
    };
  }, [portfolios, timeframe, allCards, showIndividualCards, selectedCards, isClient]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const currentValue = chartData[chartData.length - 1]?.totalValue || 0;
    const previousValue = chartData[0]?.totalValue || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    // Calculate 24h change if we have enough data
    const change24h = chartData.length > 1 ? 
      chartData[chartData.length - 1].totalValue - chartData[chartData.length - 2].totalValue : 0;
    const change24hPercent = chartData.length > 1 && chartData[chartData.length - 2].totalValue > 0 ?
      (change24h / chartData[chartData.length - 2].totalValue) * 100 : 0;

    return {
      currentValue,
      change,
      changePercent,
      change24h,
      change24hPercent,
      trend: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'stable'
    };
  }, [chartData]);

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const handleCardToggle = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId].slice(0, maxCardsToShow)
    );
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-center h-80">
          <LoadingSpinner />
          <span className="ml-2 text-muted-foreground">Loading portfolio price history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Portfolio Value Over Time</h3>
          <p className="text-sm text-muted-foreground">
            {timeframe.toUpperCase()} • Total of {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {performanceMetrics && (
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(performanceMetrics.currentValue)}
              </p>
              <p className={`text-sm ${
                performanceMetrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(performanceMetrics.change)} ({formatPercent(performanceMetrics.changePercent)})
              </p>
            </div>
          )}
          
          {showIndividualCards && (
            <button
              onClick={() => setShowCardSelector(!showCardSelector)}
              className="flex items-center space-x-1 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">Cards</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showCardSelector ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Card Selector */}
      {showIndividualCards && showCardSelector && (
        <div className="mb-6 p-4 border border-border rounded-lg bg-accent">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Select cards to display (max {maxCardsToShow}):
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {allCards.slice(0, 20).map((portfolioCard) => (
              <button
                key={portfolioCard.cardId}
                onClick={() => handleCardToggle(portfolioCard.cardId)}
                disabled={!selectedCards.includes(portfolioCard.cardId) && selectedCards.length >= maxCardsToShow}
                className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${
                  selectedCards.includes(portfolioCard.cardId)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent border border-border'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="truncate">{portfolioCard.card.name}</span>
                <span className="ml-2 text-xs">
                  {formatCurrency((portfolioCard.card.prices.usd || 0) * portfolioCard.quantity)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      {performanceMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(performanceMetrics.currentValue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">24h Change</p>
            <p className={`font-semibold ${
              performanceMetrics.change24hPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercent(performanceMetrics.change24hPercent)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{timeframe.toUpperCase()} Change</p>
            <p className={`font-semibold ${
              performanceMetrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercent(performanceMetrics.changePercent)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Trend</p>
            <div className="flex items-center justify-center">
              {performanceMetrics.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : performanceMetrics.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <DollarSign className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
              formatter={(value: number, name: string) => {
                const cardName = name === 'totalValue' ? 'Total Portfolio' : 
                  allCards.find(c => c.cardId === name)?.card.name || name;
                return [formatCurrency(value), cardName];
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            
            {/* Total portfolio value area */}
            <Area
              type="monotone"
              dataKey="totalValue"
              fill="#3B82F6"
              fillOpacity={0.1}
              stroke="#3B82F6"
              strokeWidth={2}
              name="Total Portfolio"
            />
            
            {/* Individual card lines */}
            {showIndividualCards && selectedCards.map((cardId, index) => {
              const card = allCards.find(c => c.cardId === cardId);
              if (!card) return null;
              
              return (
                <Line
                  key={cardId}
                  type="monotone"
                  dataKey={cardId}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  name={card.card.name}
                  strokeDasharray={index % 2 === 1 ? "5 5" : undefined}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        Price data combines current Scryfall prices with {priceHistories.size > 0 ? 'MTGJSON historical data' : 'simulated historical trends'}
      </div>
    </div>
  );
}