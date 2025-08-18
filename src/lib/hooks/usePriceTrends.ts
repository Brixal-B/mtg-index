import { useState, useEffect, useRef } from 'react';
import { getPriceHistory } from '@/lib/api/scryfall';
import { analyzePriceTrends, PriceTrendAnalysis } from '@/lib/utils/priceAnalysis';

// Define the PriceHistoryPoint interface locally to match scryfall.ts
interface PriceHistoryPoint {
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
}

// Mock data for development when API is unavailable
function generateMockPriceHistory(cardId: string): PriceHistoryPoint[] {
  const basePrice = 10 + (cardId.charCodeAt(0) % 50); // Pseudo-random base price
  const history: PriceHistoryPoint[] = [];
  const now = new Date();
  
  // Generate 90 days of mock price history
  for (let i = 90; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Add some realistic price variation
    const variation = (Math.sin(i / 10) * 0.2) + (Math.random() - 0.5) * 0.3;
    const price = Math.max(0.1, basePrice * (1 + variation));
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2)),
      priceType: 'usd'
    });
  }
  
  return history;
}

interface UsePriceTrendsOptions {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UsePriceTrendsReturn {
  trends: PriceTrendAnalysis | null;
  loading: boolean;
  error: string | null;
  isUsingMockData: boolean;
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
  const [isUsingMockData, setIsUsingMockData] = useState(false);
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
        // For development: Use mock data when API is unavailable
        console.warn(`API unavailable for ${cardId}, using mock data:`, err instanceof Error ? err.message : 'Unknown error');
        
        try {
          const mockHistory = generateMockPriceHistory(cardId);
          const analysis = analyzePriceTrends(mockHistory);
          
          // Cache the mock result (shorter duration)
          trendsCache.set(cardId, {
            data: analysis,
            timestamp: now - (CACHE_DURATION * 0.8), // Expire sooner for mock data
            isMockData: true,
          });
          
          return analysis;
        } catch (mockErr) {
          // Remove failed request from cache
          trendsCache.delete(cardId);
          throw err; // Throw original error
        }
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
          
          // Check if we're using mock data
          const cached = trendsCache.get(cardId);
          setIsUsingMockData(cached?.isMockData || false);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.warn('Price trends unavailable, using fallback:', err.message);
          // Don't set error for CORS/network issues - just silently fail
          // This allows the UI to work without trends rather than showing errors
          setError(null);
          setTrends(null);
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
    isUsingMockData,
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
      // Use mock data as fallback
      console.warn(`API unavailable for ${cardId}, using mock data:`, err instanceof Error ? err.message : 'Unknown error');
      
      const mockHistory = generateMockPriceHistory(cardId);
      const analysis = analyzePriceTrends(mockHistory);
      
      trendsCache.set(cardId, {
        data: analysis,
        timestamp: now - (CACHE_DURATION * 0.8), // Expire sooner for mock data
      });
      
      return analysis;
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
