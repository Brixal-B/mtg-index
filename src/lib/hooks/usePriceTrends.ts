import { useState, useEffect, useRef } from 'react';
import { getPriceHistory } from '@/lib/api/scryfall';
import { analyzePriceTrends, PriceTrendAnalysis } from '@/lib/utils/priceAnalysis';
import { isRealPriceDataAvailable, getMTGJSONStatusMessage } from '@/lib/utils/mtgjsonStatus';

// Define the PriceHistoryPoint interface locally to match scryfall.ts
interface PriceHistoryPoint {
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
}



interface UsePriceTrendsOptions {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UsePriceTrendsReturn {
  trends: PriceTrendAnalysis | null;
  loading: boolean;
  error: string | null;
  dataSource: 'mtgjson' | 'unknown';
  dataSourceMessage: string;
  refresh: () => void;
}

// Cache to avoid duplicate requests for the same card
const trendsCache = new Map<string, {
  data: PriceTrendAnalysis;
  timestamp: number;
  isMockData?: boolean;
  promise?: Promise<PriceTrendAnalysis>;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and analyze price trends for a card
 */
export function usePriceTrends(
  cardId: string | null, 
  options: UsePriceTrendsOptions = {}
): UsePriceTrendsReturn {
  const { enabled = true, refreshInterval } = options;
  const [trends, setTrends] = useState<PriceTrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'mtgjson' | 'unknown'>('unknown');
  const [dataSourceMessage, setDataSourceMessage] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrends = async (cardId: string, signal?: AbortSignal): Promise<PriceTrendAnalysis> => {
    // Check cache first
    const cached = trendsCache.get(cardId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    // If there's already a pending request for this card, wait for it
    if (cached?.promise) {
      return cached.promise;
    }

    // Create new request
    const promise = (async () => {
      try {
        const priceHistory: PriceHistoryPoint[] = await getPriceHistory(cardId);
        const analysis = analyzePriceTrends(priceHistory);
        
        // Cache the result
        trendsCache.set(cardId, {
          data: analysis,
          timestamp: now,
          isMockData: false,
        });
        
        return analysis;
      } catch (err) {
        // Remove failed request from cache
        trendsCache.delete(cardId);
        throw err; // No fallback to mock data
      }
    })();

    // Store promise in cache to prevent duplicate requests
    if (cached) {
      cached.promise = promise;
    } else {
      trendsCache.set(cardId, {
        data: {} as PriceTrendAnalysis, // placeholder
        timestamp: 0,
        promise
      });
    }

    return promise;
  };

  const refresh = () => {
    if (!cardId || !enabled) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear cache for this card to force refresh
    trendsCache.delete(cardId);

    // Start new request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    fetchTrends(cardId, abortController.signal)
      .then((analysis) => {
        if (!abortController.signal.aborted) {
          setTrends(analysis);
          setError(null);
          
          // Update data source information
          const hasRealData = isRealPriceDataAvailable();
          if (hasRealData) {
            setDataSource('mtgjson');
            setDataSourceMessage('Using real historical price data from MTGJSON');
          } else {
            setDataSource('unknown');
            setDataSourceMessage('No price data available - MTGJSON not initialized');
          }
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.warn('Price trends unavailable:', err.message);
          setError('Price data unavailable');
          setTrends(null);
          setDataSource('unknown');
          setDataSourceMessage('Price data unavailable - MTGJSON not initialized');
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });
  };

  // Initial fetch
  useEffect(() => {
    if (cardId && enabled) {
      refresh();
    } else {
      setTrends(null);
      setError(null);
      setLoading(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cardId, enabled]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval && cardId && enabled) {
      refreshTimeoutRef.current = setInterval(refresh, refreshInterval);
      
      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [refreshInterval, cardId, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    trends,
    loading,
    error,
    dataSource,
    dataSourceMessage,
    refresh
  };
}

/**
 * Hook for batch fetching trends for multiple cards
 */
export function useBatchPriceTrends(
  cardIds: string[],
  options: UsePriceTrendsOptions = {}
): {
  trendsMap: Map<string, PriceTrendAnalysis>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { enabled = true } = options;
  const [trendsMap, setTrendsMap] = useState<Map<string, PriceTrendAnalysis>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!enabled || cardIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch trends for all cards in parallel
      const promises = cardIds.map(async (cardId) => {
        try {
          const trends = await fetchTrends(cardId);
          return { cardId, trends };
        } catch (err) {
          console.warn(`Trends unavailable for card ${cardId}:`, err instanceof Error ? err.message : 'Unknown error');
          return { cardId, trends: null };
        }
      });

      const results = await Promise.all(promises);
      
      const newTrendsMap = new Map<string, PriceTrendAnalysis>();
      results.forEach(({ cardId, trends }) => {
        if (trends) {
          newTrendsMap.set(cardId, trends);
        }
      });

      setTrendsMap(newTrendsMap);
    } catch (err) {
      console.error('Error in batch price trends fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price trends');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async (cardId: string): Promise<PriceTrendAnalysis> => {
    const cached = trendsCache.get(cardId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const priceHistory: PriceHistoryPoint[] = await getPriceHistory(cardId);
      const analysis = analyzePriceTrends(priceHistory);
      
      trendsCache.set(cardId, {
        data: analysis,
        timestamp: now,
      });
      
      return analysis;
    } catch (err) {
      // No fallback to mock data - throw error
      console.warn(`Price data unavailable for ${cardId}:`, err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    if (enabled && cardIds.length > 0) {
      refresh();
    } else {
      setTrendsMap(new Map());
      setError(null);
      setLoading(false);
    }
  }, [JSON.stringify(cardIds.sort()), enabled]);

  return {
    trendsMap,
    loading,
    error,
    refresh
  };
}
