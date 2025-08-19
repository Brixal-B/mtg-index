'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, PieChart, BarChart3, Target, AlertTriangle, Star } from 'lucide-react';
import { Portfolio, InvestmentAnalytics } from '@/lib/types';
import { getPortfolios, getWatchlist } from '@/lib/utils/localStorage';
import { getCard } from '@/lib/api/scryfall';
import { PortfolioOverviewChart } from './components/PortfolioOverviewChart';
import { PerformanceChart } from './components/PerformanceChart';
import { DiversificationChart } from './components/DiversificationChart';
import { TopPerformersTable } from './components/TopPerformersTable';
import { MarketTrendsChart } from './components/MarketTrendsChart';
import { WatchlistPerformance } from './components/WatchlistPerformance';
import { AccuratePortfolioTimeline } from './components/AccuratePortfolioTimeline';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export default function AnalyticsPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<InvestmentAnalytics | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const savedPortfolios = getPortfolios();
        setPortfolios(savedPortfolios);

        if (savedPortfolios.length > 0) {
          const combinedAnalytics = calculateInvestmentAnalytics(savedPortfolios);
          setAnalytics(combinedAnalytics);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const calculateInvestmentAnalytics = (portfolios: Portfolio[]): InvestmentAnalytics => {
    const allCards = portfolios.flatMap(p => p.cards);
    
    if (allCards.length === 0) {
      return {
        portfolioValue: 0,
        totalGainLoss: 0,
        percentageReturn: 0,
        bestPerformingCard: null,
        worstPerformingCard: null,
        diversification: {
          bySet: {},
          byRarity: {},
          byColor: {},
        },
        riskScore: 0,
      };
    }

    const totalValue = allCards.reduce((sum, card) => {
      const currentPrice = card.card.prices.usd || 0;
      return sum + (currentPrice * card.quantity);
    }, 0);

    const totalCost = allCards.reduce((sum, card) => {
      return sum + (card.purchasePrice * card.quantity);
    }, 0);

    const totalGainLoss = totalValue - totalCost;
    const percentageReturn = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Find best and worst performing cards
    const cardPerformances = allCards.map(card => {
      const currentPrice = card.card.prices.usd || 0;
      const totalCardValue = currentPrice * card.quantity;
      const totalCardCost = card.purchasePrice * card.quantity;
      const cardGainLoss = totalCardValue - totalCardCost;
      return { card, gainLoss: cardGainLoss };
    });

    cardPerformances.sort((a, b) => b.gainLoss - a.gainLoss);
    const bestPerformingCard = cardPerformances[0]?.card || null;
    const worstPerformingCard = cardPerformances[cardPerformances.length - 1]?.card || null;

    // Calculate diversification
    const bySet: Record<string, number> = {};
    const byRarity: Record<string, number> = {};
    const byColor: Record<string, number> = {};

    allCards.forEach(card => {
      const cardValue = (card.card.prices.usd || 0) * card.quantity;
      
      // By set
      bySet[card.card.setName] = (bySet[card.card.setName] || 0) + cardValue;
      
      // By rarity
      byRarity[card.card.rarity] = (byRarity[card.card.rarity] || 0) + cardValue;
      
      // By color
      if (card.card.colors.length === 0) {
        byColor['Colorless'] = (byColor['Colorless'] || 0) + cardValue;
      } else {
        card.card.colors.forEach(color => {
          byColor[color] = (byColor[color] || 0) + cardValue;
        });
      }
    });

    // Calculate risk score (simplified - based on portfolio concentration)
    const setValues = Object.values(bySet);
    const maxSetValue = Math.max(...setValues);
    const setConcentration = maxSetValue / totalValue;
    const riskScore = Math.min(100, setConcentration * 100); // Higher concentration = higher risk

    return {
      portfolioValue: totalValue,
      totalGainLoss,
      percentageReturn,
      bestPerformingCard,
      worstPerformingCard,
      diversification: { bySet, byRarity, byColor },
      riskScore,
    };
  };

  const summaryStats = useMemo(() => {
    if (!analytics) return [];

    return [
      {
        title: 'Total Portfolio Value',
        value: `$${analytics.portfolioValue.toFixed(2)}`,
        icon: PieChart,
        color: 'text-blue-500',
      },
      {
        title: 'Total Gain/Loss',
        value: `${analytics.totalGainLoss >= 0 ? '+' : ''}$${analytics.totalGainLoss.toFixed(2)}`,
        icon: analytics.totalGainLoss >= 0 ? TrendingUp : TrendingUp,
        color: analytics.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500',
      },
      {
        title: 'Percentage Return',
        value: `${analytics.percentageReturn >= 0 ? '+' : ''}${analytics.percentageReturn.toFixed(1)}%`,
        icon: BarChart3,
        color: analytics.percentageReturn >= 0 ? 'text-green-500' : 'text-red-500',
      },
      {
        title: 'Risk Score',
        value: `${analytics.riskScore.toFixed(0)}/100`,
        icon: analytics.riskScore > 70 ? AlertTriangle : Target,
        color: analytics.riskScore > 70 ? 'text-orange-500' : analytics.riskScore > 40 ? 'text-yellow-500' : 'text-green-500',
      },
    ];
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Investment Analytics</h1>
          </div>
          <p className="text-muted-foreground">
            Analyze your MTG investment performance and market trends
          </p>
        </div>

        <div className="text-center py-12 space-y-4">
          <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">No portfolio data</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create a portfolio and add some cards to see detailed investment analytics and performance insights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Investment Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive analysis of your MTG investment portfolio performance
        </p>
      </div>

      {/* Time Frame Selector */}
      <div className="flex justify-center">
        <div className="flex bg-accent rounded-lg p-1">
          {(['7d', '30d', '90d', '1y'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {timeframe === '7d' ? '7 Days' : 
               timeframe === '30d' ? '30 Days' : 
               timeframe === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-accent ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline Tracking (Proof of Concept) */}
      <AccuratePortfolioTimeline 
        portfolios={portfolios}
        timeframe={selectedTimeframe}
      />

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Portfolio Overview */}
        <PortfolioOverviewChart 
          portfolios={portfolios}
          timeframe={selectedTimeframe}
        />

        {/* Performance Chart */}
        <PerformanceChart 
          portfolios={portfolios}
          timeframe={selectedTimeframe}
        />

        {/* Diversification Chart */}
        <DiversificationChart 
          analytics={analytics}
        />

        {/* Market Trends */}
        <MarketTrendsChart 
          timeframe={selectedTimeframe}
        />
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <TopPerformersTable 
          portfolios={portfolios}
          type="best"
        />

        <TopPerformersTable 
          portfolios={portfolios}
          type="worst"
        />
      </div>

      {/* Watchlist Performance */}
      <WatchlistPerformance 
        timeframe={selectedTimeframe}
      />
    </div>
  );
}







