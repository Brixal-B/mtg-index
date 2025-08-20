import { NextRequest } from 'next/server';
import { 
  createCardAPIHandler,
  scryfallClient,
  transformScryfallCard,
  createAPIError,
  APIErrorCode,
  HTTPStatus
} from '@/lib/api';
import type { CardLookupParams } from '@/lib/api';

// Dynamic route for individual card lookup
export const dynamic = 'force-dynamic';

// We need to handle the Next.js params structure
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const handler = createCardAPIHandler(async (queryParams, request, context) => {
    // Extract card ID from Next.js route params
    const { id: cardId } = await params;
    
    if (!cardId || cardId.trim() === '') {
      throw createAPIError(
        'Card ID is required',
        APIErrorCode.INVALID_CARD_ID,
        HTTPStatus.BAD_REQUEST
      );
    }

    // Sanitize the card ID (basic validation)
    const sanitizedCardId = cardId.trim();
    
    // Validate card ID format (UUID or Scryfall ID)
    if (!/^[a-f0-9-]{36}$|^[a-f0-9]{32}$/.test(sanitizedCardId)) {
      throw createAPIError(
        'Invalid card ID format',
        APIErrorCode.INVALID_CARD_ID,
        HTTPStatus.BAD_REQUEST
      );
    }

    const lookupParams: CardLookupParams = {
      id: sanitizedCardId,
      set: queryParams.set,
      format: 'json',
    };

    // Make request to Scryfall
    const scryfallCard = await scryfallClient.getCard(lookupParams);
    
    // Transform and return the card
    return transformScryfallCard(scryfallCard);
  }, {
    cacheMaxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  });

  return handler(request);
}
