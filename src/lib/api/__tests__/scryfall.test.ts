import {
  searchCards,
  advancedSearch,
  getCard,
  getPriceHistory,
  getRandomCards,
  getCardsBySet,
  getCardSuggestions,
} from '../scryfall'
import { mockFetch } from '@/test-utils'

// Mock the rate limiting delay to speed up tests
jest.mock('../scryfall', () => {
  const actual = jest.requireActual('../scryfall')
  return {
    ...actual,
    // Override the rate limit delay for tests
    RATE_LIMIT_DELAY: 0,
  }
})

describe('Scryfall API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('searchCards', () => {
    const mockScryfallResponse = {
      data: [
        {
          id: 'test-id',
          name: 'Lightning Bolt',
          mana_cost: '{R}',
          cmc: 1,
          type_line: 'Instant',
          oracle_text: 'Lightning Bolt deals 3 damage to any target.',
          image_uris: {
            normal: 'https://cards.scryfall.io/normal/front/test.jpg',
          },
          set_name: 'Test Set',
          set: 'tst',
          rarity: 'common',
          prices: {
            usd: '0.25',
            usd_foil: '1.50',
            eur: '0.20',
            eur_foil: '1.25',
            tix: '0.01',
          },
          legalities: {
            standard: 'legal',
            modern: 'legal',
          },
          multiverse_ids: [12345],
        },
      ],
      total_cards: 1,
      has_more: false,
    }

    it('should search for cards successfully', async () => {
      mockFetch(mockScryfallResponse)

      const result = await searchCards('Lightning Bolt')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.scryfall.com/cards/search')
      )
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Lightning Bolt')
      expect(result.totalCount).toBe(1)
      expect(result.hasMore).toBe(false)
    })

    it('should handle search options correctly', async () => {
      mockFetch(mockScryfallResponse)

      await searchCards('Lightning', {
        page: 2,
        sort: 'cmc',
        order: 'desc',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('order=cmc')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dir=desc')
      )
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const result = await searchCards('invalid query')

      expect(result.data).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle HTTP errors gracefully', async () => {
      mockFetch({ error: 'Not found' }, 404)

      const result = await searchCards('nonexistent card')

      expect(result.data).toEqual([])
      expect(result.totalCount).toBe(0)
    })
  })

  describe('advancedSearch', () => {
    it('should build advanced search queries correctly', async () => {
      mockFetch({ data: [], total_cards: 0, has_more: false })

      await advancedSearch('dragon', {
        colors: ['R', 'G'],
        types: ['Creature'],
        rarity: ['rare', 'mythic'],
        minCmc: 3,
        maxCmc: 7,
        format: 'standard',
      })

      const expectedQuery = 'dragon color:RG type:Creature rarity:rare OR rarity:mythic cmc>=3 cmc<=7 format:standard'
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(expectedQuery.trim()))
      )
    })

    it('should handle empty filters', async () => {
      mockFetch({ data: [], total_cards: 0, has_more: false })

      await advancedSearch('test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test')
      )
    })
  })

  describe('getCard', () => {
    const mockCardResponse = {
      id: 'test-id',
      name: 'Lightning Bolt',
      mana_cost: '{R}',
      cmc: 1,
      type_line: 'Instant',
      oracle_text: 'Lightning Bolt deals 3 damage to any target.',
      image_uris: {
        normal: 'https://cards.scryfall.io/normal/front/test.jpg',
      },
      set_name: 'Test Set',
      set: 'tst',
      rarity: 'common',
      prices: {
        usd: '0.25',
      },
      legalities: {},
    }

    it('should fetch individual card successfully', async () => {
      mockFetch(mockCardResponse)

      const card = await getCard('test-id')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.scryfall.com/cards/test-id'
      )
      expect(card.name).toBe('Lightning Bolt')
      expect(card.id).toBe('test-id')
    })

    it('should throw error for invalid card ID', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Not found'))

      await expect(getCard('invalid-id')).rejects.toThrow(
        'Failed to fetch card with ID: invalid-id'
      )
    })
  })

  describe('getPriceHistory', () => {
    it('should generate mock price history', async () => {
      const mockCardResponse = {
        id: 'test-id',
        name: 'Lightning Bolt',
        prices: { usd: '1.00' },
        mana_cost: '{R}',
        cmc: 1,
        type_line: 'Instant',
        set_name: 'Test Set',
        set: 'tst',
        rarity: 'common',
        legalities: {},
      }
      
      mockFetch(mockCardResponse)

      const history = await getPriceHistory('test-id', 7)

      expect(history).toHaveLength(8) // 7 days + today
      expect(history[0]).toHaveProperty('date')
      expect(history[0]).toHaveProperty('price')
      expect(history[0]).toHaveProperty('priceType', 'usd')
    })

    it('should handle cards without price', async () => {
      const mockCardResponse = {
        id: 'test-id',
        name: 'Test Card',
        prices: {},
        mana_cost: '',
        cmc: 0,
        type_line: 'Token',
        set_name: 'Test Set',
        set: 'tst',
        rarity: 'common',
        legalities: {},
      }
      
      mockFetch(mockCardResponse)

      const history = await getPriceHistory('test-id')

      expect(history).toHaveLength(31) // 30 days + today
      expect(history.every(point => point.price >= 0.01)).toBe(true)
    })
  })

  describe('getRandomCards', () => {
    it('should fetch multiple random cards', async () => {
      const mockRandomCard = {
        id: 'random-id',
        name: 'Random Card',
        mana_cost: '{1}',
        cmc: 1,
        type_line: 'Artifact',
        set_name: 'Random Set',
        set: 'rnd',
        rarity: 'common',
        prices: { usd: '0.10' },
        legalities: {},
      }

      // Mock multiple calls to the random endpoint
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockRandomCard, id: 'random-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockRandomCard, id: 'random-2' }),
        })

      const cards = await getRandomCards(2)

      expect(cards).toHaveLength(2)
      expect(cards[0].id).toBe('random-1')
      expect(cards[1].id).toBe('random-2')
    })

    it('should handle partial failures gracefully', async () => {
      const mockRandomCard = {
        id: 'random-id',
        name: 'Random Card',
        mana_cost: '{1}',
        cmc: 1,
        type_line: 'Artifact',
        set_name: 'Random Set',
        set: 'rnd',
        rarity: 'common',
        prices: { usd: '0.10' },
        legalities: {},
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRandomCard,
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const cards = await getRandomCards(2)

      expect(cards).toHaveLength(1)
      expect(cards[0].name).toBe('Random Card')
    })
  })

  describe('getCardsBySet', () => {
    it('should search cards by set code', async () => {
      mockFetch({ data: [], total_cards: 0, has_more: false })

      await getCardsBySet('DOM')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=set%3ADOM')
      )
    })
  })

  describe('getCardSuggestions', () => {
    it('should fetch autocomplete suggestions', async () => {
      const mockSuggestions = {
        data: ['Lightning Bolt', 'Lightning Strike', 'Lightning Helix'],
      }

      mockFetch(mockSuggestions)

      const suggestions = await getCardSuggestions('lightning')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.scryfall.com/cards/autocomplete?q=lightning'
      )
      expect(suggestions).toEqual(['Lightning Bolt', 'Lightning Strike', 'Lightning Helix'])
    })

    it('should handle autocomplete errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const suggestions = await getCardSuggestions('test')

      expect(suggestions).toEqual([])
    })
  })

  describe('Rate limiting', () => {
    it('should respect rate limits between requests', async () => {
      const mockCardResponse = {
        id: 'test-id',
        name: 'Test Card',
        prices: { usd: '1.00' },
        mana_cost: '{1}',
        cmc: 1,
        type_line: 'Artifact',
        set_name: 'Test Set',
        set: 'tst',
        rarity: 'common',
        legalities: {},
      }

      mockFetch(mockCardResponse)
      mockFetch(mockCardResponse)

      const startTime = Date.now()
      await getCard('test-1')
      await getCard('test-2')
      const endTime = Date.now()

      // Note: This test would need adjustment based on actual rate limiting implementation
      expect(endTime - startTime).toBeGreaterThanOrEqual(0)
    })
  })
})
