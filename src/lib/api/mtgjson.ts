import { 
  MTGJSONCard, 
  MTGJSONCardPrices, 
  MTGJSONPricePoint, 
  MTGJSONConfig, 
  MTGJSONCache,
  PriceHistory,
  ProcessedCardPrice,
  MTGCard 
} from '@/lib/types';

// MTGJSON Configuration
const MTGJSON_CONFIG: MTGJSONConfig = {
  baseUrl: 'https://mtgjson.com/api/v5',
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  preferredProvider: 'tcgplayer',
  enableCaching: true,
};

// Cache management
const CACHE_KEYS = {
  ALL_PRICES: 'mtgjson-all-prices',
  CARD_MAPPINGS: 'mtgjson-card-mappings',
  PRICE_HISTORY: 'mtgjson-price-history-',
} as const;

// Rate limiting: MTGJSON doesn't specify limits, but we'll be conservative
const RATE_LIMIT_DELAY = 200; // 200ms between requests
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  try {
    console.log(`Fetching MTGJSON data: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MTGJSON API Error: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('MTGJSON API request failed:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to MTGJSON API. Please check your internet connection.');
      }
    }
    
    throw error;
  }
}

// Cache utilities
function getCachedData<T>(key: string): T | null {
  if (!MTGJSON_CONFIG.enableCaching || typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    if (parsed.expiresAt && now > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error(`Error reading cache for key ${key}:`, error);
    return null;
  }
}

function setCachedData<T>(key: string, data: T, customExpiry?: number): void {
  if (!MTGJSON_CONFIG.enableCaching || typeof window === 'undefined') {
    return;
  }

  try {
    const expiry = customExpiry || MTGJSON_CONFIG.cacheExpiry;
    const cacheEntry = {
      data,
      expiresAt: Date.now() + expiry,
      cachedAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

// Import the card mapping service
import { cardMappingService } from '@/lib/services/cardMappingService';

// Map Scryfall card to MTGJSON UUID
export async function getCardMapping(scryfallCard: MTGCard): Promise<string | null> {
  try {
    // Use the card mapping service
    const uuid = await cardMappingService.getMapping(scryfallCard);
    
    if (uuid) {
      // Cache the successful mapping
      const cacheKey = `${CACHE_KEYS.CARD_MAPPINGS}${scryfallCard.id}`;
      setCachedData(cacheKey, uuid);
    }
    
    return uuid;
  } catch (error) {
    console.error(`Error getting card mapping for ${scryfallCard.name}:`, error);
    return null;
  }
}

// Fetch price history for a specific UUID
export async function fetchPriceHistoryByUUID(uuid: string): Promise<MTGJSONCardPrices | null> {
  try {
    // Check cache first
    const cacheKey = `${CACHE_KEYS.PRICE_HISTORY}${uuid}`;
    const cached = getCachedData<MTGJSONCardPrices>(cacheKey);
    if (cached) return cached;

    // Try to get from AllPrices data
    const priceData = await getAllPricesData();
    if (priceData && priceData[uuid]) {
      const cardPrices = priceData[uuid];
      
      // Cache the result
      setCachedData(cacheKey, cardPrices);
      
      return cardPrices;
    }

    console.log(`No price history found for UUID ${uuid}`);
    return null;
  } catch (error) {
    console.error('Error fetching price history:', error);
    return null;
  }
}

// Fetch and cache AllPrices.json data
let allPricesCache: Record<string, MTGJSONCardPrices> | null = null;
let allPricesLoadingPromise: Promise<Record<string, MTGJSONCardPrices> | null> | null = null;

async function getAllPricesData(): Promise<Record<string, MTGJSONCardPrices> | null> {
  // Return cached data if available
  if (allPricesCache) {
    return allPricesCache;
  }

  // Return existing loading promise if in progress
  if (allPricesLoadingPromise) {
    return allPricesLoadingPromise;
  }

  // Start loading AllPrices data
  allPricesLoadingPromise = loadAllPricesData();
  return allPricesLoadingPromise;
}

async function loadAllPricesData(): Promise<Record<string, MTGJSONCardPrices> | null> {
  try {
    console.log('Loading MTGJSON AllPrices data...');

    // Check if we have cached AllPrices data
    const cachedAllPrices = getCachedData<{
      data: Record<string, MTGJSONCardPrices>;
      timestamp: number;
      version: string;
    }>('mtgjson-all-prices-data');

    // Use cached data if it's less than 24 hours old
    if (cachedAllPrices && (Date.now() - cachedAllPrices.timestamp) < 24 * 60 * 60 * 1000) {
      console.log('Using cached AllPrices data');
      allPricesCache = cachedAllPrices.data;
      return allPricesCache;
    }

    // Check if data was manually initialized via Admin panel
    if (cachedAllPrices) {
      console.log('Using manually initialized MTGJSON data');
      allPricesCache = cachedAllPrices.data;
      return allPricesCache;
    }

    // The AllPrices.json file is very large (200+ MB) and can cause issues
    // Data should be initialized via Admin panel for better user experience
    console.warn('AllPrices.json not found - use Admin panel to initialize MTGJSON data');
    console.log('Price history features will use trend-based simulation until MTGJSON data is loaded');
    
    return null;

    // TODO: Re-enable when we have proper chunked downloading
    // console.log('Fetching fresh AllPrices data from MTGJSON...');
    // const response = await rateLimitedFetch('https://mtgjson.com/api/v5/AllPrices.json');
    // 
    // if (!response.ok) {
    //   throw new Error(`Failed to fetch AllPrices: ${response.status} ${response.statusText}`);
    // }
    //
    // // Parse the JSON response with better error handling
    // let allPricesResponse;
    // try {
    //   allPricesResponse = await response.json();
    // } catch (jsonError) {
    //   throw new Error(`Failed to parse AllPrices JSON: ${jsonError.message}. The file may be corrupted or incomplete.`);
    // }
  } catch (error) {
    console.error('Failed to load AllPrices data:', error);
    
    // Try to use stale cached data as fallback
    const staleCache = getCachedData<{
      data: Record<string, MTGJSONCardPrices>;
      timestamp: number;
    }>('mtgjson-all-prices-data');

    if (staleCache) {
      console.warn('Using stale AllPrices cache due to fetch failure');
      allPricesCache = staleCache.data;
      return allPricesCache;
    }

    return null;
  } finally {
    allPricesLoadingPromise = null;
  }
}

// Convert MTGJSON price data to our internal format
export function convertMTGJSONPrices(
  uuid: string,
  mtgjsonPrices: MTGJSONCardPrices,
  cardName: string
): ProcessedCardPrice[] {
  const processedPrices: ProcessedCardPrice[] = [];
  
  try {
    // Get the preferred provider's data
    const provider = MTGJSON_CONFIG.preferredProvider;
    const paperPrices = mtgjsonPrices.paper?.[provider];
    
    if (paperPrices?.normal) {
      paperPrices.normal.forEach(pricePoint => {
        processedPrices.push({
          cardId: uuid,
          date: pricePoint.date,
          price: pricePoint.price,
          priceType: 'usd',
        });
      });
    }
    
    if (paperPrices?.foil) {
      paperPrices.foil.forEach(pricePoint => {
        processedPrices.push({
          cardId: uuid,
          date: pricePoint.date,
          price: pricePoint.price,
          priceType: 'usdFoil',
        });
      });
    }
  } catch (error) {
    console.error(`Error converting MTGJSON prices for ${cardName}:`, error);
  }
  
  return processedPrices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Get price history for a Scryfall card
export async function getPriceHistoryForCard(scryfallCard: MTGCard): Promise<PriceHistory | null> {
  try {
    // First, get the MTGJSON UUID mapping
    const uuid = await getCardMapping(scryfallCard);
    if (!uuid) {
      console.log(`No MTGJSON mapping found for ${scryfallCard.name}`);
      return null;
    }

    // Fetch the price history
    const mtgjsonPrices = await fetchPriceHistoryByUUID(uuid);
    if (!mtgjsonPrices) {
      return null;
    }

    // Convert to our internal format
    const processedPrices = convertMTGJSONPrices(uuid, mtgjsonPrices, scryfallCard.name);
    
    if (processedPrices.length === 0) {
      return null;
    }

    // Calculate trend and volatility
    const prices = processedPrices.map(p => p.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Simple trend calculation (last 7 days vs previous 7 days)
    const recent = prices.slice(-7);
    const previous = prices.slice(-14, -7);
    const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
    const previousAvg = previous.reduce((sum, p) => sum + p, 0) / previous.length;
    
    const trend: 'up' | 'down' | 'stable' = 
      recentAvg > previousAvg * 1.05 ? 'up' :
      recentAvg < previousAvg * 0.95 ? 'down' : 'stable';

    // Calculate volatility (standard deviation)
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - averagePrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);

    // Calculate percentage changes
    const percentChange24h = prices.length >= 2 ? 
      ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100 : undefined;
    
    const percentChange7d = recent.length > 0 && previous.length > 0 ? 
      ((recentAvg - previousAvg) / previousAvg) * 100 : undefined;

    return {
      cardId: scryfallCard.id,
      uuid,
      prices: processedPrices,
      trend,
      volatility,
      averagePrice,
      percentChange24h,
      percentChange7d,
      lastUpdated: new Date().toISOString(),
      provider: 'mtgjson',
    };
  } catch (error) {
    // Don't spam console with AllPrices errors - this is expected until data is loaded
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (!errorMessage.includes('AllPrices')) {
      console.error(`Error getting price history for ${scryfallCard.name}:`, error);
    }
    return null;
  }
}

// Batch fetch price histories for multiple cards
export async function batchGetPriceHistories(cards: MTGCard[]): Promise<Map<string, PriceHistory>> {
  const results = new Map<string, PriceHistory>();
  
  // Process cards in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (card) => {
      const history = await getPriceHistoryForCard(card);
      if (history) {
        results.set(card.id, history);
      }
    });
    
    await Promise.all(batchPromises);
    
    // Add a small delay between batches
    if (i + batchSize < cards.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// Utility function to clear MTGJSON cache
export function clearMTGJSONCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('mtgjson-')) {
        localStorage.removeItem(key);
      }
    });
    console.log('MTGJSON cache cleared');
  } catch (error) {
    console.error('Error clearing MTGJSON cache:', error);
  }
}

// Get cache statistics
export function getMTGJSONCacheStats() {
  if (typeof window === 'undefined') return null;
  
  try {
    const keys = Object.keys(localStorage);
    const mtgjsonKeys = keys.filter(key => key.startsWith('mtgjson-'));
    
    let totalSize = 0;
    const cacheEntries = mtgjsonKeys.map(key => {
      const data = localStorage.getItem(key);
      const size = data ? data.length : 0;
      totalSize += size;
      
      return {
        key,
        size,
        sizeFormatted: `${(size / 1024).toFixed(2)} KB`,
      };
    });
    
    return {
      totalEntries: mtgjsonKeys.length,
      totalSize,
      totalSizeFormatted: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      entries: cacheEntries,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

// Export configuration for external use
export { MTGJSON_CONFIG };
