/**
 * Shared Component Types
 * Consolidates common interface patterns used across React components
 */

import { ReactNode } from 'react';
import { Portfolio, PortfolioCard } from './index';

// Common Modal Prop Patterns
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ModalWithTitleProps extends BaseModalProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ConfirmationModalProps extends ModalWithTitleProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

// Form Component Props
export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Data Management Props
export interface CreateModalProps<T> extends BaseModalProps {
  onCreated: (item: T) => void;
}

export interface EditModalProps<T> extends BaseModalProps {
  item: T | null;
  onUpdated: (item: T) => void;
}

export interface DataTableProps<T> {
  data: T[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  emptyMessage?: string;
}

// Portfolio-specific Component Props
export interface PortfolioModalProps extends CreateModalProps<Portfolio> {}

export interface CardImportModalProps extends BaseModalProps {
  onCardsImported: (cards: PortfolioCard[]) => void;
}

// Common Storage/Admin Props
export interface StorageBreakdown {
  portfolios: number;
  watchlist: number;
  preferences: number;
  priceAlerts: number;
  other: number;
}

export interface AdminComponentProps {
  onRefresh?: () => void;
  loading?: boolean;
}

// Error & Loading State Props
export interface ErrorProps {
  error: string | Error | null;
  onRetry?: () => void;
  className?: string;
}

export interface LoadingProps {
  loading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

// Import/Export Props
export interface ImportResult {
  cardName: string;
  status: 'success' | 'error' | 'pending';
  error?: string;
  card?: PortfolioCard;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}
