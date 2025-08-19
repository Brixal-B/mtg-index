'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  StarOff, 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Filter,
  Target,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { MTGCard, PriceAlert, UserPreferences } from '@/lib/types';
import { getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, getPreferences, savePreferences } from '@/lib/storage';
import { getCard } from '@/lib/api/scryfall';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { CardItem } from '@/app/cards/components/CardItem';
import { CardModal } from '@/app/cards/components/CardModal';
import { EnhancedPriceAlertModal } from '@/app/settings/components/EnhancedPriceAlertModal';
import { usePriceTrends } from '@/lib/hooks/usePriceTrends';

interface WishlistCardData {
  card: MTGCard;
  alerts: PriceAlert[];
  priceTarget?: number;
  hasRecentPriceChange?: boolean;
  priceChangePercent?: number;
}

const PRICE_CHANGE_THRESHOLD = 5; // 5% price change threshold

export default function WishlistPage() {
  const [wishlistCards, setWishlistCards] = useState<WishlistCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<MTGCard | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'with_alerts' | 'price_targets' | 'recent_changes'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'alerts' | 'change'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    loadWishlistData();
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    try {
      const prefs = getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadWishlistData = async () => {
    try {
      setLoading(true);
      setError(null);

      const watchlistIds = getWatchlist();
      if (watchlistIds.length === 0) {
        setWishlistCards([]);
        return;
      }

      const preferences = getPreferences();
      const priceAlerts = preferences.priceAlerts || [];

      // Load card data for watchlist items
      const cardPromises = watchlistIds.map(async (cardId) => {
        try {
          const card = await getCard(cardId);
          const cardAlerts = priceAlerts.filter(alert => alert.cardId === cardId && alert.active);
          
          return {
            card,
            alerts: cardAlerts,
            priceTarget: cardAlerts.find(alert => alert.condition === 'below')?.targetPrice,
            // We'll calculate price changes when we have historical data
            hasRecentPriceChange: false,
            priceChangePercent: 0,
          };
        } catch (err) {
          console.error(`Error loading card ${cardId}:`, err);
          return null;
        }
      });

      const results = await Promise.all(cardPromises);
      const validCards = results.filter((item): item is WishlistCardData => item !== null);
      
      setWishlistCards(validCards);
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError('Failed to load wishlist data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = (cardId: string) => {
    addToWatchlist(cardId);
    loadWishlistData(); // Refresh the list
  };

  const handleRemoveFromWatchlist = (cardId: string) => {
    removeFromWatchlist(cardId);
    setWishlistCards(prev => prev.filter(item => item.card.id !== cardId));
  };

  const handleCreateAlert = (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => {
    if (!preferences) return;

    const newAlert: PriceAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    const updatedPreferences: UserPreferences = {
      ...preferences,
      priceAlerts: [...preferences.priceAlerts, newAlert],
    };

    savePreferences(updatedPreferences);
    setPreferences(updatedPreferences);
    loadWishlistData(); // Refresh to show new alerts
  };

  const handleRemoveAlert = (alertId: string) => {
    if (!preferences) return;

    const updatedPreferences: UserPreferences = {
      ...preferences,
      priceAlerts: preferences.priceAlerts.filter(alert => alert.id !== alertId),
    };

    savePreferences(updatedPreferences);
    setPreferences(updatedPreferences);
    loadWishlistData(); // Refresh to remove alert
  };

  const handleCardClick = (card: MTGCard) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  const openAlertModal = (card?: MTGCard) => {
    if (card) {
      setSelectedCard(card);
    }
    setShowAlertModal(true);
  };

  // Filter and sort wishlist cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = wishlistCards;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.card.name.toLowerCase().includes(query) ||
        item.card.setName.toLowerCase().includes(query) ||
        item.card.type.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'with_alerts':
        filtered = filtered.filter(item => item.alerts.length > 0);
        break;
      case 'price_targets':
        filtered = filtered.filter(item => item.priceTarget !== undefined);
        break;
      case 'recent_changes':
        filtered = filtered.filter(item => item.hasRecentPriceChange);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.card.name;
          bValue = b.card.name;
          break;
        case 'price':
          aValue = a.card.prices.usd || 0;
          bValue = b.card.prices.usd || 0;
          break;
        case 'alerts':
          aValue = a.alerts.length;
          bValue = b.alerts.length;
          break;
        case 'change':
          aValue = a.priceChangePercent || 0;
          bValue = b.priceChangePercent || 0;
          break;
        default:
          aValue = a.card.name;
          bValue = b.card.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [wishlistCards, searchQuery, filterBy, sortBy, sortOrder]);

  const activeAlerts = preferences?.priceAlerts.filter(alert => alert.active) || [];
  const triggeredAlerts = activeAlerts.filter(alert => {
    const card = wishlistCards.find(item => item.card.id === alert.cardId)?.card;
    if (!card || !card.prices.usd) return false;
    
    return alert.condition === 'below' 
      ? card.prices.usd <= alert.targetPrice
      : card.prices.usd >= alert.targetPrice;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Loading your wishlist...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Wishlist & Price Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Track cards you want and get alerted when prices hit your targets
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => openAlertModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span>Create Alert</span>
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      {(activeAlerts.length > 0 || triggeredAlerts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-xl font-semibold text-foreground">{activeAlerts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Triggered Alerts</p>
                <p className="text-xl font-semibold text-foreground">{triggeredAlerts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Star className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wishlist Cards</p>
                <p className="text-xl font-semibold text-foreground">{wishlistCards.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search wishlist cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Cards</option>
            <option value="with_alerts">With Alerts</option>
            <option value="price_targets">Price Targets</option>
            <option value="recent_changes">Recent Changes</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="alerts">Alerts</option>
            <option value="change">Price Change</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Triggered Alerts Section */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Price Alerts Triggered!</h3>
          </div>
          <div className="space-y-2">
            {triggeredAlerts.map(alert => {
              const cardData = wishlistCards.find(item => item.card.id === alert.cardId);
              if (!cardData) return null;

              return (
                <div key={alert.id} className="flex items-center justify-between bg-white rounded p-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-gray-900">{cardData.card.name}</p>
                      <p className="text-sm text-gray-600">
                        Target: ${alert.targetPrice} • Current: ${cardData.card.prices.usd}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCardClick(cardData.card)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Card
                    </button>
                    <button
                      onClick={() => handleRemoveAlert(alert.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards Grid */}
      {error && <ErrorMessage message={error} />}
      
      {filteredAndSortedCards.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No cards in your wishlist</h3>
          <p className="text-muted-foreground">
            Add cards to your wishlist by clicking the star icon when browsing cards
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedCards.map((item) => (
            <div key={item.card.id} className="relative">
              <CardItem
                card={item.card}
                onClick={() => handleCardClick(item.card)}
              />
              
              {/* Overlay with wishlist and alert info */}
              <div className="absolute top-2 right-2 flex flex-col space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromWatchlist(item.card.id);
                  }}
                  className="p-1 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                  title="Remove from wishlist"
                >
                  <Star className="h-3 w-3 fill-current" />
                </button>
                
                {item.alerts.length > 0 && (
                  <div className="p-1 bg-blue-500 text-white rounded-full text-xs font-medium min-w-[20px] text-center">
                    {item.alerts.length}
                  </div>
                )}
              </div>

              {/* Price target indicator */}
              {item.priceTarget && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Target: ${item.priceTarget}
                </div>
              )}

              {/* Quick alert button */}
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAlertModal(item.card);
                  }}
                  className="p-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                  title="Create price alert"
                >
                  <Bell className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          isOpen={showCardModal}
          onClose={() => {
            setShowCardModal(false);
            setSelectedCard(null);
          }}
        />
      )}

      <EnhancedPriceAlertModal
        isOpen={showAlertModal}
        onClose={() => {
          setShowAlertModal(false);
          setSelectedCard(null);
        }}
        onCreateAlert={handleCreateAlert}
      />
    </div>
  );
}
