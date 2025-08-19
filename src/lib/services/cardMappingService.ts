import { MTGCard, MTGJSONCard } from '@/lib/types';
import { storageManager } from '@/lib/storage';

// MTGJSON AllPrintings data structure
interface MTGJSONSet {
  name: string;
  code: string;
  cards: MTGJSONCardData[];
}

interface MTGJSONCardData {
  uuid: string;
  name: string;
  setCode: string;
  number: string;
  rarity: string;
  colors?: string[];
  colorIdentity?: string[];
  manaCost?: string;
  convertedManaCost?: number;
  type?: string;
  subtypes?: string[];
  supertypes?: string[];
  artist?: string;
  identifiers?: {
    scryfallId?: string;
    multiverseId?: number;
    mtgjsonV4Id?: string;
  };
}

interface MTGJSONAllPrintings {
  data: Record<string, MTGJSONSet>;
  meta: {
    date: string;
    version: string;
  };
}

interface CardMapping {
  scryfallId: string;
  mtgjsonUuid: string;
  confidence: number; // 0-1 score of mapping confidence
  matchMethod: 'direct' | 'name_set' | 'name_fuzzy' | 'collector_number' | 'manual';
  lastUpdated: string;
}

interface MappingStats {
  totalMappings: number;
  directMatches: number;
  fuzzyMatches: number;
  unmappedCards: number;
  lastUpdate: string;
}

class CardMappingService {
  private allPrintingsData: MTGJSONAllPrintings | null = null;
  private mappingCache = new Map<string, CardMapping>();
  private loadingPromise: Promise<void> | null = null;

  // MTGJSON AllPrintings.json URL
  private readonly MTGJSON_ALL_PRINTINGS_URL = 'https://mtgjson.com/api/v5/AllPrintings.json';
  private readonly CACHE_KEY = 'mtgjson-all-printings';
  private readonly MAPPING_CACHE_KEY = 'card-mappings';

  /**
   * Initialize the mapping service by loading AllPrintings data
   */
  async initialize(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadAllPrintingsData();
    return this.loadingPromise;
  }

