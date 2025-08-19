'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { mtgjsonInitService } from '@/lib/services/mtgjsonInitService';
import { allPrintingsStorage } from '@/lib/utils/allPrintingsStorage';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

interface DatabaseStatus {
  isInitialized: boolean;
  isUpToDate: boolean;
  isDownloading: boolean;
  lastUpdated: string | null;
  totalCards: number;
  version: string | null;
  downloadProgress: number;
  downloadStage: string;
  error: string | null;
}

interface DatabaseStatusIndicatorProps {
  onInitialize?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function DatabaseStatusIndicator({ 
  onInitialize, 
  showActions = true, 
  compact = false 
}: DatabaseStatusIndicatorProps) {
  const [status, setStatus] = useState<DatabaseStatus>({
    isInitialized: false,
    isUpToDate: false,
    isDownloading: false,
    lastUpdated: null,
    totalCards: 0,
    version: null,
    downloadProgress: 0,
    downloadStage: 'idle',
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    
    // Set up periodic status checks
    const interval = setInterval(loadStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      
      // Check if system is initialized
      const isInitialized = await mtgjsonInitService.isInitialized();
      
      // Get storage statistics
      const storageStats = await allPrintingsStorage.getStorageStats();
      
      // Get initialization stats
      const initStats = await mtgjsonInitService.getInitializationStats();
      
      // Check if data is up to date (within 7 days)
      let isUpToDate = false;
      let lastUpdated: string | null = null;
      
      if (storageStats) {
        const dataAge = Date.now() - new Date(storageStats.lastUpdated).getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        isUpToDate = dataAge < maxAge;
        lastUpdated = storageStats.lastUpdated;
      }

      setStatus({
        isInitialized,
        isUpToDate,
        isDownloading: false, // Will be updated by progress tracking
        lastUpdated,
        totalCards: storageStats?.totalCards || 0,
        version: storageStats?.version || null,
        downloadProgress: 0,
        downloadStage: 'idle',
        error: null,
      });
    } catch (error) {
      console.error('Failed to load database status:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load status',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (onInitialize) {
      // Set up progress tracking
      const progressHandler = (progress: any) => {
        setStatus(prev => ({
          ...prev,
          isDownloading: progress.stage !== 'complete' && progress.stage !== 'error',
          downloadProgress: progress.progress,
          downloadStage: progress.stage,
          error: progress.stage === 'error' ? progress.error : null,
        }));
      };

      mtgjsonInitService.onProgress(progressHandler);
      
      try {
        onInitialize();
      } finally {
        // Clean up after a delay to show completion
        setTimeout(() => {
          mtgjsonInitService.offProgress(progressHandler);
          loadStatus(); // Refresh status after completion
        }, 2000);
      }
    }
  };

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />;
    if (status.error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (status.isDownloading) return <Download className="h-4 w-4 text-blue-500" />;
    if (!status.isInitialized) return <Database className="h-4 w-4 text-gray-500" />;
    if (!status.isUpToDate) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking status...';
    if (status.error) return `Error: ${status.error}`;
    if (status.isDownloading) {
      return `${status.downloadStage}: ${status.downloadProgress}%`;
    }
    if (!status.isInitialized) return 'Not initialized';
    if (!status.isUpToDate) return 'Update available';
    return 'Up to date';
  };

  const getStatusColor = () => {
    if (status.error) return 'text-red-600 bg-red-50 border-red-200';
    if (status.isDownloading) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (!status.isInitialized) return 'text-gray-600 bg-gray-50 border-gray-200';
    if (!status.isUpToDate) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {status.isDownloading && (
          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current transition-all duration-300"
              style={{ width: `${status.downloadProgress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="font-medium">MTGJSON Database</h3>
        </div>
        
        {showActions && !status.isDownloading && (
          <button
            onClick={status.isInitialized ? loadStatus : handleInitialize}
            className="text-sm px-2 py-1 rounded hover:bg-black/5 transition-colors"
            title={status.isInitialized ? 'Refresh status' : 'Initialize database'}
          >
            {status.isInitialized ? (
              <RefreshCw className="h-3 w-3" />
            ) : (
              'Initialize'
            )}
          </button>
        )}
      </div>

      {/* Status Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Status:</span>
          <span className="font-medium">{getStatusText()}</span>
        </div>
        
        {status.isInitialized && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span>Cards:</span>
              <span className="font-medium">{status.totalCards.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span>Version:</span>
              <span className="font-medium">{status.version || 'Unknown'}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span>Last Updated:</span>
              <span className="font-medium">{formatLastUpdated(status.lastUpdated)}</span>
            </div>
          </>
        )}

        {/* Download Progress */}
        {status.isDownloading && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress:</span>
              <span className="font-medium">{status.downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-current h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.downloadProgress}%` }}
              />
            </div>
            <div className="text-xs mt-1 opacity-75">
              {status.downloadStage.replace(/_/g, ' ')}
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-current/20">
          <span>Connection:</span>
          <div className="flex items-center space-x-1">
            {navigator.onLine ? (
              <>
                <Wifi className="h-3 w-3" />
                <span className="font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span className="font-medium">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && !status.isInitialized && !status.isDownloading && (
        <div className="mt-4 pt-3 border-t border-current/20">
          <button
            onClick={handleInitialize}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-current/10 hover:bg-current/20 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="font-medium">Initialize Database</span>
          </button>
        </div>
      )}

      {/* Update Available Action */}
      {showActions && status.isInitialized && !status.isUpToDate && !status.isDownloading && (
        <div className="mt-4 pt-3 border-t border-current/20">
          <button
            onClick={handleInitialize}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-current/10 hover:bg-current/20 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="font-medium">Update Database</span>
          </button>
        </div>
      )}
    </div>
  );
}
