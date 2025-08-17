import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, {
    // Add providers here if needed (e.g., theme, router context)
    ...options,
  })
}

// Mock data generators
export const mockMTGCard = (overrides = {}) => ({
  id: 'test-card-id',
  name: 'Lightning Bolt',
  manaCost: '{R}',
  convertedManaCost: 1,
  type: 'Instant',
  text: 'Lightning Bolt deals 3 damage to any target.',
  flavorText: 'The spark of an idea, the shock of genius.',
  power: '',
  toughness: '',
  loyalty: '',
  imageUrl: 'https://cards.scryfall.io/normal/front/test.jpg',
  setName: 'Test Set',
  setCode: 'TST',
  number: '001',
  artist: 'Test Artist',
  rarity: 'common' as const,
  colors: ['R'],
  colorIdentity: ['R'],
  prices: {
    usd: 0.25,
    usdFoil: 1.50,
    eur: 0.20,
    eurFoil: 1.25,
    tix: 0.01,
  },
  legalities: {
    standard: 'legal',
    modern: 'legal',
    legacy: 'legal',
    vintage: 'legal',
  },
  scryfallId: 'test-scryfall-id',
  multiverseId: 12345,
  ...overrides,
})

export const mockPortfolio = (overrides = {}) => ({
  id: 'test-portfolio-id',
  name: 'Test Portfolio',
  description: 'A test portfolio for unit testing',
  cards: [],
  totalValue: 0,
  totalCost: 0,
  performance: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const mockPortfolioCard = (overrides = {}) => ({
  cardId: 'test-card-id',
  card: mockMTGCard(),
  quantity: 1,
  purchasePrice: 1.00,
  purchaseDate: '2024-01-01T00:00:00.000Z',
  condition: 'near_mint' as const,
  foil: false,
  notes: '',
  ...overrides,
})

// Helper to create user event instance
export const createUser = () => userEvent.setup()

// Helper to wait for async operations
export const waitFor = async (callback: () => void | Promise<void>, options = {}) => {
  const { waitFor: rtlWaitFor } = await import('@testing-library/react')
  return rtlWaitFor(callback, options)
}

// Helper to simulate API responses
export const mockFetch = (data: any, status = 200) => {
  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)
}

// Helper to mock localStorage
export const mockLocalStorage = (data: Record<string, any> = {}) => {
  const store = new Map(Object.entries(data))
  
  // Reset all localStorage methods to be fresh jest.fn() instances
  global.localStorage = {
    getItem: jest.fn((key: string) => store.get(key) || null),
    setItem: jest.fn((key: string, value: string) => store.set(key, value)),
    removeItem: jest.fn((key: string) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
    length: 0,
    key: jest.fn(),
  } as any;
  
  return store
}

// Helper to simulate component errors
export const suppressConsoleError = (callback: () => void) => {
  const originalError = console.error
  console.error = jest.fn()
  
  try {
    callback()
  } finally {
    console.error = originalError
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }
