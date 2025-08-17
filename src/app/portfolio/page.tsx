'use client';

import { useState, useEffect } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { Portfolio } from '@/lib/types';
import { getPortfolios } from '@/lib/utils/localStorage';
import { PortfolioList } from './components/PortfolioList';
import { PortfolioOverview } from './components/PortfolioOverview';
import { CreatePortfolioModal } from './components/CreatePortfolioModal';

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPortfolios = () => {
      try {
        const savedPortfolios = getPortfolios();
        setPortfolios(savedPortfolios);
        
        // Auto-select first portfolio if available
        if (savedPortfolios.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(savedPortfolios[0]);
        }
      } catch (error) {
        console.error('Error loading portfolios:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolios();
  }, [selectedPortfolio]);

  const handlePortfolioCreated = (portfolio: Portfolio) => {
    setPortfolios(prev => [...prev, portfolio]);
    setSelectedPortfolio(portfolio);
    setShowCreateModal(false);
  };

  const handlePortfolioDeleted = (portfolioId: string) => {
    setPortfolios(prev => prev.filter(p => p.id !== portfolioId));
    if (selectedPortfolio?.id === portfolioId) {
      const remaining = portfolios.filter(p => p.id !== portfolioId);
      setSelectedPortfolio(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handlePortfolioUpdated = (updatedPortfolio: Portfolio) => {
    setPortfolios(prev => prev.map(p => 
      p.id === updatedPortfolio.id ? updatedPortfolio : p
    ));
    if (selectedPortfolio?.id === updatedPortfolio.id) {
      setSelectedPortfolio(updatedPortfolio);
    }
  };

  // Calculate summary stats
  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalCost = portfolios.reduce((sum, p) => sum + p.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalPerformance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Portfolio Management</h1>
          </div>
          <p className="text-muted-foreground">
            Track your MTG card investments and monitor performance
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Portfolio</span>
        </button>
      </div>

      {/* Summary Stats */}
      {portfolios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Portfolios</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {portfolios.length}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-muted-foreground">Current Value</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${totalValue.toFixed(2)}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-muted-foreground">Total Cost</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${totalCost.toFixed(2)}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-muted-foreground">Gain/Loss</span>
            </div>
            <div className={`text-2xl font-bold ${
              totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)}
              <span className="text-sm ml-1">
                ({totalPerformance >= 0 ? '+' : ''}{totalPerformance.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {portfolios.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 space-y-4">
          <Wallet className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">No portfolios found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create your first portfolio to start tracking your MTG card investments and monitor their performance over time.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Your First Portfolio</span>
          </button>
        </div>
      ) : (
        /* Portfolio Content */
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Portfolio List */}
          <div className="lg:col-span-1">
            <PortfolioList
              portfolios={portfolios}
              selectedPortfolio={selectedPortfolio}
              onSelectPortfolio={setSelectedPortfolio}
              onDeletePortfolio={handlePortfolioDeleted}
            />
          </div>

          {/* Portfolio Overview */}
          <div className="lg:col-span-2">
            {selectedPortfolio ? (
              <PortfolioOverview
                portfolio={selectedPortfolio}
                onPortfolioUpdated={handlePortfolioUpdated}
              />
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select a Portfolio
                </h3>
                <p className="text-muted-foreground">
                  Choose a portfolio from the list to view its details and performance.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Portfolio Modal */}
      <CreatePortfolioModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPortfolioCreated={handlePortfolioCreated}
      />
    </div>
  );
}







