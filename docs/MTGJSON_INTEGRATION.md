# MTGJSON Integration Guide

This document outlines the implementation of MTGJSON historical price data integration into the MTG Investment Tracker application.

## 🎯 Overview

The MTGJSON integration provides real historical pricing data to replace the previously simulated price data, enabling more accurate investment tracking and analytics.

## 🏗️ Architecture

### Key Components

1. **MTGJSON API Client** (`src/lib/api/mtgjson.ts`)
   - Handles API requests to MTGJSON endpoints
   - Implements rate limiting and error handling
   - Provides card mapping between Scryfall and MTGJSON UUIDs

2. **IndexedDB Cache** (`src/lib/utils/mtgjsonCache.ts`)
   - Stores large price history datasets locally
   - Implements intelligent cache expiry
   - Provides batch operations for performance

3. **Web Worker Processing** (`src/lib/workers/priceHistoryWorker.ts`)
   - Processes price data in background threads
   - Calculates trends and volatility without blocking UI
   - Handles batch processing of multiple cards

4. **Performance Hooks** (`src/lib/hooks/usePriceHistory.ts`)
   - Optimized React hooks for price history management
   - Implements cache-first loading strategies
   - Provides background refresh capabilities

## 📊 Data Flow

```
1. User requests card price history
2. Check IndexedDB cache first
3. If cached data exists and is fresh, return immediately
4. If not cached or expired, fetch from MTGJSON
5. Process data in Web Worker (if available)
6. Cache results in IndexedDB
7. Update UI with real data
8. Optionally refresh in background
```

## 🔧 Implementation Details

### TypeScript Types

New types have been added to support MTGJSON data structure:

```typescript
interface MTGJSONPricePoint {
  date: string; // YYYY-MM-DD format
  price: number;
}

interface MTGJSONCardPrices {
  paper?: {
    cardkingdom?: {
      normal?: MTGJSONPricePoint[];
      foil?: MTGJSONPricePoint[];
    };
    cardmarket?: {
      normal?: MTGJSONPricePoint[];
      foil?: MTGJSONPricePoint[];
    };
    tcgplayer?: {
      normal?: MTGJSONPricePoint[];
      foil?: MTGJSONPricePoint[];
    };
  };
  mtgo?: {
    cardhoarder?: {
      normal?: MTGJSONPricePoint[];
    };
  };
}
```

### Enhanced Components

1. **EnhancedPriceChart** (`src/app/analytics/components/EnhancedPriceChart.tsx`)
   - Displays real vs. simulated data indicators
   - Shows trend analysis and volatility metrics
   - Supports both normal and foil price tracking

2. **Enhanced Portfolio Chart** (`src/app/analytics/components/PortfolioOverviewChart.tsx`)
   - Uses real price history for portfolio value calculation
   - Falls back to simulated data when real data unavailable
   - Indicates data source to users

3. **Smart Price Alerts** (`src/app/settings/components/EnhancedPriceAlertModal.tsx`)
   - Analyzes historical trends to suggest optimal alert prices
   - Identifies support/resistance levels
   - Provides confidence ratings for suggestions

## 🚀 Usage Examples

### Basic Price History Loading

```typescript
import { usePriceHistory } from '@/lib/hooks/usePriceHistory';

function CardComponent({ card }: { card: MTGCard }) {
  const { priceHistory, loading, dataSource } = usePriceHistory(card, {
    cacheFirst: true,
    backgroundRefresh: true,
    enableWorker: true,
  });

  return (
    <div>
      {loading && <LoadingSpinner />}
      {priceHistory && (
        <div>
          <p>Data Source: {dataSource}</p>
          <p>Trend: {priceHistory.trend}</p>
          <p>Volatility: {priceHistory.volatility.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
```

### Batch Loading for Portfolios

```typescript
import { useBatchPriceHistory } from '@/lib/hooks/usePriceHistory';

function PortfolioAnalytics({ cards }: { cards: MTGCard[] }) {
  const { priceHistories, loading, progress } = useBatchPriceHistory(cards);

  return (
    <div>
      {loading && <ProgressBar value={progress} />}
      <PortfolioChart priceHistories={priceHistories} />
    </div>
  );
}
```

### Enhanced Price Alerts

```typescript
import { EnhancedPriceAlertModal } from '@/app/settings/components/EnhancedPriceAlertModal';

function PriceAlertsPage() {
  const [showModal, setShowModal] = useState(false);

  const handleCreateAlert = (alert) => {
    // Alert includes AI-generated suggestions based on historical data
    console.log('Smart alert created:', alert);
  };

  return (
    <EnhancedPriceAlertModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onCreateAlert={handleCreateAlert}
    />
  );
}
```

