/**
 * MTGJSON Data Status Utilities
 * 
 * Provides utilities to check and manage MTGJSON data status
 * across the application.
 */

export interface MTGJSONStatus {
  isInitialized: boolean;
  totalCards: number;
  lastUpdated: Date | null;
  dataSize: number; // in bytes
  version: string | null;
  isStale: boolean; // older than 24 hours
}

/**
 * Check the current status of MTGJSON data
 */
export function getMTGJSONStatus(): MTGJSONStatus {
  if (typeof window === 'undefined') {
    return {
      isInitialized: false,
      totalCards: 0,
      lastUpdated: null,
      dataSize: 0,
      version: null,
      isStale: false
    };
  }

  try {
    const cachedData = localStorage.getItem('mtgjson-all-prices-data');
    
    if (!cachedData) {
      return {
        isInitialized: false,
        totalCards: 0,
        lastUpdated: null,
        dataSize: 0,
        version: null,
        isStale: false
      };
    }

    const parsed = JSON.parse(cachedData);
    const lastUpdated = parsed.timestamp ? new Date(parsed.timestamp) : null;
    const isStale = lastUpdated ? 
      (Date.now() - lastUpdated.getTime()) > (24 * 60 * 60 * 1000) : false;

    return {
      isInitialized: true,
      totalCards: parsed.totalCards || Object.keys(parsed.data || {}).length,
      lastUpdated,
      dataSize: cachedData.length,
      version: parsed.version || null,
      isStale
    };
  } catch (error) {
    console.error('Error checking MTGJSON status:', error);
    return {
      isInitialized: false,
      totalCards: 0,
      lastUpdated: null,
      dataSize: 0,
      version: null,
      isStale: false
    };
  }
}

/**
 * Check if real MTGJSON price data is available for use
 */
export function isRealPriceDataAvailable(): boolean {
  const status = getMTGJSONStatus();
  return status.isInitialized && !status.isStale;
}

/**
 * Get a human-readable status message for the current MTGJSON data state
 */
export function getMTGJSONStatusMessage(): string {
  const status = getMTGJSONStatus();

  if (!status.isInitialized) {
    return 'MTGJSON data not initialized - price data unavailable';
  }

  if (status.isStale) {
    return 'MTGJSON data is stale (>24h old) - consider refreshing for latest prices';
  }

  return `MTGJSON data active - ${status.totalCards.toLocaleString()} cards with real price history`;
}

/**
 * Format data size for display
 */
export function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clear all MTGJSON data
 */
export function clearMTGJSONData(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('mtgjson-')) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing MTGJSON data:', error);
    return false;
  }
}
