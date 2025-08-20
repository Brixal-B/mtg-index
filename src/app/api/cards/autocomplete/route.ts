import { NextRequest } from 'next/server';
import { 
  createAutocompleteAPIHandler,
  scryfallClient,
  sanitizeString
} from '@/lib/api';
import type { AutocompleteParams } from '@/lib/api';

// Dynamic route for autocomplete functionality  
export const dynamic = 'force-dynamic';

export const GET = createAutocompleteAPIHandler(async (params, request, context) => {
  // Sanitize and validate autocomplete parameters
  const autocompleteParams: AutocompleteParams = {
    q: sanitizeString(params.q, 100),
    include_extras: params.include_extras === 'true',
  };

  // Make request to Scryfall
  const scryfallResponse = await scryfallClient.getAutocomplete(autocompleteParams);
  
  // Return the suggestions
  return {
    data: scryfallResponse.data || [],
    suggestions: scryfallResponse.data || [], // Legacy compatibility
  };
}, {
  requiredParams: ['q'],
  cacheMaxAge: 60, // 1 minute
  staleWhileRevalidate: 120, // 2 minutes
});
