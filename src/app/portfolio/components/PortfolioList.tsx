'use client';

import { useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { Portfolio } from '@/lib/types';
import { deletePortfolio } from '@/lib/utils/localStorage';

interface PortfolioListProps {
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  onSelectPortfolio: (portfolio: Portfolio) => void;
  onDeletePortfolio: (portfolioId: string) => void;
}

export function PortfolioList({
  portfolios,
  selectedPortfolio,
  onSelectPortfolio,
  onDeletePortfolio,
}: PortfolioListProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const handleDeletePortfolio = (portfolioId: string) => {
    if (confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
      deletePortfolio(portfolioId);
      onDeletePortfolio(portfolioId);
    }
    setExpandedMenu(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Your Portfolios</h2>
      
      <div className="space-y-2">
        {portfolios.map((portfolio) => {
          const isSelected = selectedPortfolio?.id === portfolio.id;
          const performance = portfolio.totalCost > 0 
            ? ((portfolio.totalValue - portfolio.totalCost) / portfolio.totalCost) * 100 
            : 0;
          const gainLoss = portfolio.totalValue - portfolio.totalCost;

          return (
            <div
              key={portfolio.id}
              className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
              onClick={() => onSelectPortfolio(portfolio)}
            >
              {/* Portfolio Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {portfolio.name}
                  </h3>
                  {portfolio.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {portfolio.description}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cards:</span>
                      <span className="font-medium">{portfolio.cards.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="font-medium">${portfolio.totalValue.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Performance:</span>
                      <div className={`flex items-center space-x-1 ${
                        performance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {performance >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="font-medium">
                          {performance >= 0 ? '+' : ''}{performance.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedMenu(expandedMenu === portfolio.id ? null : portfolio.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {expandedMenu === portfolio.id && (
                    <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePortfolio(portfolio.id);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className={`text-xs font-medium ${
                  gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} total
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}







