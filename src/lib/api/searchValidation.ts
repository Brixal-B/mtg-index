/**
 * Advanced Search Validation and Query Building
 * Provides robust validation and parsing for MTG card search queries
 */

import { createAPIError, sanitizeString } from './utils';
import { APIErrorCode, HTTPStatus } from './types';

// Valid Scryfall search operators
const VALID_OPERATORS = [
  'name', 'type', 'oracle', 'mana', 'cmc', 'power', 'toughness', 'loyalty',
  'artist', 'flavor', 'set', 'block', 'rarity', 'color', 'id', 'border',
  'frame', 'is', 'not', 'game', 'legal', 'banned', 'restricted', 'format',
  'usd', 'eur', 'tix', 'year', 'date', 'keyword', 'function', 'related'
];

// Valid sort orders
const VALID_SORT_ORDERS = [
  'name', 'set', 'released', 'rarity', 'color', 'usd', 'eur', 'tix', 'cmc',
  'power', 'toughness', 'artist', 'review'
];

// Valid sort directions
const VALID_SORT_DIRECTIONS = ['asc', 'desc', 'auto'];

// Valid rarities
const VALID_RARITIES = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'];

// Valid colors
const VALID_COLORS = ['w', 'u', 'b', 'r', 'g', 'c'];

// Valid formats
const VALID_FORMATS = [
  'standard', 'future', 'historic', 'gladiator', 'pioneer', 'explorer',
  'modern', 'legacy', 'pauper', 'vintage', 'penny', 'commander', 'brawl',
  'historicbrawl', 'alchemy', 'paupercommander', 'duel', 'oldschool',
  'premodern', 'predh'
];

export interface ValidatedSearchParams {
  query: string;
  page: number;
  order: string;
  dir: string;
  include_extras: boolean;
  include_multilingual: boolean;
  include_variations: boolean;
}

export interface SearchValidationResult {
  valid: boolean;
  params?: ValidatedSearchParams;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query: string): { valid: boolean; sanitized?: string; errors?: string[] } {
  const errors: string[] = [];
  
  // Basic sanitization
  const sanitized = sanitizeString(query, 1000).trim();
  
  if (!sanitized) {
    errors.push('Search query cannot be empty');
    return { valid: false, errors };
  }

  // Check for minimum length
  if (sanitized.length < 1) {
    errors.push('Search query must be at least 1 character long');
    return { valid: false, errors };
  }

  // Check for maximum length
  if (sanitized.length > 1000) {
    errors.push('Search query cannot exceed 1000 characters');
    return { valid: false, errors };
  }

  // Validate operators if present
  const operatorMatches = sanitized.match(/(\w+):/g);
  if (operatorMatches) {
    for (const match of operatorMatches) {
      const operator = match.slice(0, -1); // Remove the ':'
      if (!VALID_OPERATORS.includes(operator)) {
        errors.push(`Unknown search operator: ${operator}`);
      }
    }
  }

  // Check for balanced quotes
  const quotes = sanitized.match(/"/g);
  if (quotes && quotes.length % 2 !== 0) {
    errors.push('Unbalanced quotes in search query');
  }

  // Check for balanced parentheses
  let parenBalance = 0;
  for (const char of sanitized) {
    if (char === '(') parenBalance++;
    if (char === ')') parenBalance--;
    if (parenBalance < 0) {
      errors.push('Unbalanced parentheses in search query');
      break;
    }
  }
  if (parenBalance > 0) {
    errors.push('Unbalanced parentheses in search query');
  }

  return {
    valid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitized : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate sort parameters
 */
export function validateSortParams(order?: string, dir?: string): { valid: boolean; order?: string; dir?: string; errors?: string[] } {
  const errors: string[] = [];
  
  let validatedOrder = 'name'; // Default
  let validatedDir = 'asc'; // Default

  if (order) {
    if (!VALID_SORT_ORDERS.includes(order)) {
      errors.push(`Invalid sort order: ${order}. Valid values: ${VALID_SORT_ORDERS.join(', ')}`);
    } else {
      validatedOrder = order;
    }
  }

  if (dir) {
    if (!VALID_SORT_DIRECTIONS.includes(dir)) {
      errors.push(`Invalid sort direction: ${dir}. Valid values: ${VALID_SORT_DIRECTIONS.join(', ')}`);
    } else {
      validatedDir = dir;
    }
  }

  return {
    valid: errors.length === 0,
    order: validatedOrder,
    dir: validatedDir,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page?: string): { valid: boolean; page?: number; errors?: string[] } {
  const errors: string[] = [];
  let validatedPage = 1; // Default

  if (page) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    } else if (pageNum > 1000) {
      errors.push('Page cannot exceed 1000');
    } else {
      validatedPage = pageNum;
    }
  }

  return {
    valid: errors.length === 0,
    page: validatedPage,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Comprehensive search parameter validation
 */
export function validateSearchParams(params: Record<string, string>): SearchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate query
  const queryValidation = validateSearchQuery(params.q || '');
  if (!queryValidation.valid) {
    errors.push(...(queryValidation.errors || []));
    return { valid: false, errors };
  }

  // Validate sort parameters
  const sortValidation = validateSortParams(params.order, params.dir);
  if (!sortValidation.valid) {
    errors.push(...(sortValidation.errors || []));
  }

  // Validate pagination
  const paginationValidation = validatePaginationParams(params.page);
  if (!paginationValidation.valid) {
    errors.push(...(paginationValidation.errors || []));
  }

  // Validate boolean parameters
  const include_extras = params.include_extras === 'true';
  const include_multilingual = params.include_multilingual === 'true';
  const include_variations = params.include_variations === 'true';

  // Add warnings for potentially slow queries
  if (queryValidation.sanitized === '*' || queryValidation.sanitized === '') {
    warnings.push('Searching for all cards may be slow');
  }

  if (include_extras || include_multilingual || include_variations) {
    warnings.push('Including extras, multilingual, or variations may increase response time');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    params: {
      query: queryValidation.sanitized!,
      page: paginationValidation.page!,
      order: sortValidation.order!,
      dir: sortValidation.dir!,
      include_extras,
      include_multilingual,
      include_variations,
    },
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Build optimized search query for common use cases
 */
export function buildOptimizedQuery(query: string): string {
  // If it's a simple card name search, wrap in quotes for exact matching
  if (!/[:\(\)\-\+\*]/.test(query) && !query.includes('"')) {
    // Check if it looks like a card name
    if (query.length > 2 && /^[a-zA-Z\s,'-]+$/.test(query)) {
      return `"${query}"`;
    }
  }

  return query;
}

/**
 * Create an API error for validation failures
 */
export function createValidationError(errors: string[]): never {
  throw createAPIError(
    `Validation failed: ${errors.join('; ')}`,
    APIErrorCode.INVALID_SEARCH_QUERY,
    HTTPStatus.BAD_REQUEST,
    { validationErrors: errors }
  );
}
