import { MTGCard } from '@/lib/types';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

// Rate limiting: Scryfall requests that applications sleep 50-100ms between requests
const RATE_LIMIT_DELAY = 100;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
}

function transformScryfallCard(scryfallCard: any): MTGCard {
  return {
    id: scryfallCard.id,
    name: scryfallCard.name,
    manaCost: scryfallCard.mana_cost || '',
    convertedManaCost: scryfallCard.cmc || 0,
    type: scryfallCard.type_line || '',
    text: scryfallCard.oracle_text || '',
    power: scryfallCard.power || '',
    toughness: scryfallCard.toughness || '',
    loyalty: scryfallCard.loyalty || '',
    imageUrl: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal || '',
    setName: scryfallCard.set_name || '',
    setCode: scryfallCard.set || '',
    rarity: scryfallCard.rarity || 'common',
    prices: {
      usd: parseFloat(scryfallCard.prices?.usd) || null,
      usdFoil: parseFloat(scryfallCard.prices?.usd_foil) || null,
      eur: parseFloat(scryfallCard.prices?.eur) || null,
      eurFoil: parseFloat(scryfallCard.prices?.eur_foil) || null,
      tix: parseFloat(scryfallCard.prices?.tix) || null,
    },
    legalities: scryfallCard.legalities || {},
    multiverseId: scryfallCard.multiverse_ids?.[0],
  };
}

interface SearchOptions {
  page?: number;
  limit?: number;
  sort?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'eur' | 'tix' | 'cmc';
  order?: 'asc' | 'desc';
}

interface SearchResult {
  data: MTGCard[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

export async function searchCards(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const { page = 1, limit = 20, sort = 'name', order = 'asc' } = options;
  
  try {
    // Build search query
    const searchParams = new URLSearchParams({
      q: query,
      page: page.toString(),
      format: 'json',
      order: sort,
      dir: order,
    });

    const url = `${SCRYFALL_API_BASE}/cards/search?${searchParams}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();

    return {
      data: data.data?.map(transformScryfallCard) || [],
      totalCount: data.total_cards || 0,
      hasMore: data.has_more || false,
      page: page,
    };
  } catch (error) {
    console.error('Error searching cards:', error);
    
    // Return empty result on error
    return {
      data: [],
      totalCount: 0,
      hasMore: false,
      page: 1,
    };
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
  
  return searchCards(searchQuery.trim(), options);
}

export async function getCard(cardId: string): Promise<MTGCard> {
  try {
    const url = `${SCRYFALL_API_BASE}/cards/${cardId}`;
    const response = await rateLimitedFetch(url);
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
    // Note: Scryfall doesn't provide historical pricing data directly
    // This is a mock implementation that generates sample data
    // In a real application, you would need a different API or database for historical prices
    
    const card = await getCard(cardId);
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
    const url = `${SCRYFALL_API_BASE}/cards/autocomplete?q=${encodeURIComponent(partialName)}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching card suggestions:', error);
    return [];
  }
}



