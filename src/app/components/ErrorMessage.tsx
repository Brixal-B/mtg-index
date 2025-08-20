'use client';

import { AlertCircle, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  error: {
    container: 'bg-destructive/10 border-destructive/20 text-destructive',
    icon: 'text-destructive',
    text: 'text-destructive/90',
    button: 'text-destructive hover:text-destructive/80',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-700 dark:text-yellow-300',
    button: 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300',
  },
  destructive: {
    container: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-700 dark:text-red-300',
    button: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
  },
};

const sizeStyles = {
  sm: 'p-3 text-sm',
  md: 'p-4 text-sm',
  lg: 'p-6 text-base',
};

const iconComponents = {
  error: AlertCircle,
  warning: AlertTriangle,
  destructive: XCircle,
};

export function ErrorMessage({ 
  message, 
  onRetry, 
  className = '', 
  variant = 'error',
  size = 'md' 
}: ErrorMessageProps) {
  const styles = variantStyles[variant];
  const IconComponent = iconComponents[variant];
  
  return (
    <div className={`${styles.container} border rounded-lg ${sizeStyles[size]} ${className}`}>
      <div className="flex items-start space-x-3">
        <IconComponent className={`h-5 w-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h3 className={`font-medium mb-1 ${styles.text}`}>
            {variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : 'Critical Error'}
          </h3>
          <p className={styles.text}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center space-x-2 mt-3 ${styles.button} transition-colors`}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline error message for form fields
 */
interface InlineErrorProps {
  message?: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  if (!message) return null;
  
  return (
    <div className={`flex items-center space-x-1 mt-1 ${className}`}>
      <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
      <span className="text-xs text-destructive">{message}</span>
    </div>
  );
}







