'use client';

import { Search, Filter } from 'lucide-react';

interface SearchResultsProps {
  totalCards: number;
  currentCount: number;
  hasMore: boolean;
  loading: boolean;
  searchQuery?: string;
}

export function SearchResults({
  totalCards,
  currentCount,
  hasMore,
  loading,
  searchQuery,
}: SearchResultsProps) {
  if (loading && currentCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-border">
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4" />
          <span>
            Showing {currentCount.toLocaleString()} of {totalCards.toLocaleString()} cards
            {searchQuery && (
              <span className="ml-1">
                for &quot;<span className="font-medium text-foreground">{searchQuery}</span>&quot;
              </span>
            )}
          </span>
        </div>
        
        {hasMore && (
          <div className="flex items-center space-x-1 text-primary">
            <Filter className="h-3 w-3" />
            <span className="text-xs">More available</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">
          Loading...
        </div>
      )}
    </div>
  );
}





