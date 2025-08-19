import { NextRequest, NextResponse } from 'next/server';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Forward all query parameters to Scryfall
    const scryfallUrl = `${SCRYFALL_API_BASE}/cards/search?${searchParams.toString()}`;
    
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
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error proxying Scryfall search:', error);
    return NextResponse.json(
      { error: 'Failed to search cards', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
