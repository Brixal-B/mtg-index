'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { CardFilters } from '@/lib/types';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFiltersChange: (filters: CardFilters) => void;
  initialQuery?: string;
  initialFilters?: CardFilters;
  loading?: boolean;
}

const colorOptions = [
  { value: 'W', label: 'White', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'U', label: 'Blue', color: 'bg-blue-100 text-blue-800' },
  { value: 'B', label: 'Black', color: 'bg-gray-100 text-gray-800' },
  { value: 'R', label: 'Red', color: 'bg-red-100 text-red-800' },
  { value: 'G', label: 'Green', color: 'bg-green-100 text-green-800' },
];

const rarityOptions = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
];

const formatOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'modern', label: 'Modern' },
  { value: 'legacy', label: 'Legacy' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'commander', label: 'Commander/EDH' },
  { value: 'pauper', label: 'Pauper' },
  { value: 'historic', label: 'Historic' },
  { value: 'explorer', label: 'Explorer' },
];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'usd', label: 'Price (USD)' },
  { value: 'released', label: 'Release Date' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'cmc', label: 'Mana Cost' },
];

export function SearchFilters({
  onSearch,
  onFiltersChange,
  initialQuery = '',
  initialFilters = {},
  loading = false,
}: SearchFiltersProps) {
  const [query, setQuery] = useState(initialQuery);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<CardFilters>({
    sortBy: 'name',
    sortOrder: 'asc',
    ...initialFilters,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleFilterChange = (key: keyof CardFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleArrayFilterChange = (key: keyof CardFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const clearFilters = () => {
    const clearedFilters: CardFilters = {
      sortBy: 'name',
      sortOrder: 'asc',
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Boolean(
    filters.colors?.length ||
    filters.rarity?.length ||
    filters.sets?.length ||
    filters.types?.length ||
    filters.formats?.length ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minCmc ||
    filters.maxCmc
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cards by name, type, or text..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="h-4 w-4" />
          <span>Advanced Filters</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy || 'name'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Order
              </label>
              <select
                value={filters.sortOrder || 'asc'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Colors
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  onClick={() => handleArrayFilterChange('colors', color.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.colors?.includes(color.value)
                      ? color.color
                      : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  }`}
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Rarity
            </label>
            <div className="flex flex-wrap gap-2">
              {rarityOptions.map(rarity => (
                <button
                  key={rarity.value}
                  onClick={() => handleArrayFilterChange('rarity', rarity.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.rarity?.includes(rarity.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  }`}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formats */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Legal Formats
            </label>
            <div className="flex flex-wrap gap-2">
              {formatOptions.map(format => (
                <button
                  key={format.value}
                  onClick={() => handleArrayFilterChange('formats', format.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.formats?.includes(format.value)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Price Range (USD)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Min price"
                  min="0"
                  step="0.01"
                  value={filters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max price"
                  min="0"
                  step="0.01"
                  value={filters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Mana Cost Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Mana Cost Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Min CMC"
                  min="0"
                  value={filters.minCmc || ''}
                  onChange={(e) => handleFilterChange('minCmc', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max CMC"
                  min="0"
                  value={filters.maxCmc || ''}
                  onChange={(e) => handleFilterChange('maxCmc', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







