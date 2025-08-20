/**
 * Shared Scryfall API proxy utilities
 * Consolidates common patterns used across API routes
 */

import { NextRequest, NextResponse } from 'next/server';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

interface ProxyOptions {
  endpoint: string;
  cacheMaxAge?: number;
  staleWhileRevalidate?: number;
  requiredParams?: readonly string[];
  transformParams?: (params: URLSearchParams) => string;
}

/**
 * Common headers for Scryfall API requests
 */
const getScryfallHeaders = () => ({
  'User-Agent': 'MTG-Index-App/1.0',
  'Accept': 'application/json',
});

/**
 * Common error response formatting
 */
const createErrorResponse = (
  message: string, 
  status: number, 
  details?: any
): NextResponse => {
  return NextResponse.json(
    { error: message, details: details || {} },
    { status }
  );
};

/**
 * Common success response with caching headers
 */
const createSuccessResponse = (
  data: any,
  cacheMaxAge: number = 300,
  staleWhileRevalidate: number = 600
): NextResponse => {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
};

/**
 * Generic Scryfall API proxy handler
 */
export async function proxyScryfallRequest(
  request: NextRequest,
  options: ProxyOptions
): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Check required parameters
    if (options.requiredParams) {
      for (const param of options.requiredParams) {
        if (!searchParams.get(param)) {
          return createErrorResponse(
            `${param} parameter is required`,
            400
          );
        }
      }
    }
    
    // Build Scryfall URL
    const paramString = options.transformParams 
      ? options.transformParams(searchParams)
      : searchParams.toString();
    
    const scryfallUrl = `${SCRYFALL_API_BASE}${options.endpoint}${paramString ? '?' + paramString : ''}`;
    
    // Make request to Scryfall
    const response = await fetch(scryfallUrl, {
      headers: getScryfallHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return createErrorResponse(
        `Scryfall API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    return createSuccessResponse(
      data,
      options.cacheMaxAge,
      options.staleWhileRevalidate
    );
    
  } catch (error) {
    console.error('Error proxying Scryfall request:', error);
    return createErrorResponse(
      'Failed to proxy request',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Specific proxy configurations for different endpoints
 */
export const scryfallProxyConfigs = {
  search: {
    endpoint: '/cards/search',
    cacheMaxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  },
  autocomplete: {
    endpoint: '/cards/autocomplete',
    cacheMaxAge: 60, // 1 minute
    staleWhileRevalidate: 120, // 2 minutes
    requiredParams: ['q'],
    transformParams: (params: URLSearchParams) => {
      const query = params.get('q');
      return `q=${encodeURIComponent(query || '')}`;
    },
  },
} as const;
