'use client';

import { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, Calendar, Package } from 'lucide-react';
import { PortfolioTransaction } from '@/lib/types';
import { PortfolioTimelineService } from '@/lib/services/portfolioTimelineService';

interface TransactionHistoryProps {
  portfolioId: string;
  className?: string;
}

export function TransactionHistory({ portfolioId, className = '' }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [portfolioId, timeRange]);

  const loadTransactions = () => {
    setLoading(true);
    
    try {
      let startDate = '';
      
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const date = new Date();
        date.setDate(date.getDate() - days);
        startDate = date.toISOString().split('T')[0];
      }
      
      const endDate = new Date().toISOString().split('T')[0];
      
      const transactionHistory = timeRange === 'all' 
        ? PortfolioTimelineService.getTransactions(portfolioId)
        : PortfolioTimelineService.getTransactionHistory(portfolioId, startDate, endDate);
      
      setTransactions(transactionHistory);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const getTransactionIcon = (type: PortfolioTransaction['type']) => {
    switch (type) {
      case 'add':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'remove':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionColor = (type: PortfolioTransaction['type']) => {
    switch (type) {
      case 'add':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'remove':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getTransactionText = (transaction: PortfolioTransaction) => {
    const { type, quantityChange, pricePerCard } = transaction;
    const absQuantity = Math.abs(quantityChange);
    const totalValue = absQuantity * pricePerCard;

    switch (type) {
      case 'add':
        return {
          action: 'Added',
          quantity: `+${absQuantity}`,
          value: `+${formatCurrency(totalValue)}`
        };
      case 'remove':
        return {
          action: 'Removed',
          quantity: `-${absQuantity}`,
          value: `-${formatCurrency(totalValue)}`
        };
      default:
        return {
          action: 'Updated',
          quantity: `${quantityChange >= 0 ? '+' : ''}${quantityChange}`,
          value: formatCurrency(totalValue)
        };
    }
  };

  if (loading) {
    return (
      <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
        </div>
        
        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-1 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-md font-medium text-foreground mb-2">No transactions found</h4>
          <p className="text-sm text-muted-foreground">
            {timeRange === 'all' 
              ? 'No transactions have been recorded for this portfolio yet.'
              : `No transactions in the selected ${timeRange} period.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((transaction) => {
            const { action, quantity, value } = getTransactionText(transaction);
            
            return (
              <div
                key={transaction.id}
                className={`border rounded-lg p-4 ${getTransactionColor(transaction.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {action} {Math.abs(transaction.quantityChange)} card{Math.abs(transaction.quantityChange) !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(transaction.pricePerCard)} per card
                        </p>
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'add' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quantity} cards
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3 pt-2 border-t border-current/20">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(transaction.timestamp)}</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Position: {transaction.previousQuantity} → {transaction.newQuantity}
                      </div>
                      
                      {transaction.source && (
                        <div className="text-xs text-muted-foreground">
                          Source: {transaction.source}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} 
              {timeRange !== 'all' && ` in the last ${timeRange}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
