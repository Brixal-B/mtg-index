import { NextRequest } from 'next/server';
import { 
  createCardAPIHandler,
  scryfallClient,
  transformScryfallCard,
  createAPIError,
  APIErrorCode,
  HTTPStatus,
  sanitizeNumber
} from '@/lib/api';

// Dynamic route for random card fetching
export const dynamic = 'force-dynamic';

interface RandomCardsResult {
  cards: any[];
  count: number;
  requestedCount: number;
}

export const GET = createCardAPIHandler(async (params, request, context) => {
  // Parse and validate the count parameter
  const requestedCount = sanitizeNumber(params.count, 1, 1, 50); // Default 1, max 50
  
  // Validate that we're not requesting too many cards
  if (requestedCount > 50) {
    throw createAPIError(
      'Cannot request more than 50 random cards at once',
      APIErrorCode.INVALID_REQUEST,
      HTTPStatus.BAD_REQUEST
    );
  }

  try {
    const cards: any[] = [];
    const errors: string[] = [];

    // Fetch random cards one by one (Scryfall limitation)
    for (let i = 0; i < requestedCount; i++) {
      try {
        const scryfallCard = await scryfallClient.getRandomCard();
        const transformedCard = transformScryfallCard(scryfallCard);
        
        // Avoid duplicates by checking if we already have this card
        const isDuplicate = cards.some(existingCard => 
          existingCard.id === transformedCard.id
        );
        
        if (!isDuplicate) {
          cards.push(transformedCard);
        } else {
          // If we got a duplicate, try once more
          const retryCard = await scryfallClient.getRandomCard();
          const retryTransformed = transformScryfallCard(retryCard);
          
          const isRetryDuplicate = cards.some(existingCard => 
            existingCard.id === retryTransformed.id
          );
          
          if (!isRetryDuplicate) {
            cards.push(retryTransformed);
          }
          // If still duplicate, just accept fewer cards rather than infinite retry
        }
      } catch (error) {
        errors.push(`Failed to fetch random card ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue trying to fetch other cards
      }
    }

    // If we got no cards at all, that's an error
    if (cards.length === 0) {
      throw createAPIError(
        'Failed to fetch any random cards',
        APIErrorCode.SCRYFALL_ERROR,
        HTTPStatus.BAD_GATEWAY,
        { errors }
      );
    }

    const result: RandomCardsResult = {
      cards,
      count: cards.length,
      requestedCount,
    };

    // Add warnings to response metadata if we got fewer cards than requested
    if (cards.length < requestedCount && errors.length > 0) {
      (result as any).warnings = errors;
    }

    return result;

  } catch (error) {
    // If it's already an API error, re-throw it
    if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
      throw error;
    }

    // Otherwise, wrap it
    throw createAPIError(
      'Failed to fetch random cards',
      APIErrorCode.SCRYFALL_ERROR,
      HTTPStatus.BAD_GATEWAY,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}, {
  cacheMaxAge: 0, // Don't cache random cards - they should be truly random
  staleWhileRevalidate: 0,
});