  /**
   * Load and cache AllPrintings.json data
   */
  private async loadAllPrintingsData(): Promise<void> {
    try {
      console.log('Loading MTGJSON AllPrintings data...');

      // Try to load from cache first
      const cached = await this.getCachedAllPrintings();
      if (cached && this.isDataFresh(cached.meta.date)) {
        this.allPrintingsData = cached;
        console.log('Loaded AllPrintings from cache');
        await this.loadMappingCache();
        return;
      }

      // Fetch fresh data from MTGJSON
      console.log('Fetching fresh AllPrintings data from MTGJSON...');
      const response = await fetch(this.MTGJSON_ALL_PRINTINGS_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch AllPrintings: ${response.status} ${response.statusText}`);
      }

      // Parse the response
      const data: MTGJSONAllPrintings = await response.json();
      
      if (!data.data || !data.meta) {
        throw new Error('Invalid AllPrintings response format');
      }
      
      this.allPrintingsData = data;
      
      // Store using the optimized storage system
      const { allPrintingsStorage } = await import('@/lib/utils/allPrintingsStorage');
      await allPrintingsStorage.storeAllPrintings(data);
      
      await this.loadMappingCache();
      
      console.log(`Loaded ${Object.keys(data.data).length} sets from MTGJSON`);
    } catch (error) {
      console.error('Failed to load AllPrintings data:', error);
      
      // Try to use optimized storage as fallback
      try {
        const { allPrintingsStorage } = await import('@/lib/utils/allPrintingsStorage');
        const isAvailable = await allPrintingsStorage.isDataAvailable();
        
        if (isAvailable) {
          console.log('Using stored AllPrintings data as fallback');
          // We'll work with the stored data without loading everything into memory
          await this.loadMappingCache();
          return;
        }
      } catch (storageError) {
        console.error('Failed to access stored AllPrintings data:', storageError);
      }
      
      throw new Error('Failed to load AllPrintings data and no cache available');
    }
  }

  /**
   * Get the MTGJSON UUID for a Scryfall card
   */
  async getMapping(scryfallCard: MTGCard): Promise<string | null> {
    await this.initialize();

    // Check cache first
    const cached = this.mappingCache.get(scryfallCard.id);
    if (cached) {
      return cached.mtgjsonUuid;
    }

    // Try to find mapping
    const mapping = await this.findCardMapping(scryfallCard);
    if (mapping) {
      // Cache the mapping
      this.mappingCache.set(scryfallCard.id, mapping);
      await this.saveMappingToCache(mapping);
      return mapping.mtgjsonUuid;
    }

    return null;
  }

  /**
   * Find mapping for a Scryfall card using multiple strategies
   */
  private async findCardMapping(scryfallCard: MTGCard): Promise<CardMapping | null> {
    // First try with in-memory AllPrintings data if available
    if (this.allPrintingsData) {
      const strategies = [
        () => this.findByDirectScryfallId(scryfallCard),
        () => this.findByNameAndSet(scryfallCard),
        () => this.findByCollectorNumber(scryfallCard),
        () => this.findByFuzzyName(scryfallCard),
      ];

      for (const strategy of strategies) {
        const result = strategy();
        if (result) {
          return result;
        }
      }
    }

    // Fallback to optimized storage search
    try {
      const { allPrintingsStorage } = await import('@/lib/utils/allPrintingsStorage');
      
      // Strategy 1: Direct Scryfall ID search
      if (scryfallCard.scryfallId) {
        const card = await allPrintingsStorage.findCardByScryfallId(scryfallCard.scryfallId);
        if (card) {
          return {
            scryfallId: scryfallCard.id,
            mtgjsonUuid: card.uuid,
            confidence: 1.0,
            matchMethod: 'direct',
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      // Strategy 2: Search by name and try to match with set
      const searchResults = await allPrintingsStorage.searchCards(scryfallCard.name, 20);
      
      for (const card of searchResults) {
        // Exact name and set match
        if (this.normalizeCardName(card.name) === this.normalizeCardName(scryfallCard.name) &&
            card.setCode.toLowerCase() === scryfallCard.setCode.toLowerCase()) {
          return {
            scryfallId: scryfallCard.id,
            mtgjsonUuid: card.uuid,
            confidence: 0.95,
            matchMethod: 'name_set',
            lastUpdated: new Date().toISOString(),
          };
        }

        // Collector number match within same set
        if (card.setCode.toLowerCase() === scryfallCard.setCode.toLowerCase() &&
            card.number.toLowerCase() === (scryfallCard.number || '').toLowerCase()) {
          const nameSimilarity = this.calculateNameSimilarity(scryfallCard.name, card.name);
          if (nameSimilarity > 0.8) {
            return {
              scryfallId: scryfallCard.id,
              mtgjsonUuid: card.uuid,
              confidence: 0.9,
              matchMethod: 'collector_number',
              lastUpdated: new Date().toISOString(),
            };
          }
        }

        // Fuzzy name match
        const similarity = this.calculateNameSimilarity(scryfallCard.name, card.name);
        if (similarity > 0.9) {
          return {
            scryfallId: scryfallCard.id,
            mtgjsonUuid: card.uuid,
            confidence: similarity * 0.8,
            matchMethod: 'name_fuzzy',
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      console.error('Error searching optimized storage:', error);
    }

    console.warn(`No mapping found for card: ${scryfallCard.name} (${scryfallCard.setCode})`);
    return null;
  }

  /**
   * Strategy 1: Direct Scryfall ID match (most reliable)
   */
  private findByDirectScryfallId(scryfallCard: MTGCard): CardMapping | null {
    if (!scryfallCard.scryfallId) return null;

    for (const set of Object.values(this.allPrintingsData!.data)) {
      for (const card of set.cards) {
        if (card.identifiers?.scryfallId === scryfallCard.scryfallId) {
          return {
            scryfallId: scryfallCard.id,
            mtgjsonUuid: card.uuid,
            confidence: 1.0,
            matchMethod: 'direct',
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    }

    return null;
  }

  /**
   * Strategy 2: Match by exact name and set code
   */
  private findByNameAndSet(scryfallCard: MTGCard): CardMapping | null {
    const normalizedName = this.normalizeCardName(scryfallCard.name);
    const setCode = scryfallCard.setCode.toLowerCase();

    for (const set of Object.values(this.allPrintingsData!.data)) {
      if (set.code.toLowerCase() !== setCode) continue;

      for (const card of set.cards) {
        const cardNormalizedName = this.normalizeCardName(card.name);
        
        if (cardNormalizedName === normalizedName) {
          return {
            scryfallId: scryfallCard.id,
            mtgjsonUuid: card.uuid,
            confidence: 0.95,
            matchMethod: 'name_set',
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    }

    return null;
  }

  /**
   * Strategy 3: Match by collector number and set
   */
  private findByCollectorNumber(scryfallCard: MTGCard): CardMapping | null {
    if (!scryfallCard.number) return null;

    const setCode = scryfallCard.setCode.toLowerCase();
    const collectorNumber = scryfallCard.number.toLowerCase();

    for (const set of Object.values(this.allPrintingsData!.data)) {
      if (set.code.toLowerCase() !== setCode) continue;

      for (const card of set.cards) {
        if (card.number.toLowerCase() === collectorNumber) {
          // Also check if names are similar to avoid false positives
          const nameSimilarity = this.calculateNameSimilarity(scryfallCard.name, card.name);
          
          if (nameSimilarity > 0.8) {
            return {
              scryfallId: scryfallCard.id,
              mtgjsonUuid: card.uuid,
              confidence: 0.9,
              matchMethod: 'collector_number',
              lastUpdated: new Date().toISOString(),
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Strategy 4: Fuzzy name matching (least reliable)
   */
  private findByFuzzyName(scryfallCard: MTGCard): CardMapping | null {
    const normalizedName = this.normalizeCardName(scryfallCard.name);
    let bestMatch: { card: MTGJSONCardData; similarity: number } | null = null;

    for (const set of Object.values(this.allPrintingsData!.data)) {
      for (const card of set.cards) {
        const cardNormalizedName = this.normalizeCardName(card.name);
        const similarity = this.calculateNameSimilarity(normalizedName, cardNormalizedName);
        
        if (similarity > 0.9 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { card, similarity };
        }
      }
    }

    if (bestMatch && bestMatch.similarity > 0.9) {
      return {
        scryfallId: scryfallCard.id,
        mtgjsonUuid: bestMatch.card.uuid,
        confidence: bestMatch.similarity * 0.8, // Reduce confidence for fuzzy matches
        matchMethod: 'name_fuzzy',
        lastUpdated: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Normalize card names for comparison
   */
  private normalizeCardName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateNameSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Cache AllPrintings data
   */
  private async cacheAllPrintings(data: MTGJSONAllPrintings): Promise<void> {
    try {
      // Store in IndexedDB via storageManager
      await storageManager.setMetadata({
        lastPriceUpdate: data.meta.date,
        totalCards: this.countTotalCards(data),
        cacheVersion: data.meta.version,
      });

      // For now, we'll store a subset of the data to avoid storage issues
      // In production, you might want to use a more sophisticated storage strategy
      console.log('AllPrintings data cached successfully');
    } catch (error) {
      console.error('Failed to cache AllPrintings data:', error);
    }
  }

  /**
   * Get cached AllPrintings data
   */
  private async getCachedAllPrintings(): Promise<MTGJSONAllPrintings | null> {
    try {
      // This is a placeholder - in reality, you'd need to implement
      // efficient storage and retrieval of the large AllPrintings dataset
      return null;
    } catch (error) {
      console.error('Failed to get cached AllPrintings:', error);
      return null;
    }
  }

  /**
   * Load mapping cache from storage
   */
  private async loadMappingCache(): Promise<void> {
    try {
      // Load existing mappings from localStorage or IndexedDB
      const cached = localStorage.getItem(this.MAPPING_CACHE_KEY);
      if (cached) {
        const mappings: CardMapping[] = JSON.parse(cached);
        for (const mapping of mappings) {
          this.mappingCache.set(mapping.scryfallId, mapping);
        }
        console.log(`Loaded ${mappings.length} cached mappings`);
      }
    } catch (error) {
      console.error('Failed to load mapping cache:', error);
    }
  }

  /**
   * Save a single mapping to cache
   */
  private async saveMappingToCache(mapping: CardMapping): Promise<void> {
    try {
      // Save to localStorage (for now)
      const existingMappings = this.getAllCachedMappings();
      const updatedMappings = existingMappings.filter(m => m.scryfallId !== mapping.scryfallId);
      updatedMappings.push(mapping);
      
      localStorage.setItem(this.MAPPING_CACHE_KEY, JSON.stringify(updatedMappings));
    } catch (error) {
      console.error('Failed to save mapping to cache:', error);
    }
  }

  /**
   * Get all cached mappings
   */
  private getAllCachedMappings(): CardMapping[] {
    try {
      const cached = localStorage.getItem(this.MAPPING_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Failed to get cached mappings:', error);
      return [];
    }
  }

  /**
   * Check if data is fresh (within 7 days)
   */
  private isDataFresh(dateString: string): boolean {
    const dataDate = new Date(dateString);
    const now = new Date();
    const daysDiff = (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  }

  /**
   * Count total cards in AllPrintings data
   */
  private countTotalCards(data: MTGJSONAllPrintings): number {
    return Object.values(data.data).reduce((total, set) => total + set.cards.length, 0);
  }

  /**
   * Get mapping statistics
   */
  async getMappingStats(): Promise<MappingStats> {
    const cachedMappings = this.getAllCachedMappings();
    
    return {
      totalMappings: cachedMappings.length,
      directMatches: cachedMappings.filter(m => m.matchMethod === 'direct').length,
      fuzzyMatches: cachedMappings.filter(m => m.matchMethod === 'name_fuzzy').length,
      unmappedCards: 0, // Would need to track this separately
      lastUpdate: cachedMappings.length > 0 
        ? Math.max(...cachedMappings.map(m => new Date(m.lastUpdated).getTime())).toString()
        : new Date().toISOString(),
    };
  }

  /**
   * Clear all cached mappings
   */
  async clearMappingCache(): Promise<void> {
    this.mappingCache.clear();
    localStorage.removeItem(this.MAPPING_CACHE_KEY);
    console.log('Mapping cache cleared');
  }

  /**
   * Batch process multiple cards for mapping
   */
  async batchGetMappings(scryfallCards: MTGCard[]): Promise<Map<string, string>> {
    await this.initialize();
    
    const results = new Map<string, string>();
    
    for (const card of scryfallCards) {
      try {
        const uuid = await this.getMapping(card);
        if (uuid) {
          results.set(card.id, uuid);
        }
      } catch (error) {
        console.error(`Failed to map card ${card.name}:`, error);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const cardMappingService = new CardMappingService();

// Export types for external use
export type { CardMapping, MappingStats };
