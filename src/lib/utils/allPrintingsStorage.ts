/**
 * Optimized storage solution for MTGJSON AllPrintings.json data
 * Handles the large (~200MB) dataset efficiently using IndexedDB with compression
 */

import { mtgjsonCache } from './mtgjsonCache';

interface CompressedChunk {
  id: string;
  setCode: string;
  compressedData: string;
  uncompressedSize: number;
  cardCount: number;
  lastUpdated: string;
}

interface AllPrintingsMetadata {
  version: string;
  date: string;
  totalSets: number;
  totalCards: number;
  chunks: string[];
  lastUpdated: string;
}

interface SetCardData {
  uuid: string;
  name: string;
  setCode: string;
  number: string;
  rarity: string;
  identifiers?: {
    scryfallId?: string;
    multiverseId?: number;
  };
}

class AllPrintingsStorage {
  private readonly CHUNK_SIZE = 50; // Cards per chunk
  private readonly METADATA_KEY = 'allprintings-metadata';
  private readonly CHUNK_PREFIX = 'chunk-';

  /**
   * Store AllPrintings data in compressed chunks
   */
  async storeAllPrintings(allPrintingsData: any): Promise<void> {
    console.log('Starting AllPrintings storage process...');
    
    try {
      const metadata: AllPrintingsMetadata = {
        version: allPrintingsData.meta.version,
        date: allPrintingsData.meta.date,
        totalSets: 0,
        totalCards: 0,
        chunks: [],
        lastUpdated: new Date().toISOString(),
      };

      const chunks: CompressedChunk[] = [];
      
      // Process each set
      for (const [setCode, setData] of Object.entries(allPrintingsData.data as Record<string, any>)) {
        const cards = setData.cards || [];
        metadata.totalSets++;
        metadata.totalCards += cards.length;

        // Split large sets into chunks
        for (let i = 0; i < cards.length; i += this.CHUNK_SIZE) {
          const chunkCards = cards.slice(i, i + this.CHUNK_SIZE);
          const chunkId = `${setCode}-${Math.floor(i / this.CHUNK_SIZE)}`;
          
          // Extract only necessary data for mapping
          const optimizedCards: SetCardData[] = chunkCards.map((card: any) => ({
            uuid: card.uuid,
            name: card.name,
            setCode: card.setCode || setCode,
            number: card.number,
            rarity: card.rarity,
            identifiers: card.identifiers ? {
              scryfallId: card.identifiers.scryfallId,
              multiverseId: card.identifiers.multiverseId,
            } : undefined,
          }));

          // Compress the data
          const compressed = await this.compressData(optimizedCards);
          
          const chunk: CompressedChunk = {
            id: chunkId,
            setCode,
            compressedData: compressed,
            uncompressedSize: JSON.stringify(optimizedCards).length,
            cardCount: optimizedCards.length,
            lastUpdated: new Date().toISOString(),
          };

          chunks.push(chunk);
          metadata.chunks.push(chunkId);
        }
      }

      // Store chunks in batches to avoid overwhelming IndexedDB
      console.log(`Storing ${chunks.length} chunks...`);
      await this.storeChunksInBatches(chunks);
      
      // Store metadata
      await this.storeMetadata(metadata);
      
      console.log(`Successfully stored AllPrintings data: ${metadata.totalCards} cards in ${metadata.totalSets} sets`);
    } catch (error) {
      console.error('Failed to store AllPrintings data:', error);
      
      // Clean up any partially stored data on failure
      try {
        await this.clearAllData();
        console.log('Cleaned up partially stored data due to error');
      } catch (cleanupError) {
        console.error('Failed to cleanup after storage error:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Retrieve specific set data
   */
  async getSetData(setCode: string): Promise<SetCardData[]> {
    try {
      const metadata = await this.getMetadata();
      if (!metadata) {
        throw new Error('AllPrintings metadata not found');
      }

      const setChunks = metadata.chunks.filter(chunkId => chunkId.startsWith(setCode));
      const cards: SetCardData[] = [];

      for (const chunkId of setChunks) {
        const chunk = await this.getChunk(chunkId);
        if (chunk) {
          const decompressed = await this.decompressData(chunk.compressedData);
          cards.push(...decompressed);
        }
      }

      return cards;
    } catch (error) {
      console.error(`Failed to get set data for ${setCode}:`, error);
      return [];
    }
  }

  /**
   * Search for cards across all sets
   */
  async searchCards(searchTerm: string, maxResults = 50): Promise<SetCardData[]> {
    try {
      const metadata = await this.getMetadata();
      if (!metadata) return [];

      const results: SetCardData[] = [];
      const normalizedSearch = searchTerm.toLowerCase();

      // Search through chunks until we have enough results
      for (const chunkId of metadata.chunks) {
        if (results.length >= maxResults) break;

        const chunk = await this.getChunk(chunkId);
        if (!chunk) continue;

        const cards = await this.decompressData(chunk.compressedData);
        
        for (const card of cards) {
          if (results.length >= maxResults) break;
          
          if (card.name.toLowerCase().includes(normalizedSearch)) {
            results.push(card);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search cards:', error);
      return [];
    }
  }

  /**
   * Find card by Scryfall ID
   */
  async findCardByScryfallId(scryfallId: string): Promise<SetCardData | null> {
    try {
      const metadata = await this.getMetadata();
      if (!metadata) return null;

      // Search through all chunks
      for (const chunkId of metadata.chunks) {
        const chunk = await this.getChunk(chunkId);
        if (!chunk) continue;

        const cards = await this.decompressData(chunk.compressedData);
        
        for (const card of cards) {
          if (card.identifiers?.scryfallId === scryfallId) {
            return card;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find card by Scryfall ID:', error);
      return null;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSets: number;
    totalCards: number;
    totalChunks: number;
    lastUpdated: string;
    version: string;
  } | null> {
    try {
      const metadata = await this.getMetadata();
      if (!metadata) return null;

      return {
        totalSets: metadata.totalSets,
        totalCards: metadata.totalCards,
        totalChunks: metadata.chunks.length,
        lastUpdated: metadata.lastUpdated,
        version: metadata.version,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear IndexedDB data
      const metadata = await this.getMetadata();
      if (metadata) {
        // Remove all chunks
        for (const chunkId of metadata.chunks) {
          await this.removeChunk(chunkId);
        }
      }

      // Remove metadata
      await this.removeMetadata();
      
      // Also clear any old localStorage data from previous versions
      this.clearLegacyLocalStorageData();
      
      console.log('All AllPrintings data cleared');
    } catch (error) {
      console.error('Failed to clear AllPrintings data:', error);
      throw error;
    }
  }

  /**
   * Clear legacy localStorage data from previous versions
   */
  private clearLegacyLocalStorageData(): void {
    try {
      // Clear old metadata
      localStorage.removeItem('allprintings-metadata');
      
      // Clear old chunks (scan for chunk- prefixed keys)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chunk-')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`Cleared ${keysToRemove.length} legacy localStorage chunks`);
      }
    } catch (error) {
      console.error('Failed to clear legacy localStorage data:', error);
    }
  }

  /**
   * Check if data exists and is fresh
   */
  async isDataAvailable(): Promise<boolean> {
    try {
      const metadata = await this.getMetadata();
      if (!metadata) return false;

      // Check if data is less than 7 days old
      const dataAge = Date.now() - new Date(metadata.lastUpdated).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      return dataAge < maxAge;
    } catch (error) {
      console.error('Failed to check data availability:', error);
      return false;
    }
  }

  // Private helper methods

  private async compressData(data: SetCardData[]): Promise<string> {
    try {
      // Simple compression using JSON stringify with reduced precision
      const jsonString = JSON.stringify(data);
      
      // Basic compression by removing unnecessary whitespace and using shorter keys
      const compressed = jsonString
        .replace(/\s+/g, '')
        .replace(/"uuid":/g, '"u":')
        .replace(/"name":/g, '"n":')
        .replace(/"setCode":/g, '"s":')
        .replace(/"number":/g, '"#":')
        .replace(/"rarity":/g, '"r":')
        .replace(/"identifiers":/g, '"i":')
        .replace(/"scryfallId":/g, '"si":')
        .replace(/"multiverseId":/g, '"mi":');

      // Try different encoding approaches
      try {
        // Method 1: Use TextEncoder for proper Unicode handling
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(compressed);
        
        // Convert to base64 using proper binary handling
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        
        return btoa(binaryString);
      } catch (encodingError) {
        console.warn('TextEncoder method failed, trying fallback:', encodingError);
        
        // Method 2: Fallback - escape Unicode characters first
        const escapedCompressed = compressed.replace(/[\u0080-\uFFFF]/g, (match) => {
          return '\\u' + ('0000' + match.charCodeAt(0).toString(16)).substr(-4);
        });
        
        return btoa(escapedCompressed);
      }
    } catch (error) {
      console.error('Failed to compress data with all methods:', error);
      
      // Method 3: Last resort - store uncompressed but with key shortening
      const jsonString = JSON.stringify(data);
      const shortened = jsonString
        .replace(/"uuid":/g, '"u":')
        .replace(/"name":/g, '"n":')
        .replace(/"setCode":/g, '"s":')
        .replace(/"number":/g, '"#":')
        .replace(/"rarity":/g, '"r":');
      
      // Mark as uncompressed with a prefix
      return 'UNCOMPRESSED:' + shortened;
    }
  }

  private async decompressData(compressedData: string): Promise<SetCardData[]> {
    try {
      let decoded: string;
      
      // Check if data is uncompressed (fallback method)
      if (compressedData.startsWith('UNCOMPRESSED:')) {
        decoded = compressedData.substring('UNCOMPRESSED:'.length);
      } else {
        // Try different decoding approaches
        try {
          // Method 1: Use TextDecoder for proper Unicode handling
          const binaryString = atob(compressedData);
          
          // Convert binary string back to Uint8Array
          const uint8Array = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }
          
          // Use TextDecoder to handle Unicode characters properly
          const decoder = new TextDecoder();
          decoded = decoder.decode(uint8Array);
        } catch (decodingError) {
          console.warn('TextDecoder method failed, trying fallback:', decodingError);
          
          // Method 2: Fallback - simple atob and unescape Unicode
          decoded = atob(compressedData);
          
          // Unescape Unicode characters
          decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
        }
      }
      
      // Expand the shortened keys back to original
      const expanded = decoded
        .replace(/"u":/g, '"uuid":')
        .replace(/"n":/g, '"name":')
        .replace(/"s":/g, '"setCode":')
        .replace(/"#":/g, '"number":')
        .replace(/"r":/g, '"rarity":')
        .replace(/"i":/g, '"identifiers":')
        .replace(/"si":/g, '"scryfallId":')
        .replace(/"mi":/g, '"multiverseId":');

      return JSON.parse(expanded);
    } catch (error) {
      console.error('Failed to decompress data with all methods:', error);
      throw error;
    }
  }

  private async storeChunksInBatches(chunks: CompressedChunk[]): Promise<void> {
    const batchSize = 10;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(chunk => this.storeChunk(chunk));
      await Promise.all(batchPromises);
      
      // Small delay to avoid overwhelming IndexedDB
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Progress logging
      if (i % 100 === 0) {
        console.log(`Stored ${Math.min(i + batchSize, chunks.length)} / ${chunks.length} chunks`);
      }
    }
  }

  private async storeChunk(chunk: CompressedChunk): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['chunks'], 'readwrite');
        const store = transaction.objectStore('chunks');
        
        const request = store.put(chunk, chunk.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Failed to store chunk ${chunk.id}:`, error);
        reject(error);
      }
    });
  }

  private async getChunk(chunkId: string): Promise<CompressedChunk | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');
        
        const request = store.get(chunkId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Failed to get chunk ${chunkId}:`, error);
        resolve(null);
      }
    });
  }

  private async removeChunk(chunkId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['chunks'], 'readwrite');
        const store = transaction.objectStore('chunks');
        
        const request = store.delete(chunkId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error(`Failed to remove chunk ${chunkId}:`, error);
        resolve(); // Don't fail the entire operation for cleanup errors
      }
    });
  }

  private async storeMetadata(metadata: AllPrintingsMetadata): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        
        const request = store.put(metadata, 'allprintings-metadata');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error('Failed to store metadata:', error);
        reject(error);
      }
    });
  }

  private async getMetadata(): Promise<AllPrintingsMetadata | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        
        const request = store.get('allprintings-metadata');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error('Failed to get metadata:', error);
        resolve(null);
      }
    });
  }

  private async removeMetadata(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        
        const request = store.delete('allprintings-metadata');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error('Failed to remove metadata:', error);
        resolve(); // Don't fail for cleanup errors
      }
    });
  }

  // IndexedDB helper methods
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openIndexedDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('MTGJSONStorage', 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks');
        }
        
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      };
    });

    return this.dbPromise;
  }
}

// Export singleton instance
export const allPrintingsStorage = new AllPrintingsStorage();

// Export types
export type { SetCardData, AllPrintingsMetadata };
