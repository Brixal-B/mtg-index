// Scryfall API Response Types
export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  legalities: Record<string, string>;
  games: string[];
  reserved: boolean;
  foil: boolean;
  nonfoil: boolean;
  finishes: string[];
  oversized: boolean;
  promo: boolean;
  reprint: boolean;
  variation: boolean;
  set_id: string;
  set: string;
  set_name: string;
  set_type: string;
  set_uri: string;
  set_search_uri: string;
  scryfall_set_uri: string;
  rulings_uri: string;
  prints_search_uri: string;
  collector_number: string;
  digital: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';
  card_back_id?: string;
  artist?: string;
  artist_ids?: string[];
  illustration_id?: string;
  border_color: string;
  frame: string;
  security_stamp?: string;
  full_art: boolean;
  textless: boolean;
  booster: boolean;
  story_spotlight: boolean;
  edhrec_rank?: number;
  penny_rank?: number;
  prices: ScryfallPrices;
  related_uris: Record<string, string>;
  purchase_uris?: Record<string, string>;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  produced_mana?: string[];
  loyalty?: string;
  life_modifier?: string;
  hand_modifier?: string;
  color_indicator?: string[];
  all_parts?: ScryfallRelatedCard[];
  preview?: ScryfallPreview;
}

export interface ScryfallPrices {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
  eur?: string | null;
  eur_foil?: string | null;
  tix?: string | null;
}

export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface ScryfallCardFace {
  artist?: string;
  artist_id?: string;
  cmc?: number;
  color_indicator?: string[];
  colors?: string[];
  flavor_text?: string;
  illustration_id?: string;
  image_uris?: ScryfallImageUris;
  layout?: string;
  loyalty?: string;
  mana_cost: string;
  name: string;
  object: string;
  oracle_text?: string;
  power?: string;
  printed_name?: string;
  printed_text?: string;
  printed_type_line?: string;
  toughness?: string;
  type_line?: string;
  watermark?: string;
}

export interface ScryfallRelatedCard {
  id: string;
  object: string;
  component: string;
  name: string;
  type_line: string;
  uri: string;
}

export interface ScryfallPreview {
  source: string;
  source_uri: string;
  previewed_at: string;
}

// Scryfall API Search Response
export interface ScryfallSearchResponse {
  object: 'list';
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
  warnings?: string[];
}

// Scryfall API Error Response
export interface ScryfallError {
  object: 'error';
  code: string;
  status: number;
  warnings?: string[];
  details: string;
}

// Search Parameters
export interface ScryfallSearchParams {
  q: string; // Search query
  unique?: 'cards' | 'art' | 'prints'; // Strategy for omitting similar cards
  order?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'tix' | 'eur' | 'cmc' | 'power' | 'toughness' | 'edhrec' | 'penny' | 'artist' | 'review';
  dir?: 'auto' | 'asc' | 'desc'; // Sort direction
  include_extras?: boolean; // Include extra cards (tokens, etc.)
  include_multilingual?: boolean; // Include cards in other languages
  include_variations?: boolean; // Include variations of cards
  page?: number; // Page number (1-indexed)
  format?: 'json' | 'csv'; // Response format
}

// Utility type for converting Scryfall cards to our internal format
export interface ConvertedCard {
  id: string;
  name: string;
  manaCost?: string;
  convertedManaCost: number;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  set: string;
  setName: string;
  number?: string;
  artist?: string;
  power?: string;
  toughness?: string;
  text?: string;
  flavorText?: string;
  imageUrl?: string;
  colors: string[];
  colorIdentity: string[];
  legalities: Record<string, string>;
  prices: {
    usd?: number;
    usdFoil?: number;
    eur?: number;
    eurFoil?: number;
    tix?: number;
    lastUpdated: string;
  };
  scryfallId: string;
}

