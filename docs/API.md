# API Documentation

This document details the external API integrations used by the MTG Investment Tracker and the internal API patterns within the application.

## 🌐 External API Integration

### Scryfall API

The MTG Investment Tracker primarily integrates with the [Scryfall API](https://scryfall.com/docs/api) for all Magic: The Gathering card data.

#### Base Configuration

```typescript
const SCRYFALL_BASE_URL = 'https://api.scryfall.com';

// Rate limiting: Maximum 10 requests per second
const RATE_LIMIT_MS = 100; // 100ms between requests
```

#### Authentication

The Scryfall API is public and does not require authentication. However, we implement:

- **Rate limiting**: Automatic throttling to respect API limits
- **User-Agent header**: Identification as required by Scryfall
- **Error handling**: Comprehensive error recovery

## 📡 API Client Implementation

### Core API Client

```typescript
// lib/api/scryfall.ts

class RateLimiter {
  private lastRequest = 0;
  private minInterval = 100; // 100ms between requests

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter();

async function scryfallRequest<T>(endpoint: string): Promise<T> {
  await rateLimiter.throttle();
  
  try {
    const response = await fetch(`${SCRYFALL_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MTGInvestmentTracker/1.0'
      }
    });

    if (!response.ok) {
      const errorData: ScryfallError = await response.json();
      throw new Error(`Scryfall API Error: ${errorData.details} (${errorData.code})`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching data from Scryfall');
  }
}
```

### Error Handling Strategy

```typescript
interface APIError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

class ScryfallAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ScryfallAPIError';
  }
}

// Error handling with automatic retries
async function scryfallRequestWithRetry<T>(
  endpoint: string, 
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await scryfallRequest<T>(endpoint);
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof ScryfallAPIError && error.retryable) {
        const delay = error.retryAfter || Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
}
```

## 🔍 Card Search API

### Basic Card Search

```typescript
/**
 * Search for Magic cards using Scryfall's search syntax
 */
export async function searchCards(
  query: string, 
  options: Partial<ScryfallSearchParams> = {}
): Promise<{ cards: MTGCard[]; totalCards: number; hasMore: boolean }> {
  const searchParams = new URLSearchParams({
    q: query,
    order: options.order || 'name',
    dir: options.dir || 'auto',
    unique: options.unique || 'cards',
    page: (options.page || 1).toString(),
  });

  const response = await scryfallRequest<ScryfallSearchResponse>(
    `/cards/search?${searchParams.toString()}`
  );

  return {
    cards: response.data.map(convertScryfallCard),
    totalCards: response.total_cards,
    hasMore: response.has_more,
  };
}
```

### Advanced Search with Filters

```typescript
/**
 * Advanced card search with multiple filter options
 */
export async function advancedSearch(filters: {
  name?: string;
  colors?: string[];
  rarity?: string[];
  sets?: string[];
  types?: string[];
  minPrice?: number;
  maxPrice?: number;
  minCmc?: number;
  maxCmc?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
}): Promise<{ cards: MTGCard[]; totalCards: number; hasMore: boolean }> {
  const queryParts: string[] = [];

  // Build search query using Scryfall syntax
  if (filters.name) {
    queryParts.push(`name:${filters.name}`);
  }

  if (filters.colors && filters.colors.length > 0) {
    queryParts.push(`c:${filters.colors.join('')}`);
  }

  if (filters.rarity && filters.rarity.length > 0) {
    queryParts.push(`r:${filters.rarity.join('|')}`);
  }

  if (filters.sets && filters.sets.length > 0) {
    queryParts.push(`s:${filters.sets.join('|')}`);
  }

  if (filters.types && filters.types.length > 0) {
    queryParts.push(`t:${filters.types.join('|')}`);
  }

  if (filters.minPrice !== undefined) {
    queryParts.push(`usd>=${filters.minPrice}`);
  }
  if (filters.maxPrice !== undefined) {
    queryParts.push(`usd<=${filters.maxPrice}`);
  }

  if (filters.minCmc !== undefined) {
    queryParts.push(`cmc>=${filters.minCmc}`);
  }
  if (filters.maxCmc !== undefined) {
    queryParts.push(`cmc<=${filters.maxCmc}`);
  }

  const query = queryParts.join(' ') || '*';
  
  return searchCards(query, {
    order: filters.sortBy as any || 'name',
    dir: filters.sortOrder || 'asc',
    page: filters.page || 1,
  });
}
```

### Card Retrieval by ID

```typescript
/**
 * Get a specific card by its Scryfall ID
 */
