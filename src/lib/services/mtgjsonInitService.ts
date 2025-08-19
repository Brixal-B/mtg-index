/**
 * MTGJSON Initialization Service
 * Handles the setup and initialization of MTGJSON data
 */

import { cardMappingService } from './cardMappingService';
import { allPrintingsStorage } from '@/lib/utils/allPrintingsStorage';

interface InitializationProgress {
  stage: 'checking' | 'downloading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

interface InitializationResult {
  success: boolean;
  message: string;
  stats?: {
    totalCards: number;
    totalSets: number;
    version: string;
    dataSize: string;
  };
  error?: string;
}

class MTGJSONInitService {
  private initializationPromise: Promise<InitializationResult> | null = null;
  private progressCallbacks: ((progress: InitializationProgress) => void)[] = [];

  /**
   * Check if MTGJSON data is available and fresh
   */
  async isInitialized(): Promise<boolean> {
    try {
      // Check if AllPrintings data is available
      const isAllPrintingsAvailable = await allPrintingsStorage.isDataAvailable();
      
      if (!isAllPrintingsAvailable) {
        return false;
      }

      // Check if we have some cached mappings
      const mappingStats = await cardMappingService.getMappingStats();
      
      // Consider initialized if we have data and at least some mappings
      return mappingStats.totalMappings > 0;
    } catch (error) {
      console.error('Error checking initialization status:', error);
      return false;
    }
  }

  /**
   * Initialize MTGJSON data with progress tracking
   */
  async initialize(forceRefresh = false): Promise<InitializationResult> {
    // Return existing initialization if in progress
    if (this.initializationPromise && !forceRefresh) {
      return this.initializationPromise;
    }

    // Check if already initialized and not forcing refresh
    if (!forceRefresh) {
      const isAlreadyInit = await this.isInitialized();
      if (isAlreadyInit) {
        const stats = await this.getInitializationStats();
        return {
          success: true,
          message: 'MTGJSON data already initialized',
          stats: stats ? {
            totalCards: stats.totalCards,
            totalSets: stats.totalSets,
            version: stats.version,
            dataSize: stats.dataSize,
          } : undefined,
        };
      }
    }

    // Start initialization process
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Add progress callback
   */
  onProgress(callback: (progress: InitializationProgress) => void) {
    this.progressCallbacks.push(callback);
  }

  /**
   * Remove progress callback
   */
  offProgress(callback: (progress: InitializationProgress) => void) {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current initialization statistics
   */
  async getInitializationStats() {
    try {
      const storageStats = await allPrintingsStorage.getStorageStats();
      const mappingStats = await cardMappingService.getMappingStats();

      if (!storageStats) {
        return null;
      }

      return {
        totalCards: storageStats.totalCards,
        totalSets: storageStats.totalSets,
        version: storageStats.version,
        dataSize: this.formatBytes(storageStats.totalCards * 100), // Rough estimate
        mappings: mappingStats.totalMappings,
        directMatches: mappingStats.directMatches,
        lastUpdated: storageStats.lastUpdated,
      };
    } catch (error) {
      console.error('Error getting initialization stats:', error);
      return null;
    }
  }

  /**
   * Clear all MTGJSON data
   */
  async clearData(): Promise<void> {
    try {
      this.updateProgress({
        stage: 'processing',
        progress: 0,
        message: 'Clearing MTGJSON data...',
      });

      await Promise.all([
        allPrintingsStorage.clearAllData(),
        cardMappingService.clearMappingCache(),
      ]);

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'MTGJSON data cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing MTGJSON data:', error);
      throw error;
    }
  }

  // Private methods

  private async performInitialization(): Promise<InitializationResult> {
    try {
      this.updateProgress({
        stage: 'checking',
        progress: 0,
        message: 'Checking MTGJSON data availability...',
      });

      // Step 1: Check if AllPrintings data needs to be downloaded
      const isDataAvailable = await allPrintingsStorage.isDataAvailable();
      
      if (!isDataAvailable) {
        this.updateProgress({
          stage: 'downloading',
          progress: 10,
          message: 'Downloading AllPrintings.json from MTGJSON...',
        });

        await this.downloadAllPrintings();
      } else {
        this.updateProgress({
          stage: 'checking',
          progress: 50,
          message: 'AllPrintings data found, verifying integrity...',
        });
      }

      // Step 2: Initialize card mapping service
      this.updateProgress({
        stage: 'processing',
        progress: 70,
        message: 'Initializing card mapping service...',
      });

      await cardMappingService.initialize();

      // Step 3: Verify everything is working
      this.updateProgress({
        stage: 'processing',
        progress: 90,
        message: 'Verifying MTGJSON integration...',
      });

      const stats = await this.getInitializationStats();

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'MTGJSON initialization complete!',
      });

      return {
        success: true,
        message: 'MTGJSON data initialized successfully',
        stats: stats ? {
          totalCards: stats.totalCards,
          totalSets: stats.totalSets,
          version: stats.version,
          dataSize: stats.dataSize,
        } : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: 'Initialization failed',
        error: errorMessage,
      });

      return {
        success: false,
        message: 'Failed to initialize MTGJSON data',
        error: errorMessage,
      };
    } finally {
      this.initializationPromise = null;
    }
  }

  private async downloadAllPrintings(): Promise<void> {
    try {
      // Download AllPrintings.json
      const response = await fetch('https://mtgjson.com/api/v5/AllPrintings.json');
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      this.updateProgress({
        stage: 'downloading',
        progress: 30,
        message: 'Parsing AllPrintings data...',
      });

      const data = await response.json();

      this.updateProgress({
        stage: 'processing',
        progress: 50,
        message: 'Storing AllPrintings data...',
      });

      await allPrintingsStorage.storeAllPrintings(data);

      this.updateProgress({
        stage: 'processing',
        progress: 65,
        message: 'AllPrintings data stored successfully',
      });
    } catch (error) {
      console.error('Error downloading AllPrintings:', error);
      throw new Error(`Failed to download AllPrintings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private updateProgress(progress: InitializationProgress) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const mtgjsonInitService = new MTGJSONInitService();

// Export types
export type { InitializationProgress, InitializationResult };
