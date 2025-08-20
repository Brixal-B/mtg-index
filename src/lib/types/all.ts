/**
 * Unified Type Exports
 * Single import source for all application types
 */

// Core application types
export * from './index';

// Scryfall API types  
export * from './scryfall';

// Component prop types
export * from './components';

// Commonly used type combinations for convenience
export type {
  MTGCard,
  MTGCardPrices,
  Portfolio,
  PortfolioCard,
  UserPreferences,
  PriceHistory,
  InvestmentAnalytics,
} from './index';

export type {
  ScryfallCard,
  ScryfallSearchResponse,
  ScryfallSearchParams,
} from './scryfall';

export type {
  BaseModalProps,
  ModalWithTitleProps,
  PortfolioModalProps,
  StorageBreakdown,
  ImportResult,
} from './components';
