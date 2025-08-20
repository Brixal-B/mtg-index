'use client';

import { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, Database, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/app/components/Modal';
import { getStorageUsage, clearAllData } from '@/lib/storage';
import { StorageBreakdown } from '@/lib/types/components';

export function StorageMonitor() {
  const [storageData, setStorageData] = useState<{
    used: number;
    total: number;
    percentage: number;
    breakdown: StorageBreakdown;
  } | null>(null);

  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    const updateStorageData = () => {
      const usage = getStorageUsage();
      
      // Calculate breakdown by examining localStorage items
      const breakdown: StorageBreakdown = {
        portfolios: 0,
        watchlist: 0,
        preferences: 0,
        priceAlerts: 0,
        other: 0,
      };

      try {
        if (typeof window !== 'undefined') {
          const portfoliosData = localStorage.getItem('mtg-portfolios');
          const watchlistData = localStorage.getItem('mtg-watchlist');
          const preferencesData = localStorage.getItem('mtg-preferences');
          const alertsData = localStorage.getItem('mtg-price-alerts');

          breakdown.portfolios = portfoliosData ? portfoliosData.length : 0;
          breakdown.watchlist = watchlistData ? watchlistData.length : 0;
          breakdown.preferences = preferencesData ? preferencesData.length : 0;
          breakdown.priceAlerts = alertsData ? alertsData.length : 0;
          
          const totalKnown = breakdown.portfolios + breakdown.watchlist + 
                           breakdown.preferences + breakdown.priceAlerts;
          breakdown.other = Math.max(0, (usage?.used || 0) - totalKnown);
        }
      } catch (error) {
        console.error('Error calculating storage breakdown:', error);
      }

      if (usage) {
        setStorageData({
          used: usage.used,
          total: usage.total,
          percentage: usage.percentage,
          breakdown,
        });
      }
    };

    updateStorageData();
    
    // Update every 10 seconds
    const interval = setInterval(updateStorageData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStorageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-500';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-500';
    if (percentage >= 50) return 'text-blue-600 bg-blue-500';
    return 'text-green-600 bg-green-500';
  };

  const getStorageStatus = (percentage: number) => {
    if (percentage >= 90) return { status: 'Critical', color: 'text-red-600' };
    if (percentage >= 75) return { status: 'Warning', color: 'text-yellow-600' };
    if (percentage >= 50) return { status: 'Moderate', color: 'text-blue-600' };
    return { status: 'Good', color: 'text-green-600' };
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all application data? This action cannot be undone.')) {
      clearAllData();
      setShowClearDialog(false);
      // Refresh the page to reflect changes
      window.location.reload();
    }
  };

  if (!storageData) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Storage Monitor</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const { status, color } = getStorageStatus(storageData.percentage);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Local Storage Monitor</h3>
          </div>
          <button
            onClick={() => setShowClearDialog(true)}
            className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Data</span>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Browser storage usage and data breakdown
        </p>
      </div>

      {/* Storage Usage Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Storage Usage</span>
          <span className={`text-sm font-medium ${color}`}>
            {storageData.percentage.toFixed(1)}% • {status}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              getStorageColor(storageData.percentage).split(' ')[1]
            }`}
            style={{ width: `${Math.min(100, storageData.percentage)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatBytes(storageData.used)} used</span>
          <span>{formatBytes(storageData.total)} total</span>
        </div>
      </div>

      {/* Storage Warning */}
      {storageData.percentage >= 75 && (
        <div className={`border rounded-lg p-3 mb-4 ${
          storageData.percentage >= 90 
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-yellow-200 bg-yellow-50 text-yellow-700'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {storageData.percentage >= 90 ? 'Storage Critical' : 'Storage Warning'}
            </span>
          </div>
          <p className="text-sm mt-1">
            {storageData.percentage >= 90 
              ? 'Storage is nearly full. Consider clearing some data to prevent issues.'
              : 'Storage usage is high. Consider managing your data to free up space.'
            }
          </p>
        </div>
      )}

      {/* Storage Breakdown */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground">Storage Breakdown</h4>
        
        {Object.entries(storageData.breakdown).map(([key, bytes]) => {
          const percentage = storageData.used > 0 ? (bytes / storageData.used) * 100 : 0;
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-foreground">{label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-foreground">
                  {formatBytes(bytes)}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Storage Stats */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Available:</span>
            <div className="font-medium text-foreground">
              {formatBytes(storageData.total - storageData.used)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Efficiency:</span>
            <div className={`font-medium ${
              storageData.percentage <= 50 ? 'text-green-600' :
              storageData.percentage <= 75 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {storageData.percentage <= 50 ? 'Optimal' :
               storageData.percentage <= 75 ? 'Good' : 'Poor'}
            </div>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        message="This will permanently delete all portfolios, watchlists, preferences, and other application data. This action cannot be undone."
        confirmText="Clear All Data"
        icon={AlertTriangle}
        destructive
      />
    </div>
  );
}







