import { NextRequest } from 'next/server';
import { 
  createSearchAPIHandler,
  scryfallClient,
  transformScryfallCard,
} from '@/lib/api';
import type { CardSearchParams } from '@/lib/api';
import { validateSearchParams, createValidationError, buildOptimizedQuery } from '@/lib/api/searchValidation';

// Dynamic route for search functionality
export const dynamic = 'force-dynamic';

export const GET = createSearchAPIHandler(async (params, request, context) => {
  // Comprehensive validation of search parameters
  const validation = validateSearchParams(params);
  
  if (!validation.valid) {
    createValidationError(validation.errors || ['Unknown validation error']);
  }

  const validatedParams = validation.params!;

  // Optimize the query for better results
  const optimizedQuery = buildOptimizedQuery(validatedParams.query);

  // Build search parameters for Scryfall
  const searchParams: CardSearchParams = {
    q: optimizedQuery,
    page: validatedParams.page,
    order: validatedParams.order as any,
    dir: validatedParams.dir as 'asc' | 'desc',
    include_extras: validatedParams.include_extras,
    include_multilingual: validatedParams.include_multilingual,
    include_variations: validatedParams.include_variations,
  };

  // Make request to Scryfall
  const scryfallResponse = await scryfallClient.searchCards(searchParams);
  
  // Transform the response to match our expected format
  const cards = scryfallResponse.data?.map(transformScryfallCard) || [];
  
  const result = {
    cards,
    data: cards, // Legacy compatibility
    totalCards: scryfallResponse.total_cards || 0,
    total_cards: scryfallResponse.total_cards || 0, // Legacy compatibility
    hasMore: scryfallResponse.has_more || false,
    has_more: scryfallResponse.has_more || false, // Legacy compatibility
    page: searchParams.page,
    query: {
      original: validatedParams.query,
      optimized: optimizedQuery,
      params: validatedParams,
    },
  };

  // Add warnings if any
  if (validation.warnings && validation.warnings.length > 0) {
    (result as any).warnings = validation.warnings;
  }

  return result;
}, {
  requiredParams: ['q'],
  cacheMaxAge: 300, // 5 minutes
  staleWhileRevalidate: 600, // 10 minutes
});
