import { Card, Set, SearchFilters } from '@/types';

// Base URL for MTG API (using Scryfall API as an example)
const BASE_URL = 'https://api.scryfall.com';

class MTGApiService {
  private async fetchData<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  async searchCards(query: string, page: number = 1): Promise<{ data: Card[]; has_more: boolean }> {
    const endpoint = `/cards/search?q=${encodeURIComponent(query)}&page=${page}`;
    const response = await this.fetchData<any>(endpoint);
    
    return {
      data: response.data?.map(this.transformCard) || [],
      has_more: response.has_more || false,
    };
  }

  async getCardById(id: string): Promise<Card> {
    const endpoint = `/cards/${id}`;
    const response = await this.fetchData<any>(endpoint);
    return this.transformCard(response);
  }

  async getRandomCard(): Promise<Card> {
    const endpoint = '/cards/random';
    const response = await this.fetchData<any>(endpoint);
    return this.transformCard(response);
  }

  async getSets(): Promise<Set[]> {
    const endpoint = '/sets';
    const response = await this.fetchData<any>(endpoint);
    return response.data?.map(this.transformSet) || [];
  }

  async getSetCards(setCode: string): Promise<Card[]> {
    const endpoint = `/cards/search?q=set:${setCode}`;
    const response = await this.fetchData<any>(endpoint);
    return response.data?.map(this.transformCard) || [];
  }

  private transformCard(apiCard: any): Card {
    return {
      id: apiCard.id,
      name: apiCard.name,
      manaCost: apiCard.mana_cost,
      cmc: apiCard.cmc,
      type: apiCard.type_line,
      rarity: apiCard.rarity,
      set: apiCard.set,
      setName: apiCard.set_name,
      text: apiCard.oracle_text,
      power: apiCard.power,
      toughness: apiCard.toughness,
      imageUrl: apiCard.image_uris?.normal || apiCard.card_faces?.[0]?.image_uris?.normal,
    };
  }

  private transformSet(apiSet: any): Set {
    return {
      code: apiSet.code,
      name: apiSet.name,
      releaseDate: apiSet.released_at,
      type: apiSet.set_type,
      cardCount: apiSet.card_count,
    };
  }
}

export const mtgApi = new MTGApiService();
export default mtgApi;