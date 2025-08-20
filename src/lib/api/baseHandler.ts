/**
 * Base API Handler
 * Provides a unified foundation for all API routes with consistent
 * error handling, validation, caching, and response formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import type { 
  APIResponse, 
  APIError, 
  ResponseMeta 
} from './types';
import { APIErrorCode, HTTPStatus } from './types';
import { 
  createAPIError, 
  createSuccessResponse, 
  createErrorResponse, 
  sendResponse, 
  parseSearchParams, 
  validateRequiredParams, 
  generateRequestId, 
  calculateProcessingTime, 
  logAPIRequest, 
  logAPIResponse,
  withErrorHandling 
} from './utils';

// Base handler configuration
export interface BaseHandlerConfig {
  requiredParams?: readonly string[];
  optionalParams?: readonly string[];
  cacheMaxAge?: number;
  staleWhileRevalidate?: number;
  timeout?: number;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

// Handler function type
export type HandlerFunction<T = any> = (
  params: Record<string, string>,
  request: NextRequest,
  context: HandlerContext
) => Promise<T>;

// Handler context
export interface HandlerContext {
  requestId: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
}

/**
 * Create a base API handler with unified functionality
 */
export function createAPIHandler<T = any>(
  handler: HandlerFunction<T>,
  config: BaseHandlerConfig = {}
) {
  return withErrorHandling(async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Parse request parameters
    const params = parseSearchParams(request);
    
    // Create handler context
    const context: HandlerContext = {
      requestId,
      startTime,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    };
    
    try {
      // Validate required parameters
      if (config.requiredParams) {
        const validationError = validateRequiredParams(params, config.requiredParams);
        if (validationError) {
          return sendResponse(createErrorResponse(validationError), validationError.status);
        }
      }
      
      // Execute the handler
      const data = await handler(params, request, context);
      
      // Create response metadata
      const meta: ResponseMeta = {
        requestId,
        processingTime: calculateProcessingTime(startTime),
      };
      
      // Create success response
      const response = createSuccessResponse(data, meta);
      
      // Send response with caching headers
      return sendResponse(
        response,
        HTTPStatus.OK,
        config.cacheMaxAge,
        config.staleWhileRevalidate
      );
      
    } catch (error) {
      // Handle known API errors (thrown by our API infrastructure)
      if (error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error) {
        const apiError = error as APIError;
        return sendResponse(createErrorResponse(apiError), apiError.status);
      }
      
      // Handle unknown errors
      const apiError = createAPIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        APIErrorCode.INTERNAL_ERROR,
        HTTPStatus.INTERNAL_SERVER_ERROR,
        { 
          requestId,
          stack: error instanceof Error ? error.stack : undefined 
        }
      );
      
      return sendResponse(createErrorResponse(apiError), apiError.status);
    }
  });
}

/**
 * Create a card-specific API handler with MTG card transformations
 */
export function createCardAPIHandler<T = any>(
  handler: HandlerFunction<T>,
  config: BaseHandlerConfig = {}
) {
  // Default caching for card endpoints
  const cardConfig: BaseHandlerConfig = {
    cacheMaxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
    ...config,
  };
  
  return createAPIHandler(handler, cardConfig);
}

/**
 * Create a search-specific API handler with search optimizations
 */
export function createSearchAPIHandler<T = any>(
  handler: HandlerFunction<T>,
  config: BaseHandlerConfig = {}
) {
  // Default configuration for search endpoints
  const searchConfig: BaseHandlerConfig = {
    cacheMaxAge: 180, // 3 minutes
    staleWhileRevalidate: 360, // 6 minutes
    requiredParams: ['q'],
    ...config,
  };
  
  return createAPIHandler(handler, searchConfig);
}

/**
 * Create an autocomplete-specific API handler
 */
export function createAutocompleteAPIHandler<T = any>(
  handler: HandlerFunction<T>,
  config: BaseHandlerConfig = {}
) {
  // Default configuration for autocomplete endpoints
  const autocompleteConfig: BaseHandlerConfig = {
    cacheMaxAge: 60, // 1 minute
    staleWhileRevalidate: 120, // 2 minutes
    requiredParams: ['q'],
    ...config,
  };
  
  return createAPIHandler(handler, autocompleteConfig);
}

/**
 * Transform Scryfall card data to our internal format
 * This function can be used by handlers that work with card data
 */
export function transformScryfallCard(scryfallCard: any): any {
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
    rarity: scryfallCard.rarity || 'common',
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
