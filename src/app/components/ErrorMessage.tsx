'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-destructive mb-1">
            Error
          </h3>
          <p className="text-sm text-destructive/90">
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center space-x-2 mt-3 text-sm text-destructive hover:text-destructive/80 transition-colors"
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






