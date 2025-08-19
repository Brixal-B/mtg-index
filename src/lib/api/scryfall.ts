import { MTGCard } from '@/lib/types';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const API_PROXY_BASE = '/api/cards'; // Our Next.js API routes

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
  
  const response = await fetch(url);
  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.clone().json();
      if (errorData.details) {
        errorMessage += ` - ${errorData.details}`;
      }
    } catch (e) {
      // If we can't parse error response, just use status
      errorMessage += ` - ${response.statusText}`;
    }
    throw new Error(errorMessage);
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

    const url = `${API_PROXY_BASE}/search?${searchParams}`;
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
  formats?: string[]; // Changed from format to formats array
  minCmc?: number;
  maxCmc?: number;
  minPrice?: number;
  maxPrice?: number;
}

export async function advancedSearch(
  query: string = '',
  filters: AdvancedSearchFilters = {},
  options: SearchOptions = {}
): Promise<SearchResult> {
  const { colors, types, sets, rarity, formats, minCmc, maxCmc, minPrice, maxPrice } = filters;
  
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
  
  if (formats && formats.length > 0) {
    // For multiple formats, we need to use OR logic
    const formatQuery = formats.map(f => `format:${f}`).join(' OR ');
    searchQuery += ` (${formatQuery})`;
  }
  
  const finalQuery = searchQuery.trim();
  // If no query and no filters, use default search
  const queryToUse = finalQuery || '*';
  return searchCards(queryToUse, options);
}

export async function getCard(cardId: string): Promise<MTGCard> {
  try {
    const url = `${API_PROXY_BASE}/${cardId}`;
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
    const url = `${API_PROXY_BASE}/autocomplete?q=${encodeURIComponent(partialName)}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching card suggestions:', error);
    return [];
  }
}

// Get card by exact name and set (for CardSphere CSV mapping)
export async function getCardByNameAndSet(cardName: string, setCode?: string): Promise<MTGCard | null> {
  try {
    let searchQuery = `!"${cardName}"`;
    if (setCode) {
      searchQuery += ` set:${setCode}`;
    }
    
    const url = `${SCRYFALL_API_BASE}/cards/search?q=${encodeURIComponent(searchQuery)}&order=released&dir=desc`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Return the most recent printing if multiple versions exist
      return transformScryfallCard(data.data[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching card by name and set:', error);
    return null;
  }
}

// Batch lookup for CardSphere CSV import
export async function batchLookupCards(cardEntries: Array<{name: string, set?: string}>): Promise<Array<{
  name: string;
  set?: string;
  card: MTGCard | null;
  error?: string;
}>> {
  const results = [];
  
  for (const entry of cardEntries) {
    try {
      const card = await getCardByNameAndSet(entry.name, entry.set);
      results.push({
        name: entry.name,
        set: entry.set,
        card,
        error: card ? undefined : 'Card not found'
      });
    } catch (error) {
      results.push({
        name: entry.name,
        set: entry.set,
        card: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}



