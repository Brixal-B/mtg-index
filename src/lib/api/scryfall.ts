import { MTGCard } from '@/lib/types';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const API_PROXY_BASE = '/api/cards'; // Our Next.js API routes

// Use direct Scryfall API when in static export mode
function getApiBase(): string {
  // Check if we're in static export mode (API routes not available)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
    return SCRYFALL_API_BASE;
  }
  return API_PROXY_BASE;
}

// Rate limiting: Scryfall requests that applications sleep 50-100ms between requests
// Using 200ms to be more conservative and avoid 429 errors
const RATE_LIMIT_DELAY = 200;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  try {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    
    // Add User-Agent header when calling Scryfall directly
    if (url.startsWith(SCRYFALL_API_BASE)) {
      headers['User-Agent'] = 'MTG-Index-App/1.0';
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      // Try to get more details from the response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.details) {
          errorMessage += ` - ${errorData.details}`;
        }
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (error) {
    console.error('Scryfall API request failed:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // Add more user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to Scryfall API. Please check your internet connection.');
      } else if (error.message.includes('HTTP 429')) {
        throw new Error('Rate limit exceeded: Too many requests to Scryfall API. Please wait a moment and try again.');
      } else if (error.message.includes('HTTP 500')) {
        throw new Error('Scryfall server error: The API is temporarily unavailable. Please try again later.');
      }
    }
    
    throw error;
  }
}

function transformScryfallCard(scryfallCard: any): MTGCard {
  return {
    id: scryfallCard.id,
    name: scryfallCard.name,
    manaCost: scryfallCard.mana_cost || '',
    convertedManaCost: scryfallCard.cmc || 0,
    type: scryfallCard.type_line || '',
    text: scryfallCard.oracle_text || '',
    flavorText: scryfallCard.flavor_text || '',
    power: scryfallCard.power || '',
    toughness: scryfallCard.toughness || '',
    loyalty: scryfallCard.loyalty || '',
    imageUrl: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal || '',
    setName: scryfallCard.set_name || '',
    setCode: scryfallCard.set || '',
    number: scryfallCard.collector_number || '',
    artist: scryfallCard.artist || '',
    rarity: (scryfallCard.rarity === 'mythic' ? 'mythic' : 
             scryfallCard.rarity === 'rare' ? 'rare' : 
             scryfallCard.rarity === 'uncommon' ? 'uncommon' : 'common') as 'common' | 'uncommon' | 'rare' | 'mythic',
    colors: scryfallCard.colors || [],
    colorIdentity: scryfallCard.color_identity || [],
    prices: {
      usd: scryfallCard.prices?.usd ? parseFloat(scryfallCard.prices.usd) : null,
      usdFoil: scryfallCard.prices?.usd_foil ? parseFloat(scryfallCard.prices.usd_foil) : null,
      eur: scryfallCard.prices?.eur ? parseFloat(scryfallCard.prices.eur) : null,
      eurFoil: scryfallCard.prices?.eur_foil ? parseFloat(scryfallCard.prices.eur_foil) : null,
      tix: scryfallCard.prices?.tix ? parseFloat(scryfallCard.prices.tix) : null,
    },
    legalities: scryfallCard.legalities || {},
    multiverseId: scryfallCard.multiverse_ids?.[0],
    scryfallId: scryfallCard.id,
  };
}

interface SearchOptions {
  page?: number;
  limit?: number;
  order?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'eur' | 'tix' | 'cmc' | 'price';
  dir?: 'asc' | 'desc';
}

interface SearchResult {
  data: MTGCard[];
  cards: MTGCard[];
  totalCount: number;
  totalCards: number;
  hasMore: boolean;
  page: number;
}

export async function searchCards(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const { page = 1, limit = 20, order = 'name', dir = 'asc' } = options;
  
  try {
    // Validate and clean the query
    const cleanQuery = query?.trim() || '';
    
    // If no query provided, use a default search that returns popular cards
    const searchQuery = cleanQuery || '*';
    
    // Build search query
    const searchParams = new URLSearchParams({
      q: searchQuery,
      page: page.toString(),
      format: 'json',
      order: order,
      dir: dir,
    });

    const apiBase = getApiBase();
    const endpoint = apiBase === SCRYFALL_API_BASE ? `/cards/search?${searchParams}` : `/search?${searchParams}`;
    const url = `${apiBase}${endpoint}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Scryfall API error: ${response.status} - ${errorData.details || response.statusText}`);
    }
    
    const data = await response.json();

    const cards = data.data?.map(transformScryfallCard) || [];
    const totalCount = data.total_cards || 0;
    return {
      data: cards,
      cards: cards,
      totalCount: totalCount,
      totalCards: totalCount,
      hasMore: data.has_more || false,
      page: page,
    };
  } catch (error) {
    console.error('Error searching cards:', error);
    throw error;
  }
}