export async function getCard(id: string): Promise<MTGCard> {
  const scryfallCard = await scryfallRequest<ScryfallCard>(`/cards/${id}`);
  return convertScryfallCard(scryfallCard);
}

/**
 * Get a card by exact name
 */
export async function getCardByName(name: string, set?: string): Promise<MTGCard> {
  const endpoint = set 
    ? `/cards/named?exact=${encodeURIComponent(name)}&set=${set}`
    : `/cards/named?exact=${encodeURIComponent(name)}`;
  
  const scryfallCard = await scryfallRequest<ScryfallCard>(endpoint);
  return convertScryfallCard(scryfallCard);
}

/**
 * Get a random card
 */
export async function getRandomCard(): Promise<MTGCard> {
  const scryfallCard = await scryfallRequest<ScryfallCard>('/cards/random');
  return convertScryfallCard(scryfallCard);
}
```

### Autocomplete API

```typescript
/**
 * Get autocomplete suggestions for card names
 */
export async function getAutocomplete(query: string): Promise<string[]> {
  const response = await scryfallRequest<{ data: string[] }>(
    `/cards/autocomplete?q=${encodeURIComponent(query)}`
  );
  return response.data;
}
```

## 🏗️ Data Type Conversion

### Scryfall to Internal Types

```typescript
/**
 * Convert Scryfall card format to internal MTGCard format
 */
export function convertScryfallCard(scryfallCard: ScryfallCard): MTGCard {
  // Handle double-faced cards
  const mainFace = scryfallCard.card_faces?.[0] || scryfallCard;
  
  return {
    id: scryfallCard.id,
    name: mainFace.name,
    manaCost: mainFace.mana_cost || scryfallCard.mana_cost,
    convertedManaCost: scryfallCard.cmc,
    type: scryfallCard.type_line,
    rarity: scryfallCard.rarity === 'special' || scryfallCard.rarity === 'bonus' 
      ? 'rare' 
      : scryfallCard.rarity,
    set: scryfallCard.set,
    setName: scryfallCard.set_name,
    number: scryfallCard.collector_number,
    artist: scryfallCard.artist,
    power: mainFace.power || scryfallCard.power,
    toughness: mainFace.toughness || scryfallCard.toughness,
    text: mainFace.oracle_text || scryfallCard.oracle_text,
    flavorText: mainFace.flavor_text || scryfallCard.flavor_text,
    imageUrl: (mainFace.image_uris || scryfallCard.image_uris)?.normal,
    colors: scryfallCard.colors,
    colorIdentity: scryfallCard.color_identity,
    legalities: scryfallCard.legalities,
    prices: {
      usd: scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) : undefined,
      usdFoil: scryfallCard.prices.usd_foil ? parseFloat(scryfallCard.prices.usd_foil) : undefined,
      eur: scryfallCard.prices.eur ? parseFloat(scryfallCard.prices.eur) : undefined,
      eurFoil: scryfallCard.prices.eur_foil ? parseFloat(scryfallCard.prices.eur_foil) : undefined,
      tix: scryfallCard.prices.tix ? parseFloat(scryfallCard.prices.tix) : undefined,
      lastUpdated: new Date().toISOString(),
    },
    scryfallId: scryfallCard.id,
  };
}
```

## 📊 Price History API

### Mock Price History Generation

Since Scryfall doesn't provide historical price data, we generate mock data:

```typescript
/**
 * Generate simulated price history for a card
 * In a production app, this would connect to a price tracking service
 */
export async function getPriceHistory(cardId: string): Promise<Array<{
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
}>> {
  const card = await getCard(cardId);
  const currentPrice = card.prices.usd || 0;
  
  const history = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic price variation using random walk
    const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
    const trendFactor = 1 + (Math.random() - 0.5) * 0.1; // Long-term trend
    const price = Math.max(0.01, currentPrice * (1 + variation * (i / 30)) * trendFactor);
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
      priceType: 'usd' as const,
    });
  }
  
  return history;
}
```

## 🏢 Set Information API

```typescript
/**
 * Get information about Magic sets
 */
