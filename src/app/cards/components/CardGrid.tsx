'use client';

import { useState } from 'react';
import { MTGCard } from '@/lib/types';
import { CardItem } from './CardItem';
import { CardModal } from './CardModal';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

interface CardGridProps {
  cards: MTGCard[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function CardGrid({ cards, onLoadMore, hasMore = false, loading = false }: CardGridProps) {
  const [selectedCard, setSelectedCard] = useState<MTGCard | null>(null);

  const handleCardClick = (card: MTGCard) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  if (cards.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center pt-8">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <button
                onClick={onLoadMore}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Load More Cards
              </button>
            )}
          </div>
        )}

        {/* Loading Spinner for Additional Cards */}
        {loading && cards.length > 0 && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}





