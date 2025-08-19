'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Clock,
  HardDrive,
  Activity
} from 'lucide-react';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

// Extend window to prevent multiple simultaneous downloads
declare global {
  interface Window {
    mtgjsonDownloadInProgress?: boolean;
  }
}

interface InitProgress {
  step: string;
  progress: number;
  status: 'downloading' | 'processing' | 'complete' | 'error';
  message: string;
  bytesDownloaded?: number;
  totalBytes?: number;
}

interface MTGJSONDataStats {
  isInitialized: boolean;
  totalCards: number;
  lastUpdated: string | null;
  dataSize: string;
  version: string | null;
}

export function MTGJSONDataManager() {
  const [stats, setStats] = useState<MTGJSONDataStats | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState<InitProgress | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check current MTGJSON data status
  useEffect(() => {
    checkDataStatus();
  }, []);

  // Poll for progress updates when initializing
  useEffect(() => {
    if (!isInitializing || !sessionId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/mtgjson/init?action=progress&sessionId=${sessionId}`);
        const result = await response.json();

        if (result.success && result.progress) {
          setProgress(result.progress);

          // Check if server is ready for client-side download
          if (result.progress.step === 'awaiting_client') {
            await startClientSideDownload(sessionId);
          } else if (result.progress.status === 'complete') {
            setIsInitializing(false);
            await checkDataStatus(); // Refresh stats
          } else if (result.progress.status === 'error') {
            setIsInitializing(false);
            setError(result.progress.message);
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
      }
    };

    const interval = setInterval(pollProgress, 2000);
    return () => clearInterval(interval);
  }, [isInitializing, sessionId]);

  const startClientSideDownload = async (sessionId: string) => {
    try {
      // Prevent multiple simultaneous downloads
      if (window.mtgjsonDownloadInProgress) {
        console.log('Download already in progress, skipping...');
        return;
      }
      window.mtgjsonDownloadInProgress = true;

      // Get download configuration from server
      const configResponse = await fetch(`/api/mtgjson/init?action=download_config&sessionId=${sessionId}`);
      const configResult = await configResponse.json();

      if (!configResult.success || !configResult.config) {
        throw new Error('Failed to get download configuration');
      }

      const { url, expectedSize } = configResult.config;

      // Update progress to show client-side download starting
      await updateServerProgress(sessionId, {
        step: 'downloading',
        progress: 30,
        status: 'downloading',
        message: 'Starting client-side download...'
      });

      // Perform client-side download with progress tracking
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : expectedSize;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response stream');
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      let lastProgressUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        const downloadProgress = Math.min(30 + (receivedLength / totalBytes) * 50, 80);

        // Only update progress every 10% or every 10MB to avoid flooding the API
        const progressPercent = Math.floor(downloadProgress);
        const megabytesReceived = Math.floor(receivedLength / (1024 * 1024));
        
        // Much more aggressive throttling - only update every 10% AND every 10MB
        if (progressPercent >= lastProgressUpdate + 10 && megabytesReceived % 10 === 0) {
          lastProgressUpdate = progressPercent;
          
          console.log(`Progress update: ${progressPercent}% (${megabytesReceived}MB)`);
          
          await updateServerProgress(sessionId, {
            step: 'downloading',
            progress: downloadProgress,
            status: 'downloading',
            message: `Downloaded ${(receivedLength / 1024 / 1024).toFixed(1)}MB of ${(totalBytes / 1024 / 1024).toFixed(1)}MB...`,
            bytesDownloaded: receivedLength,
            totalBytes
          });
        }
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      await updateServerProgress(sessionId, {
        step: 'parsing',
        progress: 85,
        status: 'processing',
        message: 'Parsing JSON data...'
      });

      // Parse JSON
      const jsonString = new TextDecoder().decode(allChunks);
      const allPricesData = JSON.parse(jsonString);

      await updateServerProgress(sessionId, {
        step: 'storing',
        progress: 95,
        status: 'processing',
        message: 'Storing data locally...'
      });

      // Process and store the data
      const processedData = {
        data: allPricesData.data,
        timestamp: Date.now(),
        version: allPricesData.meta?.version || 'unknown',
        totalCards: Object.keys(allPricesData.data || {}).length
      };

      // Store in localStorage
      localStorage.setItem('mtgjson-all-prices-data', JSON.stringify(processedData));

      // Notify server of completion
      await fetch('/api/mtgjson/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          sessionId,
          totalCards: processedData.totalCards
        })
      });

      console.log(`MTGJSON data successfully downloaded and stored: ${processedData.totalCards} cards`);

    } catch (err) {
      console.error('Client-side download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download MTGJSON data');
      setIsInitializing(false);
    } finally {
      // Always clear the download flag
      window.mtgjsonDownloadInProgress = false;
    }
  };

  const updateServerProgress = async (sessionId: string, progressData: any) => {
    try {
      await fetch('/api/mtgjson/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress',
          sessionId,
          ...progressData
        })
      });
    } catch (err) {
      console.warn('Failed to update server progress:', err);
    }
  };

  const checkDataStatus = () => {
    try {
      const cachedData = localStorage.getItem('mtgjson-all-prices-data');
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const dataSize = (cachedData.length / 1024 / 1024).toFixed(2);
        
        setStats({
          isInitialized: true,
          totalCards: parsed.data ? Object.keys(parsed.data).length : 0,
          lastUpdated: new Date(parsed.timestamp).toLocaleString(),
          dataSize: `${dataSize} MB`,
          version: parsed.version || 'Unknown'
        });
      } else {
        setStats({
          isInitialized: false,
          totalCards: 0,
          lastUpdated: null,
          dataSize: '0 MB',
          version: null
        });
      }
    } catch (err) {
      console.error('Error checking data status:', err);
      setStats({
        isInitialized: false,
        totalCards: 0,
        lastUpdated: null,
        dataSize: '0 MB',
        version: null
      });
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    setProgress(null);

    try {
      const newSessionId = Date.now().toString();
      setSessionId(newSessionId);

      const response = await fetch('/api/mtgjson/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          sessionId: newSessionId
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to start initialization');
      }

      // Progress polling will handle the rest
    } catch (err) {
      setIsInitializing(false);
      setError(err instanceof Error ? err.message : 'Failed to initialize MTGJSON data');
    }
  };

  const handleClearData = () => {
    if (!confirm('This will clear all MTGJSON price history data. Are you sure?')) {
      return;
    }

    try {
      // Clear MTGJSON cache
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('mtgjson-')) {
          localStorage.removeItem(key);
        }
      });

      checkDataStatus();
    } catch (err) {
      setError('Failed to clear MTGJSON data');
    }
  };

  const getStatusIcon = () => {
    if (isInitializing) {
      return <Activity className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    
    if (stats?.isInitialized) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (isInitializing) return 'Initializing...';
    if (stats?.isInitialized) return 'Ready';
    return 'Not Initialized';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">MTGJSON Data Manager</h3>
            <p className="text-sm text-muted-foreground">
              Manage real historical price data from MTGJSON
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${
            stats?.isInitialized ? 'text-green-600' : 'text-red-600'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
          <p className={`text-sm font-medium ${
            stats?.isInitialized ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats?.isInitialized ? 'Initialized' : 'Not Initialized'}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cards</p>
          <p className="text-sm font-medium text-foreground">
            {stats?.totalCards.toLocaleString() || '0'}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Data Size</p>
          <p className="text-sm font-medium text-foreground">
            {stats?.dataSize || '0 MB'}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</p>
          <p className="text-sm font-medium text-foreground">
            {stats?.lastUpdated || 'Never'}
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      {isInitializing && progress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">{progress.message}</span>
            <span className="text-sm text-blue-700">{progress.progress}%</span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-blue-700">
            <span>Step: {progress.step}</span>
            {progress.bytesDownloaded && progress.totalBytes && (
              <span>
                {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-900">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {stats?.isInitialized 
              ? 'MTGJSON data is initialized and ready for use. Price trends will use real historical data.'
              : 'Initialize MTGJSON data to enable real historical price trends instead of simulated data.'
            }
          </p>
          
          {!stats?.isInitialized && (
            <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Currently using simulated price trends</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {stats?.isInitialized && (
            <button
              onClick={handleClearData}
              disabled={isInitializing}
              className="flex items-center space-x-2 px-4 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Data</span>
            </button>
          )}
          
          <button
            onClick={stats?.isInitialized ? checkDataStatus : handleInitialize}
            disabled={isInitializing || true} // TEMPORARILY DISABLED - API flood issue
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isInitializing ? (
              <>
                <LoadingSpinner size="small" />
                <span>Initializing...</span>
              </>
            ) : stats?.isInitialized ? (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Initialize MTGJSON Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Information */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2">What this does:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Downloads MTGJSON AllPrices.json (~200MB)</li>
              <li>• Processes historical price data for all MTG cards</li>
              <li>• Enables real price trends instead of simulations</li>
              <li>• Stores data locally in browser cache</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Requirements:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Stable internet connection</li>
              <li>• ~200MB available storage space</li>
              <li>• 5-10 minutes for initial download</li>
              <li>• Data refreshes automatically every 24 hours</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
