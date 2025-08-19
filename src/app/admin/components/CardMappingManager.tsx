'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Info,
  AlertTriangle,
  BarChart3,
  Search
} from 'lucide-react';
import { cardMappingService, type MappingStats } from '@/lib/services/cardMappingService';
import { allPrintingsStorage, type SetCardData } from '@/lib/utils/allPrintingsStorage';
import { mtgjsonInitService } from '@/lib/services/mtgjsonInitService';
import { runMTGJSONTests, testCardMappingForCard, quickHealthCheck } from '@/lib/utils/mtgjsonTestUtils';
import { runAllUnicodeTests } from '@/lib/utils/unicodeTestUtils';
import { cleanupLocalStorage, getLocalStorageUsage, emergencyCleanup, formatBytes, isQuotaExceeded } from '@/lib/storage';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export function CardMappingManager() {
  const [mappingStats, setMappingStats] = useState<MappingStats | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCardName, setTestCardName] = useState('Lightning Bolt');
  const [searchResults, setSearchResults] = useState<SetCardData[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [testReport, setTestReport] = useState<string>('');
  const [integrationTestResults, setIntegrationTestResults] = useState<any>(null);
  const [testTimestamp, setTestTimestamp] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [cleaningStorage, setCleaningStorage] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [mappings, storage, usage] = await Promise.all([
        cardMappingService.getMappingStats(),
        allPrintingsStorage.getStorageStats(),
        Promise.resolve(getLocalStorageUsage()),
      ]);
      
      setMappingStats(mappings);
      setStorageStats(storage);
      setStorageUsage(usage);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  };



  const handleClearMappingCache = async () => {
    if (!confirm('Clear all cached card mappings? This will require re-mapping cards.')) {
      return;
    }

    setLoading(true);
    try {
      await cardMappingService.clearMappingCache();
      await loadStats();
      console.log('Mapping cache cleared');
    } catch (err) {
      console.error('Failed to clear cache:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('Clear ALL MTGJSON data? This will require re-downloading the entire dataset.')) {
      return;
    }

    setLoading(true);
    try {
      await mtgjsonInitService.clearData();
      await loadStats();
      console.log('All MTGJSON data cleared');
    } catch (err) {
      console.error('Failed to clear data:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSearch = async () => {
    if (!testCardName.trim()) return;

    setTestLoading(true);
    setSearchResults([]);
    
    try {
      const results = await allPrintingsStorage.searchCards(testCardName, 10);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setTestLoading(false);
    }
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    setTestReport('');
    setIntegrationTestResults(null);
    
    try {
      console.log('Running MTGJSON integration tests...');
      const results = await runMTGJSONTests();
      
      // Store structured results for UI display
      setIntegrationTestResults(results);
      setTestTimestamp(new Date());
      
      // Generate a simple report for the text area (backup)
      const report = [
        'MTGJSON Integration Test Results',
        '================================',
        '',
        `Overall: ${results.overall.success ? 'PASSED ✅' : 'FAILED ❌'}`,
        `${results.overall.message}`,
        '',
        `Initialization: ${results.initialization.success ? '✅' : '❌'} ${results.initialization.message}`,
        `Card Mapping: ${results.cardMapping.success ? '✅' : '❌'} ${results.cardMapping.message}`,
        `Price History: ${results.priceHistory.success ? '✅' : '❌'} ${results.priceHistory.message}`,
        `Performance: ${results.performance.success ? '✅' : '❌'} ${results.performance.message}`,
        '',
      ];
      
      if (results.cardMapping.data) {
        report.push('Card Mapping Details:');
        results.cardMapping.data.results.forEach((result: any) => {
          report.push(`  ${result.card}: ${result.mapped ? '✅' : '❌'} ${result.error || ''}`);
        });
      }
      
      setTestReport(report.join('\n'));
    } catch (err) {
      console.error('Test execution failed:', err);
      setTestReport(`Test execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIntegrationTestResults(null);
    } finally {
      setRunningTests(false);
    }
  };

  const handleTestUnicode = () => {
    console.log('Running Unicode compatibility tests...');
    const result = runAllUnicodeTests();
    
    // Clear integration test results when running Unicode tests
    setIntegrationTestResults(null);
    
    if (result) {
      setTestReport('Unicode Compatibility Tests\n' + 
                   '==========================\n\n' +
                   '✅ All tests PASSED!\n' +
                   'The system can properly handle Unicode characters in card names.\n\n' +
                   'This means cards with special characters like:\n' +
                   '- Æther Vial\n' +
                   '- Lim-Dûl the Necromancer\n' +
                   '- Jötun Grunt\n' +
                   'Will be stored and retrieved correctly.\n\n' +
                   'Check browser console for detailed test results.');
    } else {
      setTestReport('Unicode Compatibility Tests\n' + 
                   '==========================\n\n' +
                   '❌ Some tests FAILED!\n' +
                   'There may be issues with Unicode character handling.\n\n' +
                   'Check browser console for detailed error information.\n' +
                   'The system will use fallback methods for problematic characters.');
    }
  };

  const handleCleanupStorage = async () => {
    if (!confirm('This will remove old localStorage data to free up space. Continue?')) {
      return;
    }

    setCleaningStorage(true);
    try {
      const result = cleanupLocalStorage();
      await loadStats(); // Refresh stats after cleanup
      
      setTestReport(`Storage Cleanup Results\n` +
                   `=====================\n\n` +
                   `✅ Cleanup completed successfully!\n\n` +
                   `Cleared ${result.clearedItems} items\n` +
                   `Freed approximately ${formatBytes(result.freedBytes)}\n` +
                   `Remaining keys: ${result.remainingKeys.length}\n\n` +
                   `You should now be able to initialize MTGJSON data.`);
    } catch (err) {
      console.error('Storage cleanup failed:', err);
      setError(err instanceof Error ? err.message : 'Storage cleanup failed');
    } finally {
      setCleaningStorage(false);
    }
  };

  const handleEmergencyCleanup = async () => {
    if (!confirm('EMERGENCY CLEANUP: This will remove ALL MTGJSON data and clear IndexedDB. This cannot be undone. Continue?')) {
      return;
    }

    if (!confirm('This is your final warning. ALL MTGJSON DATA WILL BE LOST. Continue?')) {
      return;
    }

    setCleaningStorage(true);
    try {
      emergencyCleanup();
      await loadStats();
      
      setTestReport(`Emergency Cleanup Complete\n` +
                   `=========================\n\n` +
                   `✅ Emergency cleanup completed!\n\n` +
                   `All MTGJSON-related data has been removed.\n` +
                   `localStorage quota should now be available.\n` +
                   `IndexedDB has been cleared.\n\n` +
                   `You can now initialize MTGJSON data fresh.`);
    } catch (err) {
      console.error('Emergency cleanup failed:', err);
      setError(err instanceof Error ? err.message : 'Emergency cleanup failed');
    } finally {
      setCleaningStorage(false);
    }
  };

  const formatBytesLocal = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMappingQualityColor = (stats: MappingStats) => {
    const directRatio = stats.totalMappings > 0 ? stats.directMatches / stats.totalMappings : 0;
    if (directRatio > 0.8) return 'text-green-600';
    if (directRatio > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Card Mapping & Testing</h2>
          <p className="text-muted-foreground">
            Manage card mappings, cache, and test MTGJSON integration
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AllPrintings Status */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium text-foreground">AllPrintings Data</h3>
          </div>
          {storageStats ? (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {storageStats.totalCards.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Cards in {storageStats.totalSets} sets
              </p>
              <p className="text-xs text-muted-foreground">
                v{storageStats.version}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-500">No Data</p>
              <p className="text-sm text-muted-foreground">Download required</p>
            </div>
          )}
        </div>

        {/* Mapping Stats */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <h3 className="font-medium text-foreground">Mappings</h3>
          </div>
          {mappingStats ? (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {mappingStats.totalMappings.toLocaleString()}
              </p>
              <p className={`text-sm ${getMappingQualityColor(mappingStats)}`}>
                {mappingStats.directMatches} direct matches
              </p>
              <p className="text-xs text-muted-foreground">
                {mappingStats.fuzzyMatches} fuzzy matches
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-muted-foreground">0</p>
              <p className="text-sm text-muted-foreground">No mappings cached</p>
            </div>
          )}
        </div>

        {/* Data Quality */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-purple-500" />
            <h3 className="font-medium text-foreground">Data Quality</h3>
          </div>
          {mappingStats && mappingStats.totalMappings > 0 ? (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {Math.round((mappingStats.directMatches / mappingStats.totalMappings) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Direct matches</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(mappingStats.directMatches / mappingStats.totalMappings) * 100}%`
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-muted-foreground">N/A</p>
              <p className="text-sm text-muted-foreground">No data</p>
            </div>
          )}
        </div>

        {/* Last Updated */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium text-foreground">Last Updated</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              {storageStats 
                ? new Date(storageStats.lastUpdated).toLocaleDateString()
                : 'Never'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {storageStats 
                ? new Date(storageStats.lastUpdated).toLocaleTimeString()
                : 'No data available'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Integration Test Results */}
      {integrationTestResults && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Integration Test Results</h3>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                integrationTestResults.overall.success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {integrationTestResults.overall.success ? 'PASSED' : 'FAILED'}
              </div>
              <button
                onClick={() => {
                  setIntegrationTestResults(null);
                  setTestReport('');
                  setTestTimestamp(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Clear results"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Overall Summary */}
          <div className="mb-6 p-4 bg-accent rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Overall Result</p>
              {testTimestamp && (
                <p className="text-xs text-muted-foreground">
                  Run at {testTimestamp.toLocaleTimeString()}
                </p>
              )}
            </div>
            <p className="font-medium text-foreground">{integrationTestResults.overall.message}</p>
            {integrationTestResults.overall.data && (
              <div className="mt-2 text-sm text-muted-foreground">
                Success Rate: {integrationTestResults.overall.data.successRate?.toFixed(1)}% 
                ({integrationTestResults.overall.data.successCount}/{integrationTestResults.overall.data.totalTests} tests passed)
              </div>
            )}
          </div>

          {/* Individual Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Initialization Test */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {integrationTestResults.initialization.success ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <h4 className="font-medium text-foreground">Initialization</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{integrationTestResults.initialization.message}</p>
              {integrationTestResults.initialization.duration && (
                <p className="text-xs text-muted-foreground">Duration: {integrationTestResults.initialization.duration.toFixed(0)}ms</p>
              )}
              {integrationTestResults.initialization.data && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Cards: {integrationTestResults.initialization.data.totalCards?.toLocaleString()}</p>
                  <p>Version: {integrationTestResults.initialization.data.version}</p>
                </div>
              )}
            </div>

            {/* Card Mapping Test */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {integrationTestResults.cardMapping.success ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <h4 className="font-medium text-foreground">Card Mapping</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{integrationTestResults.cardMapping.message}</p>
              {integrationTestResults.cardMapping.duration && (
                <p className="text-xs text-muted-foreground">Duration: {integrationTestResults.cardMapping.duration.toFixed(0)}ms</p>
              )}
              {integrationTestResults.cardMapping.data && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    Success Rate: {integrationTestResults.cardMapping.data.successRate?.toFixed(1)}%
                  </div>
                  <div className="max-h-20 overflow-y-auto">
                    {integrationTestResults.cardMapping.data.results?.map((result: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        {result.mapped ? 
                          <CheckCircle className="h-3 w-3 text-green-500" /> : 
                          <XCircle className="h-3 w-3 text-red-500" />
                        }
                        <span className={result.mapped ? 'text-green-700' : 'text-red-700'}>
                          {result.card}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price History Test */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {integrationTestResults.priceHistory.success ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <h4 className="font-medium text-foreground">Price History</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{integrationTestResults.priceHistory.message}</p>
              {integrationTestResults.priceHistory.duration && (
                <p className="text-xs text-muted-foreground">Duration: {integrationTestResults.priceHistory.duration.toFixed(0)}ms</p>
              )}
              {integrationTestResults.priceHistory.data && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Card: {integrationTestResults.priceHistory.data.card}</p>
                  <p>Price Points: {integrationTestResults.priceHistory.data.pricePoints}</p>
                  <p>Data Source: {integrationTestResults.priceHistory.data.hasRealData ? 'Real' : 'Simulated'}</p>
                  <p>Provider: {integrationTestResults.priceHistory.data.provider}</p>
                </div>
              )}
            </div>

            {/* Performance Test */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {integrationTestResults.performance.success ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <h4 className="font-medium text-foreground">Performance</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{integrationTestResults.performance.message}</p>
              {integrationTestResults.performance.duration && (
                <p className="text-xs text-muted-foreground">Duration: {integrationTestResults.performance.duration.toFixed(0)}ms</p>
              )}
              {integrationTestResults.performance.data && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    Average: {integrationTestResults.performance.data.averageTime?.toFixed(0)}ms
                  </div>
                  <div className="max-h-20 overflow-y-auto">
                    {integrationTestResults.performance.data.tests?.map((test: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{test.test}</span>
                        <span className={test.time < test.threshold ? 'text-green-700' : 'text-red-700'}>
                          {test.time.toFixed(0)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw Results (Collapsible) */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Show Raw Test Results
            </summary>
            <pre className="mt-2 text-xs text-foreground bg-accent p-4 rounded-lg overflow-auto max-h-64 font-mono">
              {JSON.stringify(integrationTestResults, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Fallback Text Results (for other tests like Unicode) */}
      {testReport && !integrationTestResults && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Test Results</h3>
          <pre className="text-sm text-foreground bg-accent p-4 rounded-lg overflow-auto max-h-64 font-mono">
            {testReport}
          </pre>
        </div>
      )}

      {/* Storage Management Section */}
      {storageUsage && (storageUsage.quotaExceeded || storageUsage.estimatedSize > 5 * 1024 * 1024) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-red-700">Storage Quota Issue Detected</h3>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-red-600">Storage Usage:</p>
                <p className="font-medium">{formatBytesLocal(storageUsage.estimatedSize)}</p>
              </div>
              <div>
                <p className="text-red-600">Total Keys:</p>
                <p className="font-medium">{storageUsage.totalKeys}</p>
              </div>
            </div>
            
            {storageUsage.quotaExceeded && (
              <div className="bg-red-100 border border-red-300 rounded p-3">
                <p className="text-sm text-red-700">
                  ⚠️ localStorage quota exceeded! This will prevent MTGJSON data storage.
                </p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handleCleanupStorage}
                disabled={cleaningStorage}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {cleaningStorage ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
                <span>Clean Storage</span>
              </button>
              
              <button
                onClick={handleEmergencyCleanup}
                disabled={cleaningStorage}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cleaningStorage ? <LoadingSpinner /> : <AlertTriangle className="h-4 w-4" />}
                <span>Emergency Cleanup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cache Management */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cache Management</h3>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Manage card mapping cache and cached data.
            </p>
            
            <button
              onClick={handleClearMappingCache}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Clear Mapping Cache</span>
            </button>

            <button
              onClick={handleClearAllData}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All MTGJSON Data</span>
            </button>

            {!storageStats && (
              <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">No MTGJSON data found - initialize data first</span>
              </div>
            )}
          </div>
        </div>

        {/* Integration Tests */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Integration Tests</h3>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Run comprehensive tests to verify MTGJSON integration is working correctly.
            </p>
            
            <button
              onClick={handleRunTests}
              disabled={runningTests || !storageStats}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {runningTests ? (
                <>
                  <LoadingSpinner />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Run Integration Tests</span>
                </>
              )}
            </button>

            <button
              onClick={handleTestUnicode}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Test Unicode Support</span>
            </button>

            {!storageStats && (
              <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Initialize MTGJSON data first</span>
              </div>
            )}
          </div>
        </div>

        {/* Test Search */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Test Card Search</h3>
          
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={testCardName}
                onChange={(e) => setTestCardName(e.target.value)}
                placeholder="Enter card name..."
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
              />
              <button
                onClick={handleTestSearch}
                disabled={testLoading || !storageStats}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {testLoading ? <LoadingSpinner /> : <Search className="h-4 w-4" />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                {searchResults.map((card, index) => (
                  <div key={index} className="p-2 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{card.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {card.setCode} #{card.number} • {card.rarity}
                        </p>
                      </div>
                      {card.identifiers?.scryfallId && (
                        <div className="text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          Mapped
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!storageStats && (
              <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Initialize MTGJSON data to test search</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
