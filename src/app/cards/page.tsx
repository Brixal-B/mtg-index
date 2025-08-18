'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchFilters } from './components/SearchFilters';
import { CardGrid } from './components/CardGrid';
import { SearchResults } from './components/SearchResults';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { MTGCard, CardFilters } from '@/lib/types';
import { searchCards, advancedSearch } from '@/lib/api/scryfall';
import { Search } from 'lucide-react';

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
      let result;
      
      if (query.trim()) {
        // Use simple search for text queries
        result = await searchCards(query, {
          order: searchFilters.sortBy === 'price' ? 'usd' : searchFilters.sortBy as any,
          dir: searchFilters.sortOrder,
          page,
        });
      } else {
        // Use advanced search for filters
        result = await advancedSearch('', searchFilters, {
          order: searchFilters.sortBy === 'price' ? 'usd' : searchFilters.sortBy as any,
          dir: searchFilters.sortOrder,
          page,
        });
      }

      if (append) {
        setCards(prev => [...prev, ...result.cards]);
      } else {
        setCards(result.cards);
      }
      
      setTotalCards(result.totalCards);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search cards';
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
          currentCount={cards.length}
          hasMore={hasMore}
          loading={loading}
          searchQuery={searchQuery}
        />
      )}

      {/* Loading Spinner for Initial Load */}
      {loading && cards.length === 0 && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      )}

      {/* Card Grid */}
      {!loading || cards.length > 0 ? (
        <CardGrid
          cards={cards}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
        />
      ) : null}

      {/* No Results */}
      {!loading && !error && cards.length === 0 && (
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







