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
    setStorageItem(STORAGE_KEYS.PORTFOLIOS, portfolios);
    updateLastSync();
  } else {
    console.warn(`Portfolio with ID ${portfolio.id} not found for update`);
  }
}

export function deletePortfolio(portfolioId: string): void {
  const portfolios = getPortfolios();
  const filteredPortfolios = portfolios.filter(p => p.id !== portfolioId);
  return saveToStorage(STORAGE_KEYS.PORTFOLIOS, filteredPortfolios);
}

export function getPortfolioById(portfolioId: string): Portfolio | null {
  const portfolios = getPortfolios();
  return portfolios.find(p => p.id === portfolioId) || null;
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

export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.portfolios && Array.isArray(data.portfolios)) {
      saveToStorage(STORAGE_KEYS.PORTFOLIOS, data.portfolios);
    }
    
    if (data.watchlist && Array.isArray(data.watchlist)) {
      saveToStorage(STORAGE_KEYS.WATCHLIST, data.watchlist);
    }
    
    if (data.settings && typeof data.settings === 'object') {
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...data.settings });
    }
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

// Development helper functions
export function getStorageStats() {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  const portfolios = getPortfolios();
  const watchlist = getWatchlist();
  const settings = getSettings();

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
      used: new Blob([JSON.stringify({
        [STORAGE_KEYS.PORTFOLIOS]: portfolios,
        [STORAGE_KEYS.WATCHLIST]: watchlist,
        [STORAGE_KEYS.SETTINGS]: settings,
      })]).size,
    },
  };
}



