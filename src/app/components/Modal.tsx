/**
 * Shared Modal Component
 * Consolidates common modal patterns used across the application
 */

'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  size = 'md',
  className = '',
  showCloseButton = true,
  closeOnBackdrop = true,
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-card border border-border rounded-xl w-full max-h-[90vh] overflow-y-auto ${sizeClasses[size]} ${className}`}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-2">
              {Icon && <Icon className="h-5 w-5 text-primary" />}
              <div>
                {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={title || showCloseButton ? 'p-6' : 'p-0'}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation Dialog Component
 * Specialized modal for confirmation dialogs
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon: Icon,
  destructive = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={Icon}
      size="sm"
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">{message}</p>
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              destructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
