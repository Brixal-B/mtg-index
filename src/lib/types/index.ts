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

// Analytics and Statistics Types
export interface PriceHistory {
  cardId: string;
  prices: ProcessedCardPrice[];
  trend: 'up' | 'down' | 'stable';
  volatility: number;
  averagePrice: number;
  percentChange24h?: number;
  percentChange7d?: number;
  percentChange30d?: number;
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

