import { Portfolio, UserPreferences, PriceAlert } from '@/lib/types';

// Local storage keys
const STORAGE_KEYS = {
  PORTFOLIOS: 'mtg-portfolios',
  WATCHLIST: 'mtg-watchlist',
  PREFERENCES: 'mtg-preferences',
  PRICE_ALERTS: 'mtg-price-alerts',
  LAST_SYNC: 'mtg-last-sync',
} as const;

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCurrency: 'usd',
  showFoilPrices: false,
  defaultCondition: 'near_mint',
  priceAlerts: [],
  dashboardLayout: ['portfolio-overview', 'top-performers', 'price-alerts', 'market-trends'],
};

// Generic localStorage utility functions
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
  }
}

// Portfolio management
export function getPortfolios(): Portfolio[] {
  return getStorageItem(STORAGE_KEYS.PORTFOLIOS, []);
}

export function savePortfolio(portfolio: Portfolio): void {
  const portfolios = getPortfolios();
  const existingIndex = portfolios.findIndex(p => p.id === portfolio.id);
  
  if (existingIndex >= 0) {
    portfolios[existingIndex] = portfolio;
  } else {
    portfolios.push(portfolio);
  }
  
  setStorageItem(STORAGE_KEYS.PORTFOLIOS, portfolios);
  updateLastSync();
}

export function deletePortfolio(portfolioId: string): void {
  const portfolios = getPortfolios();
  const filteredPortfolios = portfolios.filter(p => p.id !== portfolioId);
  setStorageItem(STORAGE_KEYS.PORTFOLIOS, filteredPortfolios);
  updateLastSync();
}

export function getPortfolio(portfolioId: string): Portfolio | null {
  const portfolios = getPortfolios();
  return portfolios.find(p => p.id === portfolioId) || null;
}

// Watchlist management
export function getWatchlist(): string[] {
  return getStorageItem(STORAGE_KEYS.WATCHLIST, []);
}

export function addToWatchlist(cardId: string): void {
  const watchlist = getWatchlist();
  if (!watchlist.includes(cardId)) {
    watchlist.push(cardId);
    setStorageItem(STORAGE_KEYS.WATCHLIST, watchlist);
    updateLastSync();
  }
}

export function removeFromWatchlist(cardId: string): void {
  const watchlist = getWatchlist();
  const filteredWatchlist = watchlist.filter(id => id !== cardId);
  setStorageItem(STORAGE_KEYS.WATCHLIST, filteredWatchlist);
  updateLastSync();
}

export function isInWatchlist(cardId: string): boolean {
  const watchlist = getWatchlist();
  return watchlist.includes(cardId);
}

// User preferences
export function getPreferences(): UserPreferences {
  return getStorageItem(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
}

export function savePreferences(preferences: Partial<UserPreferences>): void {
  const currentPreferences = getPreferences();
  const updatedPreferences = { ...currentPreferences, ...preferences };
  setStorageItem(STORAGE_KEYS.PREFERENCES, updatedPreferences);
  updateLastSync();
}

// Price alerts
export function getPriceAlerts(): PriceAlert[] {
  return getStorageItem(STORAGE_KEYS.PRICE_ALERTS, []);
}

export function savePriceAlert(alert: PriceAlert): void {
  const alerts = getPriceAlerts();
  const existingIndex = alerts.findIndex(a => a.id === alert.id);
  
  if (existingIndex >= 0) {
    alerts[existingIndex] = alert;
  } else {
    alerts.push(alert);
  }
  
  setStorageItem(STORAGE_KEYS.PRICE_ALERTS, alerts);
  updateLastSync();
}

export function deletePriceAlert(alertId: string): void {
  const alerts = getPriceAlerts();
  const filteredAlerts = alerts.filter(a => a.id !== alertId);
  setStorageItem(STORAGE_KEYS.PRICE_ALERTS, filteredAlerts);
  updateLastSync();
}

// Sync management
export function getLastSync(): string {
  return getStorageItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

export function updateLastSync(): void {
  setStorageItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

// Data export/import
export function exportData(): string {
  const data = {
    portfolios: getPortfolios(),
    watchlist: getWatchlist(),
    preferences: getPreferences(),
    priceAlerts: getPriceAlerts(),
    lastSync: getLastSync(),
    exportedAt: new Date().toISOString(),
  };
  
  return JSON.stringify(data, null, 2);
}

export function importData(jsonData: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid data format' };
    }
    
    // Import each section if it exists
    if (data.portfolios && Array.isArray(data.portfolios)) {
      setStorageItem(STORAGE_KEYS.PORTFOLIOS, data.portfolios);
    }
    
    if (data.watchlist && Array.isArray(data.watchlist)) {
      setStorageItem(STORAGE_KEYS.WATCHLIST, data.watchlist);
    }
    
    if (data.preferences && typeof data.preferences === 'object') {
      setStorageItem(STORAGE_KEYS.PREFERENCES, { ...DEFAULT_PREFERENCES, ...data.preferences });
    }
    
    if (data.priceAlerts && Array.isArray(data.priceAlerts)) {
      setStorageItem(STORAGE_KEYS.PRICE_ALERTS, data.priceAlerts);
    }
    
    updateLastSync();
    
    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, message: 'Failed to parse import data' };
  }
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeStorageItem(key);
  });
}

// Calculate storage usage
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  if (typeof window === 'undefined') {
    return { used: 0, total: 0, percentage: 0 };
  }

  try {
    let used = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        used += item.length;
      }
    });

    // Estimate total localStorage capacity (usually 5-10MB)
    const total = 5 * 1024 * 1024; // 5MB
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, total: 0, percentage: 0 };
  }
}



