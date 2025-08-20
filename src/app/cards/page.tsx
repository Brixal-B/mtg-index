'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchFilters } from './components/SearchFilters';
import { CardGrid } from './components/CardGrid';
import { SearchResults } from './components/SearchResults';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { MTGCard, CardFilters } from '@/lib/types';
import { Search } from 'lucide-react';

// Helper function to build advanced search queries
function buildAdvancedSearchQuery(filters: CardFilters): string {
  const queryParts: string[] = [];
  
  if (filters.name) {
    queryParts.push(`name:${filters.name}`);
  }
  
  if (filters.colors && filters.colors.length > 0) {
    const colorQuery = filters.colors.map(c => `c:${c}`).join(' ');
    queryParts.push(`(${colorQuery})`);
  }
  
  if (filters.rarity && filters.rarity.length > 0) {
    const rarityQuery = filters.rarity.map(r => `r:${r}`).join(' OR ');
    queryParts.push(`(${rarityQuery})`);
  }
  
  if (filters.sets && filters.sets.length > 0) {
    const setQuery = filters.sets.map(s => `s:${s}`).join(' OR ');
    queryParts.push(`(${setQuery})`);
  }
  
  if (filters.types && filters.types.length > 0) {
    const typeQuery = filters.types.map(t => `t:${t}`).join(' OR ');
    queryParts.push(`(${typeQuery})`);
  }
  
  if (filters.minPrice !== undefined) {
    queryParts.push(`usd>=${filters.minPrice}`);
  }
  
  if (filters.maxPrice !== undefined) {
    queryParts.push(`usd<=${filters.maxPrice}`);
  }
  
  if (filters.minCmc !== undefined) {
    queryParts.push(`cmc>=${filters.minCmc}`);
  }
  
  if (filters.maxCmc !== undefined) {
    queryParts.push(`cmc<=${filters.maxCmc}`);
  }
  
  return queryParts.length > 0 ? queryParts.join(' ') : '*';
}

export default function CardsPage() {
  const [cards, setCards] = useState<MTGCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCards, setTotalCards] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState<CardFilters>({
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const performSearch = useCallback(async (
    query: string, 
    searchFilters: CardFilters, 
    page: number = 1,
    append: boolean = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Import the new client dynamically to avoid SSR issues
      const { searchCards } = await import('@/lib/api/client');
      
      // Build the search query
      const searchQuery = query.trim() || buildAdvancedSearchQuery(searchFilters) || '*';
      
      // Use the new client with proper options
      const response = await searchCards(searchQuery, {
        page,
        order: searchFilters.sortBy === 'price' ? 'usd' : searchFilters.sortBy,
        dir: searchFilters.sortOrder,
      });

      // The response is now properly typed and structured
      const cards = response.cards;
      const totalCards = response.totalCards;
      const hasMore = response.hasMore;

      if (append) {
        setCards(prev => [...(prev || []), ...cards]);
      } else {
        setCards(cards);
      }
      
      setTotalCards(totalCards);
      setHasMore(hasMore);
      setCurrentPage(page);

      // Show warnings if any (new feature)
      if (response.warnings && response.warnings.length > 0) {
        console.warn('Search warnings:', response.warnings);
      }

    } catch (err) {
      let errorMessage = 'Failed to search cards';
      
      if (err instanceof Error && 'code' in err) {
        // Handle our structured API errors
        const apiError = err as any;
        errorMessage = apiError.message;
        
        // Provide user-friendly messages for common errors
        switch (apiError.code) {
          case 'INVALID_SEARCH_QUERY':
            errorMessage = 'Invalid search query. Please check your search terms and try again.';
            break;
          case 'SCRYFALL_RATE_LIMIT':
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 'SCRYFALL_ERROR':
            errorMessage = 'Card database is temporarily unavailable. Please try again later.';
            break;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      if (!append) {
        setCards([]);
        setTotalCards(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    performSearch(query, filters, 1, false);
  }, [filters, performSearch]);

  const handleFiltersChange = useCallback((newFilters: CardFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    performSearch(searchQuery, newFilters, 1, false);
  }, [searchQuery, performSearch]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      performSearch(searchQuery, filters, currentPage + 1, true);
    }
  }, [loading, hasMore, searchQuery, filters, currentPage, performSearch]);

  // Initial load with popular cards
  useEffect(() => {
    // Load initial cards with a default search that shows popular/expensive cards
    performSearch('*', { ...filters, sortBy: 'price', sortOrder: 'desc' }, 1, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Search className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Browse Cards</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore the complete Magic: The Gathering card database with real-time pricing and advanced filters.
        </p>
      </div>

      {/* Search and Filters */}
      <SearchFilters
        onSearch={handleSearch}
        onFiltersChange={handleFiltersChange}
        initialQuery={searchQuery}
        initialFilters={filters}
        loading={loading}
      />

      {/* Error Display */}
      {error && (
        <ErrorMessage 
          message={error}
          onRetry={() => performSearch(searchQuery, filters, 1, false)}
        />
      )}

      {/* Results Info */}
      {!error && (
        <SearchResults
          totalCards={totalCards}
          currentCount={cards?.length || 0}
          hasMore={hasMore}
          loading={loading}
          searchQuery={searchQuery}
        />
      )}

      {/* Loading Spinner for Initial Load */}
      {loading && (cards?.length || 0) === 0 && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      )}

      {/* Card Grid */}
      {!loading || (cards?.length || 0) > 0 ? (
        <CardGrid
          cards={cards || []}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
        />
      ) : null}

      {/* No Results */}
      {!loading && !error && (cards?.length || 0) === 0 && (
        <div className="text-center py-12 space-y-4">
          <Search className="h-16 w-16 text-muted-foreground mx-auto" />
          <h3 className="text-xl font-semibold text-foreground">No cards found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters to find more cards.
          </p>
        </div>
      )}
    </div>
  );
}







