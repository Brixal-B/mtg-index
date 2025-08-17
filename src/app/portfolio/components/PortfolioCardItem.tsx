'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Edit3, Trash2, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { PortfolioCard } from '@/lib/types';

interface PortfolioCardItemProps {
  portfolioCard: PortfolioCard;
  onRemove: () => void;
  onUpdate: (card: PortfolioCard) => void;
}

const conditionLabels = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  excellent: 'Excellent',
  good: 'Good',
  light_played: 'Light Played',
  played: 'Played',
  poor: 'Poor',
};

export function PortfolioCardItem({ portfolioCard, onRemove, onUpdate }: PortfolioCardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: portfolioCard.quantity,
    purchasePrice: portfolioCard.purchasePrice,
    condition: portfolioCard.condition,
    notes: portfolioCard.notes || '',
  });

  const currentPrice = portfolioCard.card.prices.usd || 0;
  const totalValue = currentPrice * portfolioCard.quantity;
  const totalCost = portfolioCard.purchasePrice * portfolioCard.quantity;
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  const handleSaveEdit = () => {
    const updatedCard: PortfolioCard = {
      ...portfolioCard,
      quantity: editForm.quantity,
      purchasePrice: editForm.purchasePrice,
      condition: editForm.condition,
      notes: editForm.notes.trim() || undefined,
    };
    
    onUpdate(updatedCard);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      quantity: portfolioCard.quantity,
      purchasePrice: portfolioCard.purchasePrice,
      condition: portfolioCard.condition,
      notes: portfolioCard.notes || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start space-x-4">
        {/* Card Image */}
        <div className="w-12 h-16 bg-muted rounded border flex-shrink-0">
          {portfolioCard.card.imageUrl ? (
            <Image
              src={portfolioCard.card.imageUrl}
              alt={portfolioCard.card.name}
              width={48}
              height={64}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center p-1">
              {portfolioCard.card.name.substring(0, 10)}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">
                {portfolioCard.card.name}
                {portfolioCard.foil && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Foil
                  </span>
                )}
              </h4>
              <p className="text-sm text-muted-foreground">
                {portfolioCard.card.setName} • {conditionLabels[portfolioCard.condition]}
              </p>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this card from your portfolio?')) {
                        onRemove();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card Details */}
          {!isEditing ? (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <span className="ml-1 font-medium">{portfolioCard.quantity}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Purchase:</span>
                <span className="ml-1 font-medium">${portfolioCard.purchasePrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Current:</span>
                <span className="ml-1 font-medium">${currentPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Value:</span>
                <span className="ml-1 font-medium">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      quantity: Math.max(1, parseInt(e.target.value) || 1) 
                    }))}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Purchase Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.purchasePrice}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      purchasePrice: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Condition</label>
                  <select
                    value={editForm.condition}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      condition: e.target.value as PortfolioCard['condition'] 
                    }))}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm border border-border text-foreground rounded hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Performance */}
          {!isEditing && (
            <div className="mt-2 flex items-center justify-between">
              <div className={`flex items-center space-x-1 text-sm ${
                gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {gainLoss >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} 
                  ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                </span>
              </div>

              {portfolioCard.notes && (
                <div className="text-xs text-muted-foreground italic truncate max-w-xs">
                  {portfolioCard.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





