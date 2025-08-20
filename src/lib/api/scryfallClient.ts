/**
 * Centralized Scryfall API Client
 * Handles all communication with the Scryfall API with proper rate limiting,
 * error handling, and response transformation
 */

import type { 
  ScryfallRequestOptions, 
  ScryfallResponse, 
  APIError, 
  CardSearchParams,
  AutocompleteParams,
  CardLookupParams 
} from './types';
import { APIErrorCode, HTTPStatus } from './types';
import { createAPIError } from './utils';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const USER_AGENT = 'MTG-Index-App/1.0';

// Rate limiting: Scryfall requests max 10 requests per second
// We use 150ms to be conservative
const RATE_LIMIT_DELAY = 150;
let lastRequestTime = 0;

/**
 * Rate limiting implementation
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Create standard headers for Scryfall requests
 */
function createHeaders(): HeadersInit {
  return {
    'Accept': 'application/json',
    'User-Agent': USER_AGENT,
  };
}

/**
 * Transform Scryfall error to our API error format
 */
function transformScryfallError(response: Response, errorData?: any): APIError {
  const status = response.status;
  
  switch (status) {
    case 400:
      return createAPIError(
        errorData?.details || 'Invalid request to Scryfall API',
        APIErrorCode.INVALID_REQUEST,
        HTTPStatus.BAD_REQUEST,
        errorData
      );
    case 404:
      return createAPIError(
        'Resource not found',
        APIErrorCode.CARD_NOT_FOUND,
        HTTPStatus.NOT_FOUND,
        errorData
      );
    case 429:
      return createAPIError(
        'Rate limit exceeded. Please wait before making another request.',
        APIErrorCode.SCRYFALL_RATE_LIMIT,
        HTTPStatus.TOO_MANY_REQUESTS,
        errorData
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return createAPIError(
        'Scryfall API is temporarily unavailable',
        APIErrorCode.SCRYFALL_ERROR,
        HTTPStatus.BAD_GATEWAY,
        errorData
      );
    default:
      return createAPIError(
        `Scryfall API error: ${response.statusText}`,
        APIErrorCode.SCRYFALL_ERROR,
        HTTPStatus.BAD_GATEWAY,
        errorData
      );
  }
}

/**
 * Core Scryfall API request function
 */
async function makeScryfallRequest<T = any>(
  endpoint: string,
  params?: Record<string, string>,
  timeout: number = 10000
): Promise<T> {
  await enforceRateLimit();
  
  // Build URL with parameters
  const url = new URL(`${SCRYFALL_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url.toString(), {
      headers: createHeaders(),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors for error responses
      }
      
      throw transformScryfallError(response, errorData);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw createAPIError(
          'Request timeout',
          APIErrorCode.SCRYFALL_TIMEOUT,
          HTTPStatus.GATEWAY_TIMEOUT
        );
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw createAPIError(
          'Network error: Unable to connect to Scryfall API',
          APIErrorCode.SCRYFALL_ERROR,
          HTTPStatus.BAD_GATEWAY
        );
      }
    }
    
    throw createAPIError(
      'Unknown error occurred while contacting Scryfall API',
      APIErrorCode.SCRYFALL_ERROR,
      HTTPStatus.INTERNAL_SERVER_ERROR,
      { originalError: error instanceof Error ? error.message : 'Unknown' }
    );
  }
}

/**
 * Scryfall Client Class
 */
export class ScryfallClient {
  /**
   * Search for cards
   */
  async searchCards(params: CardSearchParams): Promise<ScryfallResponse> {
    const searchParams: Record<string, string> = {
      q: params.q,
      format: 'json',
    };
    
    if (params.page) searchParams.page = params.page.toString();
    if (params.order) searchParams.order = params.order;
    if (params.dir) searchParams.dir = params.dir;
    if (params.include_extras !== undefined) searchParams.include_extras = params.include_extras.toString();
    if (params.include_multilingual !== undefined) searchParams.include_multilingual = params.include_multilingual.toString();
    if (params.include_variations !== undefined) searchParams.include_variations = params.include_variations.toString();
    
    return makeScryfallRequest<ScryfallResponse>('/cards/search', searchParams);
  }
  
  /**
   * Get autocomplete suggestions
   */
  async getAutocomplete(params: AutocompleteParams): Promise<{ data: string[] }> {
    const searchParams: Record<string, string> = {
      q: params.q,
    };
    
    if (params.include_extras !== undefined) {
      searchParams.include_extras = params.include_extras.toString();
    }
    
    return makeScryfallRequest<{ data: string[] }>('/cards/autocomplete', searchParams);
  }
  
  /**
   * Get individual card by ID
   */
  async getCard(params: CardLookupParams): Promise<any> {
    const searchParams: Record<string, string> = {};
    
    if (params.set) searchParams.set = params.set;
    if (params.format) searchParams.format = params.format;
    
    return makeScryfallRequest(`/cards/${params.id}`, Object.keys(searchParams).length > 0 ? searchParams : undefined);
  }
  
  /**
   * Get random card
   */
  async getRandomCard(): Promise<any> {
    return makeScryfallRequest('/cards/random');
  }
  
  /**
   * Get card by exact name (for legacy support)
   */
  async getCardByName(name: string, set?: string): Promise<any> {
    const searchParams: Record<string, string> = {
      exact: name,
    };
    
    if (set) searchParams.set = set;
    
    return makeScryfallRequest('/cards/named', searchParams);
  }
  
  /**
   * Batch lookup cards by identifiers
   */
  async batchLookupCards(identifiers: Array<{id?: string; name?: string; set?: string}>): Promise<{ data: any[] }> {
    const body = {
      identifiers: identifiers.map(identifier => {
        const item: any = {};
        if (identifier.id) item.id = identifier.id;
        if (identifier.name) item.name = identifier.name;
        if (identifier.set) item.set = identifier.set;
        return item;
      }),
    };
    
    // Note: This uses POST, so we need a different approach
    await enforceRateLimit();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Longer timeout for batch
    
    try {
      const response = await fetch(`${SCRYFALL_API_BASE}/cards/collection`, {
        method: 'POST',
        headers: {
          ...createHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors
        }
        
        throw transformScryfallError(response, errorData);
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
        throw error;
      }
      
      throw createAPIError(
        'Failed to perform batch lookup',
        APIErrorCode.SCRYFALL_ERROR,
        HTTPStatus.INTERNAL_SERVER_ERROR,
        { originalError: error instanceof Error ? error.message : 'Unknown' }
      );
    }
  }
}

// Export singleton instance
export const scryfallClient = new ScryfallClient();
