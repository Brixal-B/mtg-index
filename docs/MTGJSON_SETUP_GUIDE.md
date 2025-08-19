# MTGJSON Setup Guide

This guide walks you through setting up the actual MTGJSON integration to get real historical price data in your MTG Investment Tracker.

## 🎯 Overview

The MTGJSON integration replaces simulated price data with real historical pricing information from MTGJSON's comprehensive database. This provides:

- **90 days of historical pricing** for most cards
- **Multiple price sources** (TCGPlayer, CardKingdom, CardMarket)
- **Accurate trend analysis** based on real market data
- **Better investment insights** with genuine price movements

## 🚀 Quick Setup (Recommended)

### Step 1: Access Admin Panel
1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/admin`
3. Scroll down to the "Card Mapping Manager" section

### Step 2: Initialize MTGJSON Data
1. Click the **"Initialize MTGJSON Data"** button
2. Wait for the download and processing to complete (this may take several minutes)
3. Monitor the progress bar - the system will:
   - Download AllPrintings.json (~200MB)
   - Download AllPrices.json (~500MB)
   - Process and compress the data
   - Build initial card mappings

### Step 3: Verify Setup
1. Click **"Run Integration Tests"** to verify everything works
2. Check the test results - you should see:
   - ✅ Initialization: MTGJSON initialized with X cards
   - ✅ Card Mapping: Mapped X/5 test cards
   - ✅ Price History: Retrieved X price points (real data)
   - ✅ Performance: Performance tests passed

### Step 4: Test Individual Cards
1. Use the "Test Card Search" section
2. Search for popular cards like "Lightning Bolt" or "Black Lotus"
3. Verify cards show up with proper mapping indicators

## 🔧 Manual Setup (Advanced)

If you need more control over the setup process, you can initialize components manually:

### Initialize Card Mapping Service

```typescript
import { cardMappingService } from '@/lib/services/cardMappingService';

// Initialize the mapping service
await cardMappingService.initialize();

// Test mapping a card
const scryfallCard = await getCard('lightning-bolt');
const mtgjsonUuid = await cardMappingService.getMapping(scryfallCard);

if (mtgjsonUuid) {
  console.log('Successfully mapped card:', mtgjsonUuid);
} else {
  console.log('Card mapping failed');
}
```

### Initialize MTGJSON Data Programmatically

```typescript
import { mtgjsonInitService } from '@/lib/services/mtgjsonInitService';

// Check if already initialized
const isInit = await mtgjsonInitService.isInitialized();

if (!isInit) {
  // Set up progress tracking
  mtgjsonInitService.onProgress((progress) => {
    console.log(`${progress.stage}: ${progress.progress}% - ${progress.message}`);
  });

  // Initialize the system
  const result = await mtgjsonInitService.initialize();
  
  if (result.success) {
    console.log('MTGJSON initialized successfully!');
    console.log('Stats:', result.stats);
  } else {
    console.error('Initialization failed:', result.error);
  }
}
```

## 📊 Verification Steps

### 1. Check Data Availability
```typescript
import { allPrintingsStorage } from '@/lib/utils/allPrintingsStorage';

const stats = await allPrintingsStorage.getStorageStats();
console.log(`Loaded ${stats.totalCards} cards from ${stats.totalSets} sets`);
```

### 2. Test Card Search
```typescript
import { allPrintingsStorage } from '@/lib/utils/allPrintingsStorage';

const results = await allPrintingsStorage.searchCards('Lightning Bolt', 5);
console.log(`Found ${results.length} matches for Lightning Bolt`);
```

### 3. Test Price History
```typescript
import { getPriceHistoryForCard } from '@/lib/api/mtgjson';

const card = await getCard('lightning-bolt');
const history = await getPriceHistoryForCard(card);

if (history && history.provider === 'mtgjson') {
  console.log('Real price data available!');
  console.log(`${history.prices.length} price points`);
  console.log(`Trend: ${history.trend}`);
} else {
  console.log('Using simulated data');
}
```

## 🎛️ Configuration Options

### Cache Settings
You can adjust cache behavior in `src/lib/api/mtgjson.ts`:

```typescript
const MTGJSON_CONFIG = {
  baseUrl: 'https://mtgjson.com/api/v5',
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  preferredProvider: 'tcgplayer', // or 'cardkingdom', 'cardmarket'
  enableCaching: true,
};
```

### Storage Optimization
Adjust chunk sizes in `src/lib/utils/allPrintingsStorage.ts`:

```typescript
// Smaller chunks = less memory usage, more storage operations
const CHUNK_SIZE = 50; // Cards per chunk

