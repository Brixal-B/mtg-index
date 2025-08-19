import { NextRequest, NextResponse } from 'next/server';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    const scryfallUrl = `${SCRYFALL_API_BASE}/cards/${id}`;
    
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
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error proxying Scryfall card fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
