import { Portfolio, UserPreferences } from '@/lib/types';

// LocalStorage keys
const STORAGE_KEYS = {
  PORTFOLIOS: 'mtg-portfolios',
  WATCHLIST: 'mtg-watchlist',
  SETTINGS: 'mtg-settings',
} as const;

// Default settings
const DEFAULT_SETTINGS: UserPreferences = {
  defaultCurrency: 'usd',
  showFoilPrices: false,
  defaultCondition: 'near_mint',
  priceAlerts: [],
  dashboardLayout: ['portfolio-overview', 'top-performers', 'price-alerts', 'market-trends'],
  theme: 'dark',
};

// SSR-safe localStorage check
function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'localStorage' in window;
  } catch {
    return false;
  }
}

// Generic localStorage operations with error handling
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) {
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

function saveToStorage<T>(key: string, value: T): boolean {
  if (!isLocalStorageAvailable()) {
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

function removeFromStorage(key: string): boolean {
  if (!isLocalStorageAvailable()) {
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

// Portfolio Management Functions
export function getPortfolios(): Portfolio[] {
  return getFromStorage(STORAGE_KEYS.PORTFOLIOS, []);
}

export function savePortfolio(portfolio: Portfolio): boolean {
  const portfolios = getPortfolios();
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

  return saveToStorage(STORAGE_KEYS.PORTFOLIOS, portfolios);
}

export function updatePortfolio(portfolio: Portfolio): void {
  const portfolios = getPortfolios();
  const existingIndex = portfolios.findIndex(p => p.id === portfolio.id);
  
  if (existingIndex >= 0) {
    // Update the updatedAt timestamp
    const updatedPortfolio = {
      ...portfolio,
      updatedAt: new Date().toISOString()
    };
    portfolios[existingIndex] = updatedPortfolio;
    saveToStorage(STORAGE_KEYS.PORTFOLIOS, portfolios);
  } else {
    console.warn(`Portfolio with ID ${portfolio.id} not found for update`);
  }
}

export function deletePortfolio(portfolioId: string): boolean {
  const portfolios = getPortfolios();
  const filteredPortfolios = portfolios.filter(p => p.id !== portfolioId);
  return saveToStorage(STORAGE_KEYS.PORTFOLIOS, filteredPortfolios);
}

export function getPortfolioById(portfolioId: string): Portfolio | null {
  const portfolios = getPortfolios();
  return portfolios.find(p => p.id === portfolioId) || null;
}

// Enhanced Portfolio Operations with Timeline Tracking
export function addCardToPortfolioWithTracking(
  portfolioId: string, 
  card: import('@/lib/types').PortfolioCard
): void {
  const portfolio = getPortfolioById(portfolioId);
  if (!portfolio) return;

  const existingCardIndex = portfolio.cards.findIndex(
    c => c.cardId === card.cardId && c.foil === card.foil && c.condition === card.condition
  );

  let previousQuantity = 0;
  let updatedCards: import('@/lib/types').PortfolioCard[];
  
  if (existingCardIndex >= 0) {
    // Update existing card quantity
    previousQuantity = portfolio.cards[existingCardIndex].quantity;
    updatedCards = portfolio.cards.map((c, index) =>
      index === existingCardIndex
        ? { ...c, quantity: c.quantity + card.quantity }
        : c
    );
  } else {
    // Add new card
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
  const updatedPortfolio = recalculatePortfolioTotals({
    ...portfolio,
    cards: updatedCards
  });
  
  savePortfolio(updatedPortfolio);
}

export function removeCardFromPortfolioWithTracking(
  portfolioId: string, 
  cardId: string, 
  foil: boolean, 
  condition: string,
  quantityToRemove?: number
): void {
  const portfolio = getPortfolioById(portfolioId);
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
    // Remove entire card entry
    updatedCards = portfolio.cards.filter((_, index) => index !== cardIndex);
  } else {
    // Reduce quantity
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
  const updatedPortfolio = recalculatePortfolioTotals({
    ...portfolio,
    cards: updatedCards
  });
  
  savePortfolio(updatedPortfolio);
}

// Helper function to recalculate portfolio totals
function recalculatePortfolioTotals(portfolio: import('@/lib/types').Portfolio): import('@/lib/types').Portfolio {
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

// Watchlist Management Functions
export function getWatchlist(): string[] {
  return getFromStorage(STORAGE_KEYS.WATCHLIST, []);
}

export function addToWatchlist(cardId: string): boolean {
  const watchlist = getWatchlist();
  if (!watchlist.includes(cardId)) {
    watchlist.push(cardId);
    return saveToStorage(STORAGE_KEYS.WATCHLIST, watchlist);
  }
  return true; // Already in watchlist
}

export function removeFromWatchlist(cardId: string): boolean {
  const watchlist = getWatchlist();
  const filteredWatchlist = watchlist.filter(id => id !== cardId);
  return saveToStorage(STORAGE_KEYS.WATCHLIST, filteredWatchlist);
}

export function isInWatchlist(cardId: string): boolean {
  const watchlist = getWatchlist();
  return watchlist.includes(cardId);
}

// Settings Management Functions
export function getSettings(): UserPreferences {
  return getFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function updateSettings(settings: Partial<UserPreferences>): boolean {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...settings };
  return saveToStorage(STORAGE_KEYS.SETTINGS, updatedSettings);
}

export function resetSettings(): boolean {
  return saveToStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

// Utility Functions
export function clearAllData(): boolean {
  if (!isLocalStorageAvailable()) {
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

export function exportData(): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const data = {
      portfolios: getPortfolios(),
      watchlist: getWatchlist(),
      settings: getSettings(),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
}

export function importData(jsonData: string): { success: boolean; message?: string } {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid data structure' };
    }
    
    if (data.portfolios && Array.isArray(data.portfolios)) {
      saveToStorage(STORAGE_KEYS.PORTFOLIOS, data.portfolios);
    }
    
    if (data.watchlist && Array.isArray(data.watchlist)) {
      saveToStorage(STORAGE_KEYS.WATCHLIST, data.watchlist);
    }
    
    if (data.settings && typeof data.settings === 'object') {
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...data.settings });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, message: `Invalid JSON: ${error}` };
  }
}

// Preferences aliases for compatibility
export function getPreferences(): UserPreferences {
  return getSettings();
}

export function savePreferences(preferences: Partial<UserPreferences>): boolean {
  return updateSettings(preferences);
}

// Storage usage alias for compatibility
export function getStorageUsage() {
  return getStorageStats();
}

// Development helper functions
export function getStorageStats() {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  const portfolios = getPortfolios();
  const watchlist = getWatchlist();
  const settings = getSettings();

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



