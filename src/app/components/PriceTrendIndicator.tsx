import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { TrendData, VolatilityMetrics } from '@/lib/utils/priceAnalysis';
import { formatTrendDisplay, getVolatilityBadge } from '@/lib/utils/priceAnalysis';

interface PriceTrendIndicatorProps {
  trend: TrendData | null;
  volatility?: VolatilityMetrics | null;
  timeframe?: '7d' | '30d';
  size?: 'sm' | 'md' | 'lg';
  showVolatility?: boolean;
  showPercentage?: boolean;
  showDataSource?: boolean;
  isUsingMockData?: boolean;
  className?: string;
}

export function PriceTrendIndicator({
  trend,
  volatility,
  timeframe = '7d',
  size = 'sm',
  showVolatility = false,
  showPercentage = true,
  showDataSource = false,
  isUsingMockData = false,
  className = ''
}: PriceTrendIndicatorProps) {
  const { arrow, text, colorClass } = formatTrendDisplay(trend);
  const volatilityBadge = getVolatilityBadge(volatility || null);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Get icon based on trend direction
  const TrendIcon = trend?.direction === 'up' ? TrendingUp :
                   trend?.direction === 'down' ? TrendingDown : Minus;

  if (!trend) {
    return (
      <div className={`flex items-center space-x-1 ${sizeClasses[size]} text-muted-foreground ${className}`}>
        <Minus className={iconSizeClasses[size]} />
        <span>No data</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Main trend indicator */}
      <div className={`flex items-center space-x-1 ${sizeClasses[size]} ${colorClass}`}>
        <TrendIcon className={iconSizeClasses[size]} />
        {showPercentage && (
          <span className="font-medium">
            {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
          </span>
        )}
        <span className="text-muted-foreground">
          {timeframe}
        </span>
      </div>

      {/* Volatility badge */}
      {showVolatility && volatilityBadge.show && (
        <div className={`px-1.5 py-0.5 rounded text-xs border ${volatilityBadge.colorClass}`}>
          {volatilityBadge.text}
        </div>
      )}

      {/* Low confidence indicator */}
      {trend.confidence === 'low' && (
        <div title="Low confidence - limited data available">
          <AlertTriangle 
            className={`${iconSizeClasses[size]} text-yellow-500 opacity-60`}
          />
        </div>
      )}

      {/* Mock data indicator */}
      {showDataSource && isUsingMockData && (
        <div 
          className="px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200"
          title="Using demo data - API unavailable"
        >
          Demo
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in card grids
 */
export function CompactPriceTrend({
  trend,
  timeframe = '7d',
  className = ''
}: {
  trend: TrendData | null;
  timeframe?: '7d' | '30d';
  className?: string;
}) {
  if (!trend) return null;

  const { colorClass } = formatTrendDisplay(trend);
  const isSignificant = Math.abs(trend.changePercent) >= 5; // Only show significant changes

  if (!isSignificant) return null;

  const TrendIcon = trend.direction === 'up' ? TrendingUp :
                   trend.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className={`flex items-center space-x-1 text-xs ${colorClass} ${className}`}>
      <TrendIcon className="h-3 w-3" />
      <span className="font-medium">
        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(0)}%
      </span>
    </div>
  );
}

/**
 * Price trend tooltip content
 */
export function PriceTrendTooltip({
  trend,
  volatility,
  timeframe = '7d'
}: {
  trend: TrendData | null;
  volatility?: VolatilityMetrics | null;
  timeframe?: '7d' | '30d';
}) {
  if (!trend) {
    return (
      <div className="text-sm">
        <p>No price trend data available</p>
      </div>
    );
  }

  const directionText = {
    up: 'increased',
    down: 'decreased',
    stable: 'remained stable'
  }[trend.direction];

  const confidenceText = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence (limited data)'
  }[trend.confidence];

  return (
    <div className="text-sm space-y-2">
      <div>
        <p className="font-medium">Price {directionText} by {Math.abs(trend.changePercent).toFixed(1)}%</p>
        <p className="text-muted-foreground">over the last {timeframe}</p>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>{confidenceText}</p>
        <p>Change: ${trend.changeAmount > 0 ? '+' : ''}${trend.changeAmount.toFixed(2)}</p>
      </div>

      {volatility && (
        <div className="text-xs border-t pt-2">
          <p className="font-medium">Volatility: {volatility.volatilityLevel}</p>
          <p className="text-muted-foreground">
            Range: ${volatility.priceRange.min.toFixed(2)} - ${volatility.priceRange.max.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Multiple timeframe trend display
 */
export function MultiTimeframeTrends({
  trends,
  volatility,
  className = ''
}: {
  trends: {
    '7d'?: TrendData | null;
    '30d'?: TrendData | null;
  };
  volatility?: VolatilityMetrics | null;
  className?: string;
}) {
  const hasAnyTrend = trends['7d'] || trends['30d'];

  if (!hasAnyTrend) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        No trend data
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {trends['7d'] && (
        <PriceTrendIndicator 
          trend={trends['7d']} 
          timeframe="7d" 
          size="sm"
          showPercentage={true}
        />
      )}
      
      {trends['30d'] && (
        <PriceTrendIndicator 
          trend={trends['30d']} 
          timeframe="30d" 
          size="sm"
          showPercentage={true}
        />
      )}

      {volatility && getVolatilityBadge(volatility).show && (
        <div className={`px-1.5 py-0.5 rounded text-xs border ${getVolatilityBadge(volatility).colorClass}`}>
          {getVolatilityBadge(volatility).text}
        </div>
      )}
    </div>
  );
}
