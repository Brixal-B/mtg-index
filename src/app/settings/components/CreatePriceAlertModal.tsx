'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { PriceAlert } from '@/lib/types';

interface CreatePriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (alert: PriceAlert) => void;
}

export function CreatePriceAlertModal({ isOpen, onClose, onCreateAlert }: CreatePriceAlertModalProps) {
  const [cardName, setCardName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardName.trim() || !targetPrice.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      const alert: PriceAlert = {
        id: `alert-${Date.now()}`,
        cardId: `card-${cardName.toLowerCase().replace(/\s+/g, '-')}`, // Mock card ID
        targetPrice: parseFloat(targetPrice),
        condition,
        active: true,
        createdAt: new Date().toISOString(),
      };

      onCreateAlert(alert);
      
      // Reset form
      setCardName('');
      setTargetPrice('');
      setCondition('below');
      onClose();
    } catch (error) {
      console.error('Error creating price alert:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Create Price Alert</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Card Name
            </label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Enter card name..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Alert Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="below">Price drops below target</option>
              <option value="above">Price rises above target</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !cardName.trim() || !targetPrice.trim()}
              className="flex-1 flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? 'Creating...' : 'Create Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}