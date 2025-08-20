/**
 * API Infrastructure Exports
 * Central export point for all API-related utilities, types, and clients
 */

// Types
export * from './types';

// Utilities
export * from './utils';

// Validation
export * from './validation';
export * from './searchValidation';

// Modern Client (recommended)
export * from './client';

// Scryfall Client
export * from './scryfallClient';

// Base Handlers
export * from './baseHandler';

// Re-export commonly used combinations for convenience
export {
  createAPIHandler,
  createCardAPIHandler,
  createSearchAPIHandler,
  createAutocompleteAPIHandler,
  transformScryfallCard,
} from './baseHandler';

export {
  scryfallClient,
  ScryfallClient,
} from './scryfallClient';

export type {
  APIResponse,
  APIError,
  CardSearchParams,
  AutocompleteParams,
  CardLookupParams,
  ScryfallRequestOptions,
  ScryfallResponse,
} from './types';

export {
  APIErrorCode,
  HTTPStatus,
} from './types';

export {
  createAPIError,
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  generateRequestId,
  sanitizeString,
  sanitizeNumber,
} from './utils';
