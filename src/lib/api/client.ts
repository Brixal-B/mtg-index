/**
 * Modern MTG API Client
 * Simplified client that leverages our new unified API infrastructure
 * with proper error handling and TypeScript support
 */

import { MTGCard } from '@/lib/types';

// API Response Types (matching our server responses)
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    status: number;
    details?: any;
    timestamp?: string;
  };
  meta?: {
    total?: number;
    page?: number;
    hasMore?: boolean;
    cached?: boolean;
    requestId?: string;
    processingTime?: number;
  };
}

export interface SearchResponse {
  cards: MTGCard[];
  data: MTGCard[]; // Legacy compatibility
  totalCards: number;
  total_cards: number; // Legacy compatibility
  hasMore: boolean;
  has_more: boolean; // Legacy compatibility
  page: number;
  query?: {
    original: string;
    optimized: string;
    params: any;
  };
  warnings?: string[];
}

export interface AutocompleteResponse {
  data: string[];
  suggestions: string[]; // Legacy compatibility
}

export interface BatchLookupResponse {
  found: MTGCard[];
  notFound: Array<{
    identifier: any;
    error: string;
  }>;
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}

export interface RandomCardsResponse {
  cards: MTGCard[];
  count: number;
  requestedCount: number;
  warnings?: string[];
}

// API Error class for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Base API client configuration
const API_BASE = '/api/cards';

/**
 * Make API request with unified error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data: APIResponse<T> = await response.json();

    // Handle API errors (our unified error format)
    if (!data.success || data.error) {
      const error = data.error!;
      throw new APIError(
        error.message,
        error.code,
        error.status,
        error.details
      );
    }

    return data.data!;
  } catch (error) {
    // Handle network errors or JSON parsing errors
    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new APIError(
          'Network error: Unable to connect to the API',
          'NETWORK_ERROR',
          0
        );
      }
    }

    throw new APIError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : 'Unknown' }
    );
  }
}

/**
 * Search for cards with enhanced validation and optimization
 */
export async function searchCards(
  query: string,
  options: {
    page?: number;
    order?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'eur' | 'tix' | 'cmc';
    dir?: 'asc' | 'desc';
    include_extras?: boolean;
    include_multilingual?: boolean;
    include_variations?: boolean;
  } = {}
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set('q', query);
  
  if (options.page) params.set('page', options.page.toString());
  if (options.order) params.set('order', options.order);
  if (options.dir) params.set('dir', options.dir);
  if (options.include_extras) params.set('include_extras', 'true');
  if (options.include_multilingual) params.set('include_multilingual', 'true');
  if (options.include_variations) params.set('include_variations', 'true');

  return apiRequest<SearchResponse>(`/search?${params}`);
}

/**
 * Get autocomplete suggestions for card names
 */
export async function getCardSuggestions(
  partialName: string,
  options: {
    include_extras?: boolean;
  } = {}
): Promise<string[]> {
  const params = new URLSearchParams();
  params.set('q', partialName);
  
  if (options.include_extras) params.set('include_extras', 'true');

  const response = await apiRequest<AutocompleteResponse>(`/autocomplete?${params}`);
  return response.data;
}

/**
 * Get individual card by ID
 */
export async function getCard(cardId: string, options: { set?: string } = {}): Promise<MTGCard> {
  const params = new URLSearchParams();
  if (options.set) params.set('set', options.set);

  const queryString = params.toString();
  const endpoint = `/${cardId}${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<MTGCard>(endpoint);
}

/**
 * Batch lookup multiple cards
 */
export async function batchLookupCards(
  identifiers: Array<{
    id?: string;
    name?: string;
    set?: string;
  }>
): Promise<BatchLookupResponse> {
  return apiRequest<BatchLookupResponse>('/batch', {
    method: 'POST',
    body: JSON.stringify({ identifiers }),
  });
}

/**
 * Get random cards
 */
export async function getRandomCards(count: number = 1): Promise<MTGCard[]> {
  const params = new URLSearchParams();
  if (count > 1) params.set('count', count.toString());

  const response = await apiRequest<RandomCardsResponse>(`/random?${params}`);
  return response.cards;
}

// Legacy compatibility functions (to ease migration)

/**
 * Legacy search function for backward compatibility
 * @deprecated Use searchCards instead
 */
export async function advancedSearch(
  query: string = '',
  filters: any = {},
  options: any = {}
): Promise<{ data: MTGCard[]; cards: MTGCard[]; totalCount: number; totalCards: number; hasMore: boolean; page: number }> {
  console.warn('advancedSearch is deprecated. Use searchCards instead.');
  
  const response = await searchCards(query, options);
  
  return {
    data: response.cards,
    cards: response.cards,
    totalCount: response.totalCards,
    totalCards: response.totalCards,
    hasMore: response.hasMore,
    page: response.page,
  };
}

/**
 * Legacy function for price history - now handled by MTGJSON integration
 * @deprecated Use the MTGJSON integration instead
 */
export async function getPriceHistory(cardId: string, days: number = 30): Promise<any[]> {
  console.warn('getPriceHistory from Scryfall is deprecated. Use MTGJSON integration instead.');
  
  // For now, return empty array. The MTGJSON integration should handle this.
  return [];
}

/**
 * Legacy function for card by name and set
 * @deprecated Use batchLookupCards instead
 */
export async function getCardByNameAndSet(cardName: string, setCode?: string): Promise<MTGCard | null> {
  console.warn('getCardByNameAndSet is deprecated. Use batchLookupCards instead.');
  
  try {
    const response = await batchLookupCards([{ name: cardName, set: setCode }]);
    return response.found[0] || null;
  } catch {
    return null;
  }
}

/**
 * Legacy function for cards by set
 * @deprecated Use searchCards with set: filter instead
 */
export async function getCardsBySet(setCode: string, options: any = {}): Promise<any> {
  console.warn('getCardsBySet is deprecated. Use searchCards with set: filter instead.');
  
  return searchCards(`set:${setCode}`, options);
}