interface AdvancedSearchFilters {
  colors?: string[];
  types?: string[];
  sets?: string[];
  rarity?: string[];
  minCmc?: number;
  maxCmc?: number;
  minPrice?: number;
  maxPrice?: number;
  format?: string;
}

export async function advancedSearch(
  query: string = '',
  filters: AdvancedSearchFilters = {},
  options: SearchOptions = {}
): Promise<SearchResult> {
  const { colors, types, sets, rarity, minCmc, maxCmc, minPrice, maxPrice, format } = filters;
  
  // Build advanced search query
  let searchQuery = query;
  
  if (colors && colors.length > 0) {
    searchQuery += ` color:${colors.join('')}`;
  }
  
  if (types && types.length > 0) {
    searchQuery += ` type:${types.join(' OR type:')}`;
  }
  
  if (sets && sets.length > 0) {
    searchQuery += ` set:${sets.join(' OR set:')}`;
  }
  
  if (rarity && rarity.length > 0) {
    searchQuery += ` rarity:${rarity.join(' OR rarity:')}`;
  }
  
  if (minCmc !== undefined) {
    searchQuery += ` cmc>=${minCmc}`;
  }
  
  if (maxCmc !== undefined) {
    searchQuery += ` cmc<=${maxCmc}`;
  }
  
  if (minPrice !== undefined) {
    searchQuery += ` usd>=${minPrice}`;
  }
  
  if (maxPrice !== undefined) {
    searchQuery += ` usd<=${maxPrice}`;
  }
  
  if (format) {
    searchQuery += ` format:${format}`;
  }
  
  const finalQuery = searchQuery.trim();
  // If no query and no filters, use default search
  const queryToUse = finalQuery || '*';
  return searchCards(queryToUse, options);
}

export async function getCard(cardId: string): Promise<MTGCard> {
  try {
    const apiBase = getApiBase();
    const endpoint = apiBase === SCRYFALL_API_BASE ? `/cards/${cardId}` : `/${cardId}`;
    const url = `${apiBase}${endpoint}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return transformScryfallCard(data);
  } catch (error) {
    console.error('Error fetching card:', error);
    throw new Error(`Failed to fetch card with ID: ${cardId}`);
  }
}

interface PriceHistoryPoint {
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
}

export async function getPriceHistory(cardId: string, days: number = 30): Promise<PriceHistoryPoint[]> {
  try {
    // First try to get real historical data from MTGJSON
    const { getPriceHistoryForCard } = await import('./mtgjson');
    
    const card = await getCard(cardId);
    const mtgjsonHistory = await getPriceHistoryForCard(card);
    
    if (mtgjsonHistory && mtgjsonHistory.prices.length > 0) {
      // Convert MTGJSON data to our expected format
      return mtgjsonHistory.prices
        .slice(-days) // Get last N days
        .map(price => ({
          date: price.date,
          price: price.price,
          priceType: price.priceType as 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix',
        }));
    }
    
    // Fallback to mock data if MTGJSON data is not available
    console.log(`Using mock price history for ${card.name} - MTGJSON data not available`);
    
    const currentPrice = card.prices.usd || 0;
    
    // Generate mock historical data
    const history: PriceHistoryPoint[] = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic price variation (±5% daily change)
      const variation = (Math.random() - 0.5) * 0.1; // ±5%
      const dailyMultiplier = 1 + variation;
      const basePrice = currentPrice * Math.pow(0.99 + Math.random() * 0.02, i); // Slight downward trend over time
      const price = Math.max(0.01, basePrice * dailyMultiplier);
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        priceType: 'usd',
      });
    }
    
    return history;
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}

// Get random cards for featured/popular sections
export async function getRandomCards(count: number = 10): Promise<MTGCard[]> {
  try {
    const url = `${SCRYFALL_API_BASE}/cards/random`;
    const cards: MTGCard[] = [];
    
    // Fetch random cards one by one (Scryfall limitation)
    for (let i = 0; i < count; i++) {
      try {
        const response = await rateLimitedFetch(url);
        const data = await response.json();
        cards.push(transformScryfallCard(data));
      } catch (error) {
        console.error(`Error fetching random card ${i + 1}:`, error);
        // Continue with other cards even if one fails
      }
    }
    
    return cards;
  } catch (error) {
    console.error('Error fetching random cards:', error);
    return [];
  }
}

// Get cards by set
export async function getCardsBySet(setCode: string, options: SearchOptions = {}): Promise<SearchResult> {
  return searchCards(`set:${setCode}`, options);
}

// Get autocomplete suggestions for card names
export async function getCardSuggestions(partialName: string): Promise<string[]> {
  try {
    const apiBase = getApiBase();
    const endpoint = apiBase === SCRYFALL_API_BASE ? `/cards/autocomplete?q=${encodeURIComponent(partialName)}` : `/autocomplete?q=${encodeURIComponent(partialName)}`;
    const url = `${apiBase}${endpoint}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching card suggestions:', error);
    return [];
  }
}

