'use client';

import { useState } from 'react';
import { Database, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { isRealPriceDataAvailable, getMTGJSONStatusMessage } from '@/lib/utils/mtgjsonStatus';

interface DataSourceIndicatorProps {
  compact?: boolean;
  showMessage?: boolean;
  className?: string;
}

export function DataSourceIndicator({ 
  compact = false, 
  showMessage = true,
  className = '' 
}: DataSourceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasRealData = isRealPriceDataAvailable();
  const statusMessage = getMTGJSONStatusMessage();

  const getIcon = () => {
    if (hasRealData) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const getStatusText = () => {
    return hasRealData ? 'Real Data' : 'Simulated Data';
  };

  const getStatusColor = () => {
    return hasRealData 
      ? 'text-green-600 bg-green-50 border-green-200' 
      : 'text-amber-600 bg-amber-50 border-amber-200';
  };

  if (compact) {
    return (
      <div 
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center space-x-1">
          {getIcon()}
          <span className="text-xs font-medium">
            {hasRealData ? 'Real' : 'Sim'}
          </span>
        </div>
        
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
              {statusMessage}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${getStatusColor()} border rounded-lg p-3 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <Database className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium">
              Price Data Source: {getStatusText()}
            </h4>
            {!hasRealData && (
              <Info className="h-4 w-4 flex-shrink-0" />
            )}
          </div>
          
          {showMessage && (
            <p className="text-xs mt-1 opacity-75">
              {statusMessage}
            </p>
          )}
          
          {!hasRealData && (
            <p className="text-xs mt-2 font-medium">
              💡 Initialize MTGJSON data in Admin panel for real price history
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataSourceBadge({ className = '' }: { className?: string }) {
  const hasRealData = isRealPriceDataAvailable();
  
  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${
      hasRealData 
        ? 'bg-green-100 text-green-800' 
        : 'bg-amber-100 text-amber-800'
    } ${className}`}>
      {hasRealData ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      <span>{hasRealData ? 'Real Data' : 'Simulated'}</span>
    </span>
  );
}
