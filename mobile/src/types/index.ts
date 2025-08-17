// Common types for the MTG Index Mobile app

export interface Card {
  id: string;
  name: string;
  manaCost?: string;
  cmc?: number;
  type: string;
  rarity: string;
  set: string;
  setName: string;
  text?: string;
  power?: string;
  toughness?: string;
  imageUrl?: string;
}

export interface Set {
  code: string;
  name: string;
  releaseDate: string;
  type: string;
  cardCount: number;
}

export interface SearchFilters {
  name?: string;
  type?: string;
  rarity?: string;
  set?: string;
  colors?: string[];
  cmc?: number;
}

export interface AppState {
  cards: Card[];
  sets: Set[];
  favorites: string[];
  searchHistory: string[];
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  CardDetail: { cardId: string };
  Favorites: undefined;
  Settings: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Settings: undefined;
};