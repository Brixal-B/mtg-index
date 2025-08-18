import { NextRequest, NextResponse } from 'next/server';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }
    
    // Forward the autocomplete request to Scryfall
    const scryfallUrl = `${SCRYFALL_API_BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(scryfallUrl, {
      headers: {
        'User-Agent': 'MTG-Index-App/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Scryfall API error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // Cache autocomplete for 1 minute
      },
    });
  } catch (error) {
    console.error('Error proxying Scryfall autocomplete:', error);
    return NextResponse.json(
      { error: 'Failed to get autocomplete suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
