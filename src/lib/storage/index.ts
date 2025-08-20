/**
 * Unified Storage Manager for MTG Investment Tracker
 * 
 * This module consolidates all storage operations including:
 * - LocalStorage operations (portfolios, watchlist, settings)
 * - IndexedDB cache operations (MTGJSON data, price history)
 * - Storage cleanup and quota management
 * - Data import/export functionality
 */

import { Portfolio, UserPreferences, MTGJSONCardPrices, MTGJSONCard, PriceHistory } from '@/lib/types/all';

// ============================================================================
// STORAGE KEYS AND CONFIGURATION
// ============================================================================

const STORAGE_KEYS = {
  PORTFOLIOS: 'mtg-portfolios',
  WATCHLIST: 'mtg-watchlist',
  SETTINGS: 'mtg-settings',
} as const;

const DEFAULT_SETTINGS: UserPreferences = {
  defaultCurrency: 'usd',
  showFoilPrices: false,
  defaultCondition: 'near_mint',
  defaultBuyPricePercentage: 90, // Default to 90% of market price
  priceAlerts: [],
  dashboardLayout: ['portfolio-overview', 'top-performers', 'price-alerts', 'market-trends'],
  theme: 'dark',
};

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

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

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

interface StorageStats {
  portfolios: {
    count: number;
    totalCards: number;
  };
  watchlist: {
    count: number;
  };
  settings: {
    configured: number;
  };
  storage: {
    used: number;
  };
  used: number;
  total: number;
  percentage: number;
}

interface CleanupResult {
  clearedItems: number;
  freedBytes: number;
  remainingKeys: string[];
}

interface LocalStorageUsage {
  totalKeys: number;
  estimatedSize: number;
  largestKeys: Array<{ key: string; size: number }>;
  quotaExceeded: boolean;
}

// ============================================================================
// UNIFIED STORAGE MANAGER CLASS
// ============================================================================

class UnifiedStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // ========================================================================
  // INITIALIZATION AND UTILITY METHODS
  // ========================================================================

  /**
   * Initialize IndexedDB for MTGJSON data
   */
  async initIndexedDB(): Promise<void> {
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

  /**
   * SSR-safe localStorage check
   */
  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window;
    } catch {
      return false;
    }
  }

  /**
   * Generic localStorage operations with error handling
   */
  private getFromStorage<T>(key: string, defaultValue: T): T {
    if (!this.isLocalStorageAvailable()) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  }

  private saveToStorage<T>(key: string, value: T): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
      return false;
    }
  }

  private removeFromStorage(key: string): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error);
      return false;
    }
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.initIndexedDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // ========================================================================
  // PORTFOLIO MANAGEMENT
  // ========================================================================

  getPortfolios(): Portfolio[] {
    return this.getFromStorage(STORAGE_KEYS.PORTFOLIOS, []);
  }

  savePortfolio(portfolio: Portfolio): boolean {
    const portfolios = this.getPortfolios();
    const existingIndex = portfolios.findIndex(p => p.id === portfolio.id);
    
    const updatedPortfolio = {
      ...portfolio,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      portfolios[existingIndex] = updatedPortfolio;
    } else {
      portfolios.push(updatedPortfolio);
    }

    return this.saveToStorage(STORAGE_KEYS.PORTFOLIOS, portfolios);
  }

  updatePortfolio(portfolio: Portfolio): void {
    const portfolios = this.getPortfolios();
    const existingIndex = portfolios.findIndex(p => p.id === portfolio.id);
    
    if (existingIndex >= 0) {
      const updatedPortfolio = {
        ...portfolio,
        updatedAt: new Date().toISOString()
      };
      portfolios[existingIndex] = updatedPortfolio;
      this.saveToStorage(STORAGE_KEYS.PORTFOLIOS, portfolios);
    } else {
      console.warn(`Portfolio with ID ${portfolio.id} not found for update`);
    }
  }

  deletePortfolio(portfolioId: string): boolean {
    const portfolios = this.getPortfolios();
    const filteredPortfolios = portfolios.filter(p => p.id !== portfolioId);
    return this.saveToStorage(STORAGE_KEYS.PORTFOLIOS, filteredPortfolios);
  }

  getPortfolioById(portfolioId: string): Portfolio | null {
    const portfolios = this.getPortfolios();
    return portfolios.find(p => p.id === portfolioId) || null;
  }

  // Enhanced Portfolio Operations with Timeline Tracking
  addCardToPortfolioWithTracking(
    portfolioId: string, 
    card: import('@/lib/types').PortfolioCard
  ): void {
    const portfolio = this.getPortfolioById(portfolioId);
    if (!portfolio) return;

    const existingCardIndex = portfolio.cards.findIndex(
      c => c.cardId === card.cardId && c.foil === card.foil && c.condition === card.condition
    );

    let previousQuantity = 0;
    let updatedCards: import('@/lib/types').PortfolioCard[];
    
    if (existingCardIndex >= 0) {
      previousQuantity = portfolio.cards[existingCardIndex].quantity;
      updatedCards = portfolio.cards.map((c, index) =>
        index === existingCardIndex
          ? { ...c, quantity: c.quantity + card.quantity }
          : c
      );
    } else {
      updatedCards = [...portfolio.cards, card];
    }

    // Record transaction
    const PortfolioTimelineService = require('@/lib/services/portfolioTimelineService').PortfolioTimelineService;
    PortfolioTimelineService.recordTransaction(
      portfolioId,
      'add',
      card.cardId,
      card.quantity,
      card.purchasePrice,
      previousQuantity,
      `Added ${card.quantity} ${card.card.name}${card.foil ? ' (Foil)' : ''}`
    );

    // Update portfolio
    const updatedPortfolio = this.recalculatePortfolioTotals({
      ...portfolio,
      cards: updatedCards
    });
    
    this.savePortfolio(updatedPortfolio);
  }

  removeCardFromPortfolioWithTracking(
    portfolioId: string, 
    cardId: string, 
    foil: boolean, 
    condition: string,
    quantityToRemove?: number
  ): void {
    const portfolio = this.getPortfolioById(portfolioId);
    if (!portfolio) return;

    const cardIndex = portfolio.cards.findIndex(
      c => c.cardId === cardId && c.foil === foil && c.condition === condition
    );

    if (cardIndex === -1) return;

    const existingCard = portfolio.cards[cardIndex];
    const previousQuantity = existingCard.quantity;
    const removeQuantity = quantityToRemove || previousQuantity;

    let updatedCards: import('@/lib/types').PortfolioCard[];
    
    if (removeQuantity >= previousQuantity) {
      updatedCards = portfolio.cards.filter((_, index) => index !== cardIndex);
    } else {
      updatedCards = portfolio.cards.map((c, index) =>
        index === cardIndex
          ? { ...c, quantity: c.quantity - removeQuantity }
          : c
      );
    }

    // Record transaction
    const PortfolioTimelineService = require('@/lib/services/portfolioTimelineService').PortfolioTimelineService;
    PortfolioTimelineService.recordTransaction(
      portfolioId,
      'remove',
      cardId,
      -removeQuantity,
      existingCard.purchasePrice,
      previousQuantity,
      `Removed ${removeQuantity} ${existingCard.card.name}${foil ? ' (Foil)' : ''}`
    );

    // Update portfolio
    const updatedPortfolio = this.recalculatePortfolioTotals({
      ...portfolio,
      cards: updatedCards
    });
    
    this.savePortfolio(updatedPortfolio);
  }

  private recalculatePortfolioTotals(portfolio: import('@/lib/types').Portfolio): import('@/lib/types').Portfolio {
    const totalValue = portfolio.cards.reduce((sum, c) => {
      const currentPrice = c.card.prices.usd || 0;
      return sum + (currentPrice * c.quantity);
    }, 0);

    const totalCost = portfolio.cards.reduce((sum, c) => {
      return sum + (c.purchasePrice * c.quantity);
    }, 0);

    const performance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      ...portfolio,
      totalValue,
      totalCost,
      performance,
      updatedAt: new Date().toISOString(),
    };
  }

  // ========================================================================
  // WATCHLIST MANAGEMENT
  // ========================================================================

  getWatchlist(): string[] {
    return this.getFromStorage(STORAGE_KEYS.WATCHLIST, []);
  }

  addToWatchlist(cardId: string): boolean {
    const watchlist = this.getWatchlist();
    if (!watchlist.includes(cardId)) {
      watchlist.push(cardId);
      return this.saveToStorage(STORAGE_KEYS.WATCHLIST, watchlist);
    }
    return true; // Already in watchlist
  }

  removeFromWatchlist(cardId: string): boolean {
    const watchlist = this.getWatchlist();
    const filteredWatchlist = watchlist.filter(id => id !== cardId);
    return this.saveToStorage(STORAGE_KEYS.WATCHLIST, filteredWatchlist);
  }

  isInWatchlist(cardId: string): boolean {
    const watchlist = this.getWatchlist();
    return watchlist.includes(cardId);
  }

  // ========================================================================
  // SETTINGS/PREFERENCES MANAGEMENT
  // ========================================================================

  getSettings(): UserPreferences {
    return this.getFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  updateSettings(settings: Partial<UserPreferences>): boolean {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    return this.saveToStorage(STORAGE_KEYS.SETTINGS, updatedSettings);
  }

  resetSettings(): boolean {
    return this.saveToStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  // Aliases for compatibility
  getPreferences(): UserPreferences {
    return this.getSettings();
  }

  savePreferences(preferences: Partial<UserPreferences>): boolean {
    return this.updateSettings(preferences);
  }

  // ========================================================================
  // CACHE MANAGEMENT (INDEXEDDB)
  // ========================================================================

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

  // ========================================================================
  // STORAGE CLEANUP AND MANAGEMENT
  // ========================================================================

  /**
   * Clean up localStorage data that might be causing quota issues
   */
  cleanupLocalStorage(): CleanupResult {
    const clearedItems: string[] = [];
    let freedBytes = 0;
    
    try {
      // Get all keys before starting cleanup
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }
      
      // Clean up MTGJSON-related chunks that might be taking up space
      const chunkKeys = allKeys.filter(key => key.startsWith('chunk-'));
      chunkKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            freedBytes += value.length * 2; // Rough estimate (UTF-16)
            localStorage.removeItem(key);
            clearedItems.push(key);
          }
        } catch (error) {
          console.error(`Failed to remove ${key}:`, error);
        }
      });
      
      // Clean up other large data that might be problematic
      const largeDataKeys = [
        'allprintings-metadata',
        'mtgjson-all-prices-data',
        'mtgjson-allprintings-cache'
      ];
      
      largeDataKeys.forEach(key => {
        if (allKeys.includes(key)) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              freedBytes += value.length * 2;
              localStorage.removeItem(key);
              clearedItems.push(key);
            }
          } catch (error) {
            console.error(`Failed to remove ${key}:`, error);
          }
        }
      });
      
      // Get remaining keys
      const remainingKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) remainingKeys.push(key);
      }
      
      return {
        clearedItems: clearedItems.length,
        freedBytes,
        remainingKeys
      };
    } catch (error) {
      console.error('Error during localStorage cleanup:', error);
      return {
        clearedItems: clearedItems.length,
        freedBytes,
        remainingKeys: []
      };
    }
  }

  /**
   * Get localStorage usage information
   */
  getLocalStorageUsage(): LocalStorageUsage {
    const keyInfo: Array<{ key: string; size: number }> = [];
    let totalSize = 0;
    let quotaExceeded = false;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          const size = value.length * 2; // Rough UTF-16 estimate
          keyInfo.push({ key, size });
          totalSize += size;
        }
      }
      
      // Test if we can write to localStorage
      try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
      } catch (error) {
        quotaExceeded = true;
      }
      
      // Sort by size descending
      keyInfo.sort((a, b) => b.size - a.size);
      
      return {
        totalKeys: keyInfo.length,
        estimatedSize: totalSize,
        largestKeys: keyInfo.slice(0, 10), // Top 10 largest
        quotaExceeded
      };
    } catch (error) {
      console.error('Error getting localStorage usage:', error);
      return {
        totalKeys: 0,
        estimatedSize: 0,
        largestKeys: [],
        quotaExceeded: true
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Emergency cleanup - removes all MTGJSON related data
   */
  emergencyCleanup(): void {
    try {
      const keysToRemove: string[] = [];
      
      // Collect all keys that might be MTGJSON related
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('chunk-') ||
          key.startsWith('mtgjson-') ||
          key.includes('allprintings') ||
          key.includes('card-mappings')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all identified keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Failed to remove ${key}:`, error);
        }
      });
      
      // Also try to clear IndexedDB
      try {
        const deleteReq = indexedDB.deleteDatabase('MTGJSONStorage');
        deleteReq.onsuccess = () => {}; // IndexedDB cleared
        deleteReq.onerror = () => console.error('Failed to clear IndexedDB');
      } catch (error) {
        console.error('Error clearing IndexedDB:', error);
      }
      
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  }

  /**
   * Check if localStorage quota is likely exceeded
   */
  isQuotaExceeded(): boolean {
    try {
      const testKey = '__quota_test__';
      const testValue = 'x'.repeat(1024); // 1KB test
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      return false;
    } catch (error) {
      return true;
    }
  }

  // ========================================================================
  // BULK OPERATIONS AND UTILITIES
  // ========================================================================

  /**
   * Clear all application data
   */
  clearAllData(): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Export all application data
   */
  exportData(): string | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const data = {
        portfolios: this.getPortfolios(),
        watchlist: this.getWatchlist(),
        settings: this.getSettings(),
        exportDate: new Date().toISOString(),
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  /**
   * Import application data
   */
  importData(jsonData: string): { success: boolean; message?: string } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid data structure' };
      }
      
      if (data.portfolios && Array.isArray(data.portfolios)) {
        this.saveToStorage(STORAGE_KEYS.PORTFOLIOS, data.portfolios);
      }
      
      if (data.watchlist && Array.isArray(data.watchlist)) {
        this.saveToStorage(STORAGE_KEYS.WATCHLIST, data.watchlist);
      }
      
      if (data.settings && typeof data.settings === 'object') {
        this.saveToStorage(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...data.settings });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, message: `Invalid JSON: ${error}` };
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): StorageStats | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    const portfolios = this.getPortfolios();
    const watchlist = this.getWatchlist();
    const settings = this.getSettings();

    const used = new Blob([JSON.stringify({
      [STORAGE_KEYS.PORTFOLIOS]: portfolios,
      [STORAGE_KEYS.WATCHLIST]: watchlist,
      [STORAGE_KEYS.SETTINGS]: settings,
    })]).size;

    const total = 5 * 1024 * 1024; // 5MB estimate
    const percentage = (used / total) * 100;

    return {
      portfolios: {
        count: portfolios.length,
        totalCards: portfolios.reduce((sum, p) => sum + p.cards.length, 0),
      },
      watchlist: {
        count: watchlist.length,
      },
      settings: {
        configured: Object.keys(settings).length,
      },
      storage: {
        used,
      },
      used,
      total,
      percentage,
    };
  }

  // Alias for compatibility
  getStorageUsage() {
    return this.getStorageStats();
  }

  // ========================================================================
  // CACHE MANAGEMENT UTILITIES
  // ========================================================================

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

  /**
   * Close IndexedDB connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const storageManager = new UnifiedStorageManager();

// Initialize IndexedDB on import (client-side only)
if (typeof window !== 'undefined') {
  storageManager.initIndexedDB().catch(console.error);
  
  // Clean up expired entries on page load
  setTimeout(() => {
    storageManager.clearExpiredEntries().catch(console.error);
  }, 5000);
}

// Export individual functions for compatibility with existing code
// Portfolio functions
export const getPortfolios = () => storageManager.getPortfolios();
export const savePortfolio = (portfolio: Portfolio) => storageManager.savePortfolio(portfolio);
export const updatePortfolio = (portfolio: Portfolio) => storageManager.updatePortfolio(portfolio);
export const deletePortfolio = (portfolioId: string) => storageManager.deletePortfolio(portfolioId);
export const getPortfolioById = (portfolioId: string) => storageManager.getPortfolioById(portfolioId);
export const addCardToPortfolioWithTracking = (portfolioId: string, card: import('@/lib/types').PortfolioCard) => storageManager.addCardToPortfolioWithTracking(portfolioId, card);
export const removeCardFromPortfolioWithTracking = (portfolioId: string, cardId: string, foil: boolean, condition: string, quantityToRemove?: number) => storageManager.removeCardFromPortfolioWithTracking(portfolioId, cardId, foil, condition, quantityToRemove);

// Watchlist functions
export const getWatchlist = () => storageManager.getWatchlist();
export const addToWatchlist = (cardId: string) => storageManager.addToWatchlist(cardId);
export const removeFromWatchlist = (cardId: string) => storageManager.removeFromWatchlist(cardId);
export const isInWatchlist = (cardId: string) => storageManager.isInWatchlist(cardId);

// Settings functions
export const getSettings = () => storageManager.getSettings();
export const updateSettings = (settings: Partial<UserPreferences>) => storageManager.updateSettings(settings);
export const resetSettings = () => storageManager.resetSettings();
export const getPreferences = () => storageManager.getPreferences();
export const savePreferences = (preferences: Partial<UserPreferences>) => storageManager.savePreferences(preferences);

// Storage management
export const clearAllData = () => storageManager.clearAllData();
export const exportData = () => storageManager.exportData();
export const importData = (jsonData: string) => storageManager.importData(jsonData);
export const getStorageStats = () => storageManager.getStorageStats();
export const getStorageUsage = () => storageManager.getStorageUsage();

// Cache functions
export const getPriceHistory = (uuid: string) => storageManager.getPriceHistory(uuid);
export const setPriceHistory = (uuid: string, priceHistory: PriceHistory) => storageManager.setPriceHistory(uuid, priceHistory);
export const removePriceHistory = (uuid: string) => storageManager.removePriceHistory(uuid);
export const getCardMapping = (scryfallId: string) => storageManager.getCardMapping(scryfallId);
export const setCardMapping = (scryfallId: string, mtgjsonCard: MTGJSONCard) => storageManager.setCardMapping(scryfallId, mtgjsonCard);
export const removeCardMapping = (scryfallId: string) => storageManager.removeCardMapping(scryfallId);
export const getMetadata = () => storageManager.getMetadata();
export const setMetadata = (metadata: CacheMetadata) => storageManager.setMetadata(metadata);
export const clearExpiredEntries = () => storageManager.clearExpiredEntries();
export const clearAllCache = () => storageManager.clearAllCache();
export const getCacheStats = () => storageManager.getCacheStats();

// Cleanup functions
export const cleanupLocalStorage = () => storageManager.cleanupLocalStorage();
export const getLocalStorageUsage = () => storageManager.getLocalStorageUsage();
export const formatBytes = (bytes: number) => storageManager.formatBytes(bytes);
export const emergencyCleanup = () => storageManager.emergencyCleanup();
export const isQuotaExceeded = () => storageManager.isQuotaExceeded();

export default storageManager;
