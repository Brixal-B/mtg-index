// Core MTG Card Types
export interface MTGCard {
  id: string;
  name: string;
  manaCost?: string;
  convertedManaCost: number;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  setCode: string;
  setName: string;
  number?: string;
  artist?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  text?: string;
  flavorText?: string;
  imageUrl?: string;
  colors: string[];
  colorIdentity: string[];
  legalities: Record<string, string>;
  prices: MTGCardPrices;
  scryfallId?: string;
  multiverseId?: number;
}

// Price tracking interfaces
export interface MTGCardPrices {
  usd?: number | null;
  usdFoil?: number | null;
  eur?: number | null;
  eurFoil?: number | null;
  tix?: number | null;
}

// MTGJSON Price Data Types
export interface MTGJSONPricePoint {
  date: string; // YYYY-MM-DD format
  price: number;
}

export interface MTGJSONCardPrices {
  paper?: {
    cardkingdom?: {
      normal?: MTGJSONPricePoint[];
      foil?: MTGJSONPricePoint[];
    };
    cardmarket?: {
      normal?: MTGJSONPricePoint[];
      foil?: MTGJSONPricePoint[];
    };
    tcgplayer?: {
      normal?: MTGJSONPricePoint[];
      foil?: MTGJSONPricePoint[];
    };
  };
  mtgo?: {
    cardhoarder?: {
      normal?: MTGJSONPricePoint[];
    };
  };
}

export interface MTGJSONCard {
  uuid: string;
  name: string;
  setCode: string;
  number: string;
  rarity: string;
  prices?: MTGJSONCardPrices;
}

export interface ProcessedCardPrice {
  cardId: string;
  date: string;
  price: number;
  priceType: 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
  volume?: number;
  marketCap?: number;
}

// Portfolio and Investment Types
export interface PortfolioCard {
  cardId: string;
  card: MTGCard;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  condition: 'mint' | 'near_mint' | 'excellent' | 'good' | 'light_played' | 'played' | 'poor';
  foil: boolean;
  notes?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  cards: PortfolioCard[];
  totalValue: number;
  totalCost: number;
  performance: number;
  createdAt: string;
  updatedAt: string;
}

// Timeline Tracking Types (Proof of Concept)
export interface PortfolioTransaction {
  id: string;
  portfolioId: string;
  type: 'add' | 'remove' | 'update';
  timestamp: string;
  cardId: string;
  quantityChange: number; // +5 for add, -2 for sell
  pricePerCard: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  source?: 'manual' | 'csv_import';
}

export interface PortfolioSnapshot {
  portfolioId: string;
  date: string; // YYYY-MM-DD
  cards: Array<{
    cardId: string;
    quantity: number;
    totalCost: number;
    averageCostBasis: number;
  }>;
  totalValue: number;
  totalCost: number;
}

export interface PortfolioTimelineEntry {
  date: string;
  portfolioValue: number;
  portfolioCost: number;
  cardCount: number;
  uniqueCards: number;
  dailyChange?: number;
  dailyChangePercent?: number;
}

// Enhanced Portfolio with Timeline Support
export interface EnhancedPortfolio extends Portfolio {
  transactions: PortfolioTransaction[];
  snapshots?: PortfolioSnapshot[];
  settings: {
    trackTimeline: boolean;
    costBasisMethod: 'fifo' | 'lifo' | 'average';
  };
}

// Analytics and Statistics Types
export interface PriceHistory {
  cardId: string;
  uuid?: string; // MTGJSON UUID for cross-referencing
  prices: ProcessedCardPrice[];
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  averagePrice: number;
  percentChange24h?: number;
  percentChange7d?: number;
  percentChange30d?: number;
  lastUpdated?: string;
  provider?: 'scryfall' | 'mtgjson' | 'mock';
}

export interface MarketStats {
  totalCards: number;
  totalValue: number;
  topPerformers: MTGCard[];
  worstPerformers: MTGCard[];
  marketTrends: {
    date: string;
    totalMarketCap: number;
    averagePrice: number;
    volume: number;
  }[];
}

export interface InvestmentAnalytics {
  portfolioValue: number;
  totalGainLoss: number;
  percentageReturn: number;
  bestPerformingCard: PortfolioCard | null;
  worstPerformingCard: PortfolioCard | null;
  diversification: {
    bySet: Record<string, number>;
    byRarity: Record<string, number>;
    byColor: Record<string, number>;
  };
  riskScore: number;
}

// Filter and Search Types
export interface CardFilters {
  name?: string;
  colors?: string[];
  rarity?: string[];
  sets?: string[];
  types?: string[];
  formats?: string[]; // Added format filtering
  minPrice?: number;
  maxPrice?: number;
  minCmc?: number;
  maxCmc?: number;
  sortBy?: 'name' | 'price' | 'rarity' | 'set' | 'cmc';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  cards: MTGCard[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Admin Dashboard Types
export interface SystemMetrics {
  totalUsers: number;
  totalPortfolios: number;
  totalCards: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
  apiStatus: {
    priceSync: 'online' | 'offline' | 'syncing';
    cardDatabase: 'online' | 'offline' | 'syncing';
  };
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

// Utility Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Local Storage Types
export interface LocalStorageData {
  portfolios: Portfolio[];
  watchlist: string[]; // card IDs
  preferences: UserPreferences;
  lastSync: string;
}

export interface UserPreferences {
  defaultCurrency: 'usd' | 'eur';
  showFoilPrices: boolean;
  defaultCondition: PortfolioCard['condition'];
  defaultBuyPricePercentage: number; // Added for buy price estimation slider
  priceAlerts: PriceAlert[];
  dashboardLayout: string[];
  theme: 'light' | 'dark' | 'system';
}

export interface PriceAlert {
  id: string;
  cardId: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
  createdAt: string;
}

// Chart and Visualization Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TrendData {
  label: string;
  data: ChartDataPoint[];
  color: string;
}

// MTGJSON Integration Types
export interface MTGJSONConfig {
  baseUrl: string;
  cacheExpiry: number; // in milliseconds
  preferredProvider: 'tcgplayer' | 'cardkingdom' | 'cardmarket';
  enableCaching: boolean;
}

export interface MTGJSONCache {
  allPrices?: {
    data: Record<string, MTGJSONCardPrices>;
    lastUpdated: string;
    version: string;
  };
  cardMappings?: {
    data: Record<string, MTGJSONCard>; // Scryfall ID -> MTGJSON Card mapping
    lastUpdated: string;
  };
}