## ⚡ Performance Optimizations

### 1. Intelligent Caching

- **IndexedDB Storage**: Large datasets stored efficiently
- **Cache Expiry**: Automatic cleanup of stale data
- **Background Refresh**: Updates cache without blocking UI

### 2. Web Worker Processing

- **Non-blocking Calculations**: Trend analysis in background threads
- **Batch Processing**: Handle multiple cards efficiently
- **Fallback Support**: Graceful degradation when workers unavailable

### 3. Progressive Loading

- **Cache-First Strategy**: Show cached data immediately
- **Background Updates**: Refresh data in background
- **Lazy Loading**: Load price history only when needed

### 4. Memory Management

- **Automatic Cleanup**: Remove expired cache entries
- **Batch Operations**: Minimize database transactions
- **Worker Termination**: Clean up resources properly

## 🔍 Data Sources and Fallbacks

### Primary Data Source: MTGJSON
- **AllPrices.json**: Comprehensive historical pricing
- **90-day History**: Recent price movements
- **Multiple Providers**: TCGPlayer, CardKingdom, CardMarket

### Fallback Strategy
1. **Cache First**: Check IndexedDB for recent data
2. **MTGJSON API**: Fetch fresh data if needed
3. **Simulated Data**: Generate realistic fallback data
4. **Graceful Degradation**: Always show something to user

## 🛠️ Configuration

### MTGJSON Settings

```typescript
const MTGJSON_CONFIG = {
  baseUrl: 'https://mtgjson.com/api/v5',
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  preferredProvider: 'tcgplayer',
  enableCaching: true,
};
```

### Cache Settings

```typescript
const CACHE_EXPIRY = {
  PRICE_HISTORY: 24 * 60 * 60 * 1000, // 24 hours
  CARD_MAPPINGS: 7 * 24 * 60 * 60 * 1000, // 7 days
  METADATA: 60 * 60 * 1000, // 1 hour
};
```

## 📈 Benefits

### For Users
- **Real Historical Data**: Accurate price trends and analysis
- **Smart Alerts**: AI-suggested optimal alert prices
- **Better Analytics**: More accurate portfolio performance tracking
- **Offline Support**: Cached data available without internet

### For Performance
- **Faster Loading**: Cache-first strategy reduces API calls
- **Non-blocking UI**: Web Workers prevent UI freezing
- **Efficient Storage**: IndexedDB handles large datasets
- **Background Updates**: Fresh data without user interruption

## 🔮 Future Enhancements

### Planned Features
1. **Real-time Updates**: WebSocket connections for live price feeds
2. **Advanced Analytics**: Machine learning price predictions
3. **Market Correlation**: Cross-card price relationship analysis
4. **Historical Events**: Link price changes to tournament results

### Potential Integrations
1. **MTGStocks API**: Additional price data sources
2. **EDHRec API**: Popularity and meta analysis
3. **Tournament Results**: Performance impact on prices
4. **Social Sentiment**: Reddit/Twitter sentiment analysis

## 🚨 Important Notes

### Current Limitations
1. **MTGJSON Mapping**: Card mapping between Scryfall and MTGJSON needs implementation
2. **Data Size**: AllPrices.json is ~500MB - needs efficient handling
3. **API Limits**: MTGJSON doesn't specify rate limits - be conservative
4. **Historical Depth**: Limited to ~90 days of price history

### Implementation Status
- ✅ **Type Definitions**: Complete MTGJSON type system
- ✅ **API Client**: Basic MTGJSON client with rate limiting
- ✅ **Caching System**: IndexedDB cache implementation
- ✅ **Performance Hooks**: Optimized React hooks
- ✅ **Enhanced Components**: Updated charts and alerts
- 🔄 **Card Mapping**: Needs AllPrintings.json processing
- 🔄 **Data Fetching**: Needs actual MTGJSON data integration

### Next Steps
1. **Implement Card Mapping**: Build Scryfall ID → MTGJSON UUID mapping
2. **Data Processing**: Handle AllPrices.json efficiently
3. **Testing**: Comprehensive testing with real data
4. **Optimization**: Fine-tune caching and performance
5. **Documentation**: User-facing documentation and guides

## 📚 Resources

- [MTGJSON Documentation](https://mtgjson.com/)
- [MTGJSON API Reference](https://mtgjson.com/api/v5/)
- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

This integration provides a solid foundation for real historical price data while maintaining excellent performance and user experience. The modular architecture allows for easy future enhancements and additional data sources.
