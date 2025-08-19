/**
 * Storage cleanup utilities for handling localStorage quota issues
 */

/**
 * Clean up localStorage data that might be causing quota issues
 */
export function cleanupLocalStorage(): {
  clearedItems: number;
  freedBytes: number;
  remainingKeys: string[];
} {
  const clearedItems: string[] = [];
  let freedBytes = 0;
  
  console.log('Starting localStorage cleanup...');
  
  try {
    // Get all keys before starting cleanup
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    console.log(`Found ${allKeys.length} localStorage keys`);
    
    // Clean up MTGJSON-related chunks that might be taking up space
    const chunkKeys = allKeys.filter(key => key.startsWith('chunk-'));
    chunkKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          freedBytes += value.length * 2; // Rough estimate (UTF-16)
          localStorage.removeItem(key);
          clearedItems.push(key);
        }
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error);
      }
    });
    
    // Clean up other large data that might be problematic
    const largeDataKeys = [
      'allprintings-metadata',
      'mtgjson-all-prices-data',
      'mtgjson-allprintings-cache'
    ];
    
    largeDataKeys.forEach(key => {
      if (allKeys.includes(key)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            freedBytes += value.length * 2;
            localStorage.removeItem(key);
            clearedItems.push(key);
          }
        } catch (error) {
          console.error(`Failed to remove ${key}:`, error);
        }
      }
    });
    
    // Get remaining keys
    const remainingKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) remainingKeys.push(key);
    }
    
    const result = {
      clearedItems: clearedItems.length,
      freedBytes,
      remainingKeys
    };
    
    console.log(`Cleanup complete:`, result);
    console.log(`Freed approximately ${(freedBytes / 1024 / 1024).toFixed(2)} MB`);
    
    return result;
  } catch (error) {
    console.error('Error during localStorage cleanup:', error);
    return {
      clearedItems: clearedItems.length,
      freedBytes,
      remainingKeys: []
    };
  }
}

/**
 * Get localStorage usage information
 */
export function getLocalStorageUsage(): {
  totalKeys: number;
  estimatedSize: number;
  largestKeys: Array<{ key: string; size: number }>;
  quotaExceeded: boolean;
} {
  const keyInfo: Array<{ key: string; size: number }> = [];
  let totalSize = 0;
  let quotaExceeded = false;
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = value.length * 2; // Rough UTF-16 estimate
        keyInfo.push({ key, size });
        totalSize += size;
      }
    }
    
    // Test if we can write to localStorage
    try {
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
    } catch (error) {
      quotaExceeded = true;
    }
    
    // Sort by size descending
    keyInfo.sort((a, b) => b.size - a.size);
    
    return {
      totalKeys: keyInfo.length,
      estimatedSize: totalSize,
      largestKeys: keyInfo.slice(0, 10), // Top 10 largest
      quotaExceeded
    };
  } catch (error) {
    console.error('Error getting localStorage usage:', error);
    return {
      totalKeys: 0,
      estimatedSize: 0,
      largestKeys: [],
      quotaExceeded: true
    };
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Emergency cleanup - removes all MTGJSON related data
 */
export function emergencyCleanup(): void {
  console.warn('Performing emergency storage cleanup...');
  
  try {
    const keysToRemove: string[] = [];
    
    // Collect all keys that might be MTGJSON related
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('chunk-') ||
        key.startsWith('mtgjson-') ||
        key.includes('allprintings') ||
        key.includes('card-mappings')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all identified keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error);
      }
    });
    
    console.log(`Emergency cleanup removed ${keysToRemove.length} items`);
    
    // Also try to clear IndexedDB
    try {
      const deleteReq = indexedDB.deleteDatabase('MTGJSONStorage');
      deleteReq.onsuccess = () => console.log('IndexedDB cleared');
      deleteReq.onerror = () => console.error('Failed to clear IndexedDB');
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }
    
  } catch (error) {
    console.error('Emergency cleanup failed:', error);
  }
}

/**
 * Check if localStorage quota is likely exceeded
 */
export function isQuotaExceeded(): boolean {
  try {
    const testKey = '__quota_test__';
    const testValue = 'x'.repeat(1024); // 1KB test
    localStorage.setItem(testKey, testValue);
    localStorage.removeItem(testKey);
    return false;
  } catch (error) {
    return true;
  }
}
