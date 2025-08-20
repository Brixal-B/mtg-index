'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Portfolio } from '@/lib/types';
import { savePortfolio } from '@/lib/storage';
import { Modal } from '@/app/components/Modal';
// import { generateUUID } from '@/lib/utils/uuid';

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPortfolioCreated: (portfolio: Portfolio) => void;
}

export function CreatePortfolioModal({
  isOpen,
  onClose,
  onPortfolioCreated,
}: CreatePortfolioModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newPortfolio: Portfolio = {
        id: `portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description.trim() || undefined,
        cards: [],
        totalValue: 0,
        totalCost: 0,
        performance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      savePortfolio(newPortfolio);
      onPortfolioCreated(newPortfolio);
      
      // Reset form
      setName('');
      setDescription('');
    } catch (err) {
      setError('Failed to create portfolio. Please try again.');
      console.error('Error creating portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Portfolio"
      icon={Wallet}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Portfolio Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Modern Collection, Investment Cards"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for your portfolio"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              disabled={loading}
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : 'Create Portfolio'}
            </button>
          </div>
      </form>
    </Modal>
  );
}







