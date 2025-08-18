import { MTGJSONCardPrices, MTGJSONCard, PriceHistory } from '@/lib/types';

// IndexedDB configuration for MTGJSON data
const DB_NAME = 'MTGJSONCache';
const DB_VERSION = 1;
const STORES = {
  PRICE_HISTORY: 'priceHistory',
  CARD_MAPPINGS: 'cardMappings',
  METADATA: 'metadata',
} as const;

// Cache expiry times
const CACHE_EXPIRY = {
  PRICE_HISTORY: 24 * 60 * 60 * 1000, // 24 hours
  CARD_MAPPINGS: 7 * 24 * 60 * 60 * 1000, // 7 days
  METADATA: 60 * 60 * 1000, // 1 hour
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheMetadata {
  lastPriceUpdate: string;
  totalCards: number;
  cacheVersion: string;
}

class MTGJSONCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available in server environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create price history store
        if (!db.objectStoreNames.contains(STORES.PRICE_HISTORY)) {
          const priceStore = db.createObjectStore(STORES.PRICE_HISTORY, { keyPath: 'uuid' });
          priceStore.createIndex('cardId', 'cardId', { unique: false });
          priceStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Create card mappings store
        if (!db.objectStoreNames.contains(STORES.CARD_MAPPINGS)) {
          const mappingStore = db.createObjectStore(STORES.CARD_MAPPINGS, { keyPath: 'scryfallId' });
          mappingStore.createIndex('uuid', 'uuid', { unique: false });
          mappingStore.createIndex('name', 'name', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // Price History Cache Methods
  async getPriceHistory(uuid: string): Promise<PriceHistory | null> {
    try {
      const store = await this.getStore(STORES.PRICE_HISTORY);
      const request = store.get(uuid);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as CacheEntry<PriceHistory> | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache entry is expired
          if (Date.now() > result.expiresAt) {
            // Remove expired entry
            this.removePriceHistory(uuid);
            resolve(null);
            return;
          }

          resolve(result.data);
        };

        request.onerror = () => {
          reject(new Error('Failed to get price history from cache'));
        };
      });
    } catch (error) {
      console.error('Error getting price history from cache:', error);
      return null;
    }
  }

  async setPriceHistory(uuid: string, priceHistory: PriceHistory): Promise<void> {
    try {
      const store = await this.getStore(STORES.PRICE_HISTORY, 'readwrite');
      
      const cacheEntry: CacheEntry<PriceHistory> = {
        data: priceHistory,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY.PRICE_HISTORY,
      };

      const request = store.put({ uuid, ...cacheEntry });

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to cache price history'));
      });
    } catch (error) {
      console.error('Error caching price history:', error);
      throw error;
    }
  }

  async removePriceHistory(uuid: string): Promise<void> {
    try {
      const store = await this.getStore(STORES.PRICE_HISTORY, 'readwrite');
      const request = store.delete(uuid);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to remove price history'));
      });
    } catch (error) {
      console.error('Error removing price history:', error);
    }
  }

  // Card Mapping Cache Methods
  async getCardMapping(scryfallId: string): Promise<MTGJSONCard | null> {
    try {
      const store = await this.getStore(STORES.CARD_MAPPINGS);
      const request = store.get(scryfallId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as CacheEntry<MTGJSONCard> | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache entry is expired
          if (Date.now() > result.expiresAt) {
            this.removeCardMapping(scryfallId);
            resolve(null);
            return;
          }

          resolve(result.data);
        };

        request.onerror = () => {
          reject(new Error('Failed to get card mapping from cache'));
        };
      });
    } catch (error) {
      console.error('Error getting card mapping from cache:', error);
      return null;
    }
  }

  async setCardMapping(scryfallId: string, mtgjsonCard: MTGJSONCard): Promise<void> {
    try {
      const store = await this.getStore(STORES.CARD_MAPPINGS, 'readwrite');
      
      const cacheEntry: CacheEntry<MTGJSONCard> = {
        data: mtgjsonCard,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY.CARD_MAPPINGS,
      };

      const request = store.put({ scryfallId, ...cacheEntry });

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to cache card mapping'));
      });
    } catch (error) {
      console.error('Error caching card mapping:', error);
      throw error;
    }
  }

  async removeCardMapping(scryfallId: string): Promise<void> {
    try {
      const store = await this.getStore(STORES.CARD_MAPPINGS, 'readwrite');
      const request = store.delete(scryfallId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to remove card mapping'));
      });
    } catch (error) {
      console.error('Error removing card mapping:', error);
    }
  }

  // Metadata Methods
  async getMetadata(): Promise<CacheMetadata | null> {
    try {
      const store = await this.getStore(STORES.METADATA);
      const request = store.get('metadata');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as CacheEntry<CacheMetadata> | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check if metadata is expired
          if (Date.now() > result.expiresAt) {
            this.setMetadata({
              lastPriceUpdate: '',
              totalCards: 0,
              cacheVersion: '1.0',
            });
            resolve(null);
            return;
          }

          resolve(result.data);
        };

        request.onerror = () => {
          reject(new Error('Failed to get metadata from cache'));
        };
      });
    } catch (error) {
      console.error('Error getting metadata from cache:', error);
      return null;
    }
  }

  async setMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      const store = await this.getStore(STORES.METADATA, 'readwrite');
      
      const cacheEntry: CacheEntry<CacheMetadata> = {
        data: metadata,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY.METADATA,
      };

      const request = store.put({ key: 'metadata', ...cacheEntry });

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to cache metadata'));
      });
    } catch (error) {
      console.error('Error caching metadata:', error);
      throw error;
    }
  }

  // Bulk Operations
  async batchSetPriceHistories(priceHistories: Array<{ uuid: string; data: PriceHistory }>): Promise<void> {
    try {
      const store = await this.getStore(STORES.PRICE_HISTORY, 'readwrite');
      const transaction = store.transaction;

      const promises = priceHistories.map(({ uuid, data }) => {
        const cacheEntry: CacheEntry<PriceHistory> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_EXPIRY.PRICE_HISTORY,
        };

        const request = store.put({ uuid, ...cacheEntry });

        return new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to cache price history for ${uuid}`));
        });
      });

      await Promise.all(promises);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Batch price history caching failed'));
      });
    } catch (error) {
      console.error('Error batch caching price histories:', error);
      throw error;
    }
  }

  // Cache Management
  async clearExpiredEntries(): Promise<void> {
    try {
      const now = Date.now();
      const stores = [STORES.PRICE_HISTORY, STORES.CARD_MAPPINGS, STORES.METADATA];

      for (const storeName of stores) {
        const store = await this.getStore(storeName, 'readwrite');
        const request = store.openCursor();

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              const entry = cursor.value as CacheEntry<any>;
              if (now > entry.expiresAt) {
                cursor.delete();
              }
              cursor.continue();
            } else {
              resolve();
            }
          };

          request.onerror = () => {
            reject(new Error(`Failed to clear expired entries from ${storeName}`));
          };
        });
      }
    } catch (error) {
      console.error('Error clearing expired cache entries:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const stores = [STORES.PRICE_HISTORY, STORES.CARD_MAPPINGS, STORES.METADATA];

      for (const storeName of stores) {
        const store = await this.getStore(storeName, 'readwrite');
        const request = store.clear();

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async getCacheStats(): Promise<{
    priceHistoryCount: number;
    cardMappingCount: number;
    totalSize: number;
    lastCleanup: Date | null;
  }> {
    try {
      const [priceCount, mappingCount] = await Promise.all([
        this.getStoreCount(STORES.PRICE_HISTORY),
        this.getStoreCount(STORES.CARD_MAPPINGS),
      ]);

      return {
        priceHistoryCount: priceCount,
        cardMappingCount: mappingCount,
        totalSize: 0, // IndexedDB doesn't provide easy size calculation
        lastCleanup: null, // Would need to track this separately
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        priceHistoryCount: 0,
        cardMappingCount: 0,
        totalSize: 0,
        lastCleanup: null,
      };
    }
  }

  private async getStoreCount(storeName: string): Promise<number> {
    const store = await this.getStore(storeName);
    const request = store.count();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get count for ${storeName}`));
    });
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const mtgjsonCache = new MTGJSONCache();

// Initialize cache on import (client-side only)
if (typeof window !== 'undefined') {
  mtgjsonCache.init().catch(console.error);
  
  // Clean up expired entries on page load
  setTimeout(() => {
    mtgjsonCache.clearExpiredEntries().catch(console.error);
  }, 5000);
}

export default mtgjsonCache;