export async function getSets(): Promise<Array<{
  id: string;
  code: string;
  name: string;
  released_at: string;
  set_type: string;
  card_count: number;
}>> {
  const response = await scryfallRequest<{ data: any[] }>('/sets');
  return response.data;
}
```

## 🔄 API Usage Patterns

### Debounced Search

```typescript
// Debounce search queries to reduce API calls
function useCardSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MTGCard[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { cards } = await searchCards(searchQuery);
        setResults(cards);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return { query, setQuery, results, loading };
}
```

### Pagination Handling

```typescript
function useInfiniteCardSearch(initialQuery: string) {
  const [cards, setCards] = useState<MTGCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const result = await searchCards(initialQuery, { page: page + 1 });
      setCards(prev => [...prev, ...result.cards]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more cards:', error);
    } finally {
      setLoading(false);
    }
  }, [initialQuery, page, loading, hasMore]);

  return { cards, hasMore, loading, loadMore };
}
```

### Caching Strategy

```typescript
// Simple in-memory cache for API responses
class APICache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new APICache();

// Cached search function
export async function cachedSearchCards(query: string): Promise<MTGCard[]> {
  const cacheKey = `search:${query}`;
  const cached = apiCache.get<MTGCard[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const { cards } = await searchCards(query);
  apiCache.set(cacheKey, cards);
  
  return cards;
}
```

## 🚦 Rate Limiting Details

### Scryfall API Limits

- **Rate Limit**: 10 requests per second
- **Burst Limit**: Short bursts allowed
- **IP-based**: Limiting is per IP address

### Implementation

```typescript
class AdaptiveRateLimiter {
  private requestTimes: number[] = [];
  private maxRequestsPerSecond = 10;

  async throttle(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than 1 second
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
    
    // If we're at the limit, wait
    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 1000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimes.push(Date.now());
  }
}
```

## 📈 API Monitoring

### Request Tracking

```typescript
interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
}

class APIMonitor {
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: {},
  };

  trackRequest(duration: number, success: boolean, error?: string): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (error) {
        this.metrics.errorsByType[error] = (this.metrics.errorsByType[error] || 0) + 1;
      }
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) / 
      this.metrics.totalRequests;
  }

  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorsByType: {},
    };
  }
}

export const apiMonitor = new APIMonitor();
```

## 🔍 Testing API Integration

### Mock API Responses

```typescript
// Test utilities for mocking API responses
export const mockScryfallCard: ScryfallCard = {
  id: 'mock-card-id',
  name: 'Mock Card',
  mana_cost: '{1}{R}',
  cmc: 2,
  type_line: 'Instant',
  oracle_text: 'Deal 3 damage to any target.',
  colors: ['R'],
  color_identity: ['R'],
  rarity: 'common',
  set: 'TST',
  set_name: 'Test Set',
  collector_number: '1',
  artist: 'Test Artist',
  prices: {
    usd: '0.25',
    usd_foil: '1.00',
    eur: '0.20',
    eur_foil: '0.80',
    tix: '0.10',
  },
  image_uris: {
    small: 'https://example.com/small.jpg',
    normal: 'https://example.com/normal.jpg',
    large: 'https://example.com/large.jpg',
    png: 'https://example.com/card.png',
    art_crop: 'https://example.com/art.jpg',
    border_crop: 'https://example.com/border.jpg',
  },
  legalities: {
    standard: 'legal',
    pioneer: 'legal',
    modern: 'legal',
    legacy: 'legal',
    vintage: 'legal',
  },
  // ... other required fields
};

// Mock fetch for testing
export function mockFetch(response: any, delay = 0) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => new Promise(resolve => 
        setTimeout(() => resolve(response), delay)
      ),
    })
  ) as jest.Mock;
}
```

### Integration Tests

```typescript
describe('Scryfall API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search for cards successfully', async () => {
    const mockResponse = {
      data: [mockScryfallCard],
      total_cards: 1,
      has_more: false,
    };

    mockFetch(mockResponse);

    const result = await searchCards('lightning bolt');

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Mock Card');
    expect(result.totalCards).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          object: 'error',
          code: 'not_found',
          status: 404,
          details: 'No cards found',
        }),
      })
    ) as jest.Mock;

    await expect(searchCards('nonexistent card')).rejects.toThrow(
      'Scryfall API Error: No cards found (not_found)'
    );
  });

  it('should respect rate limiting', async () => {
    const mockResponse = { data: [mockScryfallCard] };
    mockFetch(mockResponse, 50);

    const startTime = Date.now();

    // Make multiple requests
    await Promise.all([
      searchCards('card1'),
      searchCards('card2'),
      searchCards('card3'),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should take at least 200ms due to rate limiting (100ms between requests)
    expect(duration).toBeGreaterThan(200);
  });
});
```

This API documentation provides comprehensive coverage of the external integrations and internal API patterns used throughout the MTG Investment Tracker application.





