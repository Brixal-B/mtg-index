import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  FAVORITES: '@mtg_index:favorites',
  SEARCH_HISTORY: '@mtg_index:search_history',
  USER_PREFERENCES: '@mtg_index:preferences',
} as const;

export class StorageService {
  // Favorites management
  static async getFavorites(): Promise<string[]> {
    try {
      const favorites = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }

  static async addFavorite(cardId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      if (!favorites.includes(cardId)) {
        favorites.push(cardId);
        await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  }

  static async removeFavorite(cardId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(id => id !== cardId);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  static async isFavorite(cardId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.includes(cardId);
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  // Search history management
  static async getSearchHistory(): Promise<string[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  static async addSearchTerm(term: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const updatedHistory = [term, ...history.filter(t => t !== term)].slice(0, 20); // Keep last 20 searches
      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error adding search term:', error);
    }
  }

  static async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // User preferences
  static async getPreferences(): Promise<any> {
    try {
      const preferences = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return preferences ? JSON.parse(preferences) : {};
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {};
    }
  }

  static async setPreferences(preferences: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error setting preferences:', error);
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}

export default StorageService;