// Larger chunks = more memory usage, fewer storage operations  
const CHUNK_SIZE = 100; // Cards per chunk
```

## 🔍 Troubleshooting

### Common Issues

#### "Download failed" Error
**Cause**: Network issues or MTGJSON server problems
**Solution**: 
1. Check your internet connection
2. Try again later (MTGJSON servers may be busy)
3. Check browser console for specific error details

#### "No mapping found" for Popular Cards
**Cause**: AllPrintings data not downloaded or corrupted
**Solution**:
1. Go to Admin panel → Card Mapping Manager
2. Click "Clear All Data"
3. Click "Initialize MTGJSON Data" again

#### High Memory Usage
**Cause**: Large dataset loaded into memory
**Solution**:
1. Reduce `CHUNK_SIZE` in allPrintingsStorage.ts
2. Clear browser cache and reload
3. Consider using a more powerful development machine

#### Slow Performance
**Cause**: Unoptimized data access patterns
**Solution**:
1. Ensure data is properly cached
2. Check that IndexedDB is working (not falling back to localStorage)
3. Run integration tests to identify bottlenecks

### Diagnostic Commands

#### Check System Health
```typescript
import { quickHealthCheck } from '@/lib/utils/mtgjsonTestUtils';

const health = await quickHealthCheck();
if (!health.healthy) {
  console.log('Issues found:', health.issues);
}
```

#### Get Detailed Stats
```typescript
import { mtgjsonInitService } from '@/lib/services/mtgjsonInitService';

const stats = await mtgjsonInitService.getInitializationStats();
console.log('System stats:', stats);
```

#### Test Specific Card
```typescript
import { testCardMappingForCard } from '@/lib/utils/mtgjsonTestUtils';

const result = await testCardMappingForCard('Lightning Bolt');
console.log('Test result:', result);
```

## 📈 Performance Expectations

### Initial Setup
- **AllPrintings.json download**: 2-5 minutes (depending on connection)
- **AllPrices.json download**: 5-10 minutes (large file)
- **Data processing**: 1-3 minutes
- **Total setup time**: 10-20 minutes

### Runtime Performance
- **Card mapping**: 1-50ms (depending on cache hit)
- **Price history lookup**: 5-100ms (depending on data availability)
- **Search operations**: 10-200ms (depending on query complexity)

### Storage Usage
- **Raw MTGJSON data**: ~700MB total
- **Compressed storage**: ~200-300MB
- **Mapping cache**: ~5-20MB
- **Browser storage**: ~250-350MB total

## 🔮 What Happens Next

Once MTGJSON is set up, your app will automatically:

1. **Use real price data** instead of simulations in charts
2. **Show data source indicators** (green "Real Data" vs amber "Simulated")
3. **Provide accurate trend analysis** based on market movements
4. **Enable smart price alerts** with historical context
5. **Improve portfolio analytics** with genuine performance data

### Visual Changes You'll See

- **Portfolio charts** show actual historical value changes
- **Price alerts** suggest optimal prices based on support/resistance levels
- **Analytics dashboard** displays real market trends
- **Card modals** show genuine price history graphs
- **Data quality indicators** throughout the UI

## 🎯 Success Criteria

Your MTGJSON integration is working correctly when:

✅ **Admin panel shows**:
- Total cards: 500,000+ 
- Direct matches: 80%+ mapping success rate
- Storage: ~250MB+ used

✅ **Integration tests show**:
- All tests passing (green checkmarks)
- "Real data" indicators in test results
- Sub-100ms performance metrics

✅ **User experience shows**:
- "Real Data" badges on charts
- Actual price variations in history graphs
- Smart price alert suggestions
- Fast loading with cached data

## 📞 Support

If you encounter issues:

1. **Check the browser console** for error messages
2. **Run integration tests** to identify specific problems
3. **Review the test report** for detailed diagnostics
4. **Clear all data and re-initialize** if corruption is suspected

The MTGJSON integration transforms your app from a demo with simulated data into a production-ready tool with real market insights. The initial setup investment pays off with significantly more valuable functionality for MTG investors and collectors.

## 🎉 Congratulations!

Once you see "Real Data" indicators throughout your app, you've successfully integrated MTGJSON and unlocked the full potential of historical price analysis for Magic: The Gathering cards!
