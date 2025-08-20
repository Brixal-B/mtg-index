/**
 * Unified API Types for MTG Index
 * Provides consistent typing across all API endpoints
 */

// Base API Response Structure
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: ResponseMeta;
}

// Error Structure
export interface APIError {
  message: string;
  code: string;
  status: number;
  details?: any;
  timestamp?: string;
}

// Response Metadata
export interface ResponseMeta {
  total?: number;
  page?: number;
  hasMore?: boolean;
  cached?: boolean;
  requestId?: string;
  processingTime?: number;
}

// Scryfall API specific types
export interface ScryfallRequestOptions {
  endpoint: string;
  params?: Record<string, string>;
  cacheMaxAge?: number;
  staleWhileRevalidate?: number;
  timeout?: number;
}

export interface ScryfallResponse<T = any> {
  object: string;
  data?: T[];
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
  warnings?: string[];
}

// Card Search Types
export interface CardSearchParams {
  q: string;
  page?: number;
  order?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'eur' | 'tix' | 'cmc';
  dir?: 'asc' | 'desc';
  format?: 'json';
  include_extras?: boolean;
  include_multilingual?: boolean;
  include_variations?: boolean;
}

export interface CardSearchResult {
  cards: any[];
  totalCards: number;
  hasMore: boolean;
  page: number;
}

// Autocomplete Types
export interface AutocompleteParams {
  q: string;
  include_extras?: boolean;
}

// Individual Card Types
export interface CardLookupParams {
  id: string;
  set?: string;
  format?: 'json' | 'text' | 'image';
}

// Error Codes
export enum APIErrorCode {
  // General
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Scryfall specific
  SCRYFALL_ERROR = 'SCRYFALL_ERROR',
  SCRYFALL_TIMEOUT = 'SCRYFALL_TIMEOUT',
  SCRYFALL_RATE_LIMIT = 'SCRYFALL_RATE_LIMIT',
  
  // Card specific
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  INVALID_CARD_ID = 'INVALID_CARD_ID',
  
  // Search specific
  INVALID_SEARCH_QUERY = 'INVALID_SEARCH_QUERY',
  SEARCH_TIMEOUT = 'SEARCH_TIMEOUT',
}

// HTTP Status Codes
export enum HTTPStatus {
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}
