# Database Status Component Documentation

## Overview

The `DatabaseStatusIndicator` component provides real-time monitoring of the MTGJSON database status, including initialization state, data freshness, and download progress. This component is integrated into both the Admin Dashboard and Settings pages to give users visibility into their historical price data system.

## Features

### 🟢 **Real-Time Status Monitoring**
- **Initialization Status**: Shows if MTGJSON data is downloaded and ready
- **Data Freshness**: Indicates if data is up-to-date (within 7 days)
- **Download Progress**: Real-time progress tracking during data downloads
- **Connection Status**: Online/offline indicator
- **Error Reporting**: Clear error messages and recovery suggestions

### 🎯 **Smart State Detection**
The component automatically detects and displays:
- ✅ **Up to Date**: Green indicator, all systems operational
- 🟡 **Update Available**: Yellow indicator, data is older than 7 days
- 🔵 **Downloading**: Blue indicator with progress bar
- ❌ **Not Initialized**: Gray indicator, needs setup
- 🔴 **Error State**: Red indicator with error details

### 📊 **Detailed Information**
When expanded (non-compact mode), shows:
- **Card Count**: Total number of cards in database
- **Version**: MTGJSON data version
- **Last Updated**: When data was last refreshed
- **Connection Status**: Network connectivity indicator

## Usage

### Compact Mode (Admin Dashboard)
```tsx
<DatabaseStatusIndicator 
  compact={true} 
  showActions={false} 
/>
```
- Small inline status badge
- Perfect for headers and quick status checks
- Shows essential info: status icon, text, and progress bar

### Full Mode (Settings Page)
```tsx
<DatabaseStatusIndicator 
  showActions={true} 
/>
```
- Detailed status card with full information
- Includes action buttons for initialization/updates
- Shows comprehensive system details

### Custom Integration
```tsx
<DatabaseStatusIndicator 
  onInitialize={() => handleCustomInit()} 
  showActions={true}
  compact={false}
/>
```

## Status States

### 1. **Not Initialized** 🔄
```
Status: Not initialized
Actions: [Initialize] button available
Color: Gray
```
- No MTGJSON data downloaded
- Shows initialization button
- Prompts user to set up the system

### 2. **Up to Date** ✅
```
Status: Up to date
Cards: 500,000+
Version: 5.2.1
Last Updated: Today
Color: Green
```
- Data is fresh (< 7 days old)
- All systems operational
- Ready for historical price lookups

### 3. **Update Available** 🟡
```
Status: Update available
Last Updated: 5 days ago
Actions: [Update Database] button
Color: Yellow
```
- Data exists but is getting stale
- Update recommended for latest prices
- One-click update available

### 4. **Downloading** 🔵
```
Status: downloading: 45%
Progress: [████████░░] 45%
Stage: Processing AllPrices data...
Color: Blue
```
- Real-time download progress
- Shows current stage of operation
- Progress bar with percentage

### 5. **Error State** ❌
```
Status: Error: Network timeout
Actions: [Retry] button
Color: Red
```
- Clear error description
- Actionable error messages
- Retry/recovery options

## Integration Points

### Admin Dashboard
Located in the header area for quick status visibility:
```tsx
// src/app/admin/page.tsx
<div className="flex items-center space-x-4">
  <DatabaseStatusIndicator compact={true} showActions={false} />
  <div className="text-right">
    <p className="text-sm text-muted-foreground">Last updated</p>
    <p className="text-sm font-medium">{lastUpdated}</p>
  </div>
</div>
```

### Settings Page
In the Data Management section for detailed control:
```tsx
// src/app/settings/page.tsx
<div className="space-y-3">
  <h3 className="text-sm font-medium">MTGJSON Database Status</h3>
  <p className="text-xs text-muted-foreground">
    Monitor the status of your historical price data...
  </p>
  <DatabaseStatusIndicator showActions={true} />
</div>
```

## Technical Implementation

### State Management
```tsx
interface DatabaseStatus {
  isInitialized: boolean;      // Has data been downloaded?
  isUpToDate: boolean;         // Is data fresh (< 7 days)?
  isDownloading: boolean;      // Currently downloading?
  lastUpdated: string | null;  // When was data last refreshed?
  totalCards: number;          // Number of cards in database
  version: string | null;      // MTGJSON version
  downloadProgress: number;    // 0-100 download percentage
  downloadStage: string;       // Current operation stage
  error: string | null;        // Error message if any
}
```

### Progress Tracking
The component integrates with `mtgjsonInitService` to track download progress:
```tsx
const progressHandler = (progress) => {
  setStatus(prev => ({
    ...prev,
    isDownloading: progress.stage !== 'complete',
    downloadProgress: progress.progress,
    downloadStage: progress.stage,
    error: progress.stage === 'error' ? progress.error : null,
  }));
};

mtgjsonInitService.onProgress(progressHandler);
```

### Auto-Refresh
Automatically checks status every 30 seconds:
```tsx
useEffect(() => {
  loadStatus();
  const interval = setInterval(loadStatus, 30000);
  return () => clearInterval(interval);
}, []);
```

## Visual Design

### Color Coding
- 🟢 **Green**: System healthy, data up-to-date
- 🟡 **Yellow**: System working, update recommended  
- 🔵 **Blue**: System active, download in progress
- 🔴 **Red**: System error, attention needed
- ⚫ **Gray**: System inactive, setup required

### Responsive Layout
- **Desktop**: Full information with detailed stats
- **Mobile**: Compact layout with essential info
- **Compact Mode**: Single line with icon and status

### Progress Visualization
- **Progress Bar**: Visual representation of download progress
- **Stage Indicator**: Text description of current operation
- **Percentage**: Numeric progress (0-100%)

## User Experience

### Clear Status Communication
- **Immediate Understanding**: Color and icon convey status at a glance
- **Actionable Information**: Clear next steps for each state
- **Progress Feedback**: Real-time updates during long operations

### Non-Intrusive Monitoring
- **Automatic Updates**: Status refreshes without user intervention
- **Background Operations**: Downloads don't block UI interaction
- **Graceful Degradation**: Works even when MTGJSON is unavailable

### Smart Defaults
- **Auto-Initialization**: Prompts for setup when needed
- **Update Reminders**: Suggests updates for stale data
- **Error Recovery**: Clear instructions for resolving issues

## Benefits

### For Users
✅ **Transparency**: Always know the status of historical price data
✅ **Control**: Easy access to database management functions  
✅ **Confidence**: Visual confirmation that real data is available
✅ **Convenience**: One-click initialization and updates

### For Developers
✅ **Monitoring**: Easy to track system health and usage
✅ **Debugging**: Clear error states and diagnostic information
✅ **Maintenance**: Automated status checking and user guidance
✅ **Integration**: Reusable component for multiple contexts

## Future Enhancements

### Planned Features
- **Health Scores**: Numeric rating of database health
- **Usage Statistics**: Track how often historical data is accessed
- **Automatic Updates**: Scheduled background data refreshes
- **Advanced Diagnostics**: Detailed system health reporting

### Integration Opportunities
- **Navigation Bar**: Mini status indicator in global navigation
- **Portfolio Pages**: Data quality indicators on charts
- **Card Modals**: Historical data availability badges
- **Analytics Dashboard**: Data source quality metrics

The Database Status Component provides essential visibility into the MTGJSON integration, ensuring users always know whether they have access to real historical price data and can take action when needed.
