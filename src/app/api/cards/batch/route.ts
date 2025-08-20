import { NextRequest } from 'next/server';
import { 
  createCardAPIHandler,
  scryfallClient,
  transformScryfallCard,
  createAPIError,
  APIErrorCode,
  HTTPStatus,
  sanitizeString
} from '@/lib/api';

// Dynamic route for batch card lookup
export const dynamic = 'force-dynamic';

interface BatchLookupRequest {
  identifiers: Array<{
    id?: string;
    name?: string;
    set?: string;
  }>;
}

interface BatchLookupResult {
  found: any[];
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

export const POST = createCardAPIHandler(async (params, request, context) => {
  // Parse the request body
  let body: BatchLookupRequest;
  try {
    body = await request.json();
  } catch (error) {
    throw createAPIError(
      'Invalid JSON in request body',
      APIErrorCode.INVALID_REQUEST,
      HTTPStatus.BAD_REQUEST
    );
  }

  // Validate the request structure
  if (!body.identifiers || !Array.isArray(body.identifiers)) {
    throw createAPIError(
      'Request must contain an "identifiers" array',
      APIErrorCode.INVALID_REQUEST,
      HTTPStatus.BAD_REQUEST
    );
  }

  // Limit batch size to prevent abuse
  const maxBatchSize = 100;
  if (body.identifiers.length === 0) {
    throw createAPIError(
      'Identifiers array cannot be empty',
      APIErrorCode.INVALID_REQUEST,
      HTTPStatus.BAD_REQUEST
    );
  }

  if (body.identifiers.length > maxBatchSize) {
    throw createAPIError(
      `Batch size exceeds maximum limit of ${maxBatchSize}`,
      APIErrorCode.INVALID_REQUEST,
      HTTPStatus.BAD_REQUEST
    );
  }

  // Sanitize and validate identifiers
  const sanitizedIdentifiers = body.identifiers.map((identifier, index) => {
    const sanitized: any = {};
    
    if (identifier.id) {
      const id = sanitizeString(identifier.id, 50);
      // Validate ID format (UUID or Scryfall ID)
      if (!/^[a-f0-9-]{36}$|^[a-f0-9]{32}$/.test(id)) {
        throw createAPIError(
          `Invalid card ID format at index ${index}: ${id}`,
          APIErrorCode.INVALID_CARD_ID,
          HTTPStatus.BAD_REQUEST
        );
      }
      sanitized.id = id;
    }
    
    if (identifier.name) {
      sanitized.name = sanitizeString(identifier.name, 200);
    }
    
    if (identifier.set) {
      sanitized.set = sanitizeString(identifier.set, 10).toLowerCase();
    }

    // At least one identifier must be provided
    if (!sanitized.id && !sanitized.name) {
      throw createAPIError(
        `Invalid identifier at index ${index}: must provide either id or name`,
        APIErrorCode.INVALID_REQUEST,
        HTTPStatus.BAD_REQUEST
      );
    }

    return sanitized;
  });

  try {
    // Make batch request to Scryfall
    const scryfallResponse = await scryfallClient.batchLookupCards(sanitizedIdentifiers);
    
    // Transform found cards
    const foundCards = scryfallResponse.data?.map(transformScryfallCard) || [];
    
    // Identify not found cards
    const notFound = sanitizedIdentifiers
      .map((identifier, index) => ({ identifier, index }))
      .filter(({ identifier, index }) => {
        // Check if this identifier was found in the results
        const found = foundCards.some(card => {
          if (identifier.id) {
            return card.id === identifier.id || card.scryfallId === identifier.id;
          }
          if (identifier.name) {
            return card.name.toLowerCase() === identifier.name.toLowerCase();
          }
          return false;
        });
        return !found;
      })
      .map(({ identifier }) => ({
        identifier,
        error: 'Card not found'
      }));

    const result: BatchLookupResult = {
      found: foundCards,
      notFound,
      summary: {
        total: sanitizedIdentifiers.length,
        found: foundCards.length,
        notFound: notFound.length,
      }
    };

    return result;

  } catch (error) {
    // If it's already an API error, re-throw it
    if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
      throw error;
    }

    // Otherwise, wrap it
    throw createAPIError(
      'Failed to perform batch lookup',
      APIErrorCode.SCRYFALL_ERROR,
      HTTPStatus.BAD_GATEWAY,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}, {
  cacheMaxAge: 180, // 3 minutes - shorter cache for batch operations
  staleWhileRevalidate: 360, // 6 minutes
});