// Map common CardSphere set names to Scryfall set codes
const setNameMappings: Record<string, string> = {
  'Adventures in the Forgotten Realms Commander Decks': 'afc',
  'Mystery Booster': 'mb1',
  'Commander 2019': 'c19',
  'Commander 2020': 'c20',
  'Commander 2021': 'c21',
  'Time Spiral Remastered': 'tsr',
  'Modern Masters 2017': 'mm3',
  'Modern Masters 2015': 'mm2',
  'Ultimate Masters': 'uma',
  'Double Masters': '2xm',
  'Double Masters 2022': '2x2',
  'Jumpstart': 'jmp',
  'Commander Legends': 'cmr',
  'Theros Beyond Death': 'thb',
  'Ikoria: Lair of Behemoths': 'iko',
  'Core Set 2021': 'm21',
  'Core Set 2020': 'm20',
  'War of the Spark': 'war'
};

// Get card by exact name and set (for CardSphere CSV mapping)
export async function getCardByNameAndSet(cardName: string, setCode?: string): Promise<MTGCard | null> {
  // Normalize the set code if it's a full name
  let normalizedSetCode = setCode;
  if (setCode && setNameMappings[setCode]) {
    normalizedSetCode = setNameMappings[setCode];
  }

  // Try multiple search strategies
  const searchStrategies = [
    // Strategy 1: Exact name with normalized set
    () => {
      let searchQuery = `!"${cardName}"`;
      if (normalizedSetCode) {
        searchQuery += ` set:${normalizedSetCode}`;
      }
      return searchQuery;
    },
    
    // Strategy 2: Exact name with original set (if different from normalized)
    () => {
      if (setCode && normalizedSetCode && setCode !== normalizedSetCode) {
        return `!"${cardName}" set:${setCode}`;
      }
      return null;
    },
    
    // Strategy 3: Exact name without set (if set search failed)
    () => setCode ? `!"${cardName}"` : null,
    
    // Strategy 4: Fuzzy name search (without quotes)
    () => `${cardName}`,
    
    // Strategy 5: Fuzzy name with normalized set
    () => normalizedSetCode ? `${cardName} set:${normalizedSetCode}` : null
  ];

  for (const strategy of searchStrategies) {
    const searchQuery = strategy();
    if (!searchQuery) continue;

    try {
      const url = `${SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(searchQuery)}&order=released&dir=desc`;
      const response = await rateLimitedFetch(url);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Return the most recent printing if multiple versions exist
        return transformScryfallCard(data.data[0]);
      }
    } catch (error) {
      // If it's a 404, continue to next strategy
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        continue;
      }
      
      // For other errors, log and continue
      console.error('Error in search strategy:', {
        cardName,
        setCode,
        searchQuery,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // All strategies failed
  console.log(`Card not found with any strategy: ${cardName}${setCode ? ` (${setCode})` : ''}`);
  return null;
}

// Batch lookup for CardSphere CSV import
export async function batchLookupCards(cardEntries: Array<{name: string, set?: string, scryfallId?: string}>): Promise<Array<{
  name: string;
  set?: string;
  scryfallId?: string;
  card: MTGCard | null;
  error?: string;
}>> {
  const results = [];
  
  for (const entry of cardEntries) {
    try {
      let card: MTGCard | null = null;
      
      // Strategy 1: Try Scryfall ID first (most reliable)
      if (entry.scryfallId) {
        try {
          card = await getCard(entry.scryfallId);
        } catch (error) {
          console.log(`Failed to fetch card by Scryfall ID ${entry.scryfallId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Strategy 2: Fall back to name + set search if ID lookup failed
      if (!card) {
        card = await getCardByNameAndSet(entry.name, entry.set);
      }
      
      results.push({
        name: entry.name,
        set: entry.set,
        scryfallId: entry.scryfallId,
        card,
        error: card ? undefined : 'Card not found'
      });
    } catch (error) {
      results.push({
        name: entry.name,
        set: entry.set,
        scryfallId: entry.scryfallId,
        card: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}



