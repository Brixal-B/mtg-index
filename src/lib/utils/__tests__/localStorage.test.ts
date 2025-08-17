import {
  getPortfolios,
  savePortfolio,
  deletePortfolio,
  updatePortfolio,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  getPreferences,
  savePreferences,
  exportData,
  importData,
  clearAllData,
  getStorageUsage,
} from '../localStorage'
import { mockPortfolio, mockLocalStorage } from '@/test-utils'

describe('localStorage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Portfolio management', () => {
    it('should return empty array when no portfolios exist', () => {
      const portfolios = getPortfolios()
      expect(portfolios).toEqual([])
    })

    it('should save and retrieve portfolios', () => {
      const portfolio = mockPortfolio()
      
      savePortfolio(portfolio)
      const portfolios = getPortfolios()
      
      expect(portfolios).toHaveLength(1)
      expect(portfolios[0]).toEqual(portfolio)
    })

    it('should update existing portfolio', () => {
      const portfolio = mockPortfolio()
      savePortfolio(portfolio)
      
      const updatedPortfolio = {
        ...portfolio,
        name: 'Updated Portfolio Name',
        totalValue: 100,
      }
      
      updatePortfolio(updatedPortfolio)
      const portfolios = getPortfolios()
      
      expect(portfolios).toHaveLength(1)
      expect(portfolios[0].name).toBe('Updated Portfolio Name')
      expect(portfolios[0].totalValue).toBe(100)
    })

    it('should delete portfolio', () => {
      const portfolio = mockPortfolio()
      savePortfolio(portfolio)
      
      deletePortfolio(portfolio.id)
      const portfolios = getPortfolios()
      
      expect(portfolios).toHaveLength(0)
    })

    it('should handle multiple portfolios', () => {
      const portfolio1 = mockPortfolio({ id: 'portfolio-1', name: 'Portfolio 1' })
      const portfolio2 = mockPortfolio({ id: 'portfolio-2', name: 'Portfolio 2' })
      
      savePortfolio(portfolio1)
      savePortfolio(portfolio2)
      
      const portfolios = getPortfolios()
      expect(portfolios).toHaveLength(2)
      expect(portfolios.find(p => p.id === 'portfolio-1')).toBeDefined()
      expect(portfolios.find(p => p.id === 'portfolio-2')).toBeDefined()
    })
  })

  describe('Watchlist management', () => {
    it('should return empty array when no watchlist exists', () => {
      const watchlist = getWatchlist()
      expect(watchlist).toEqual([])
    })

    it('should add cards to watchlist', () => {
      addToWatchlist('card-1')
      addToWatchlist('card-2')
      
      const watchlist = getWatchlist()
      expect(watchlist).toEqual(['card-1', 'card-2'])
    })

    it('should not add duplicate cards to watchlist', () => {
      addToWatchlist('card-1')
      addToWatchlist('card-1')
      
      const watchlist = getWatchlist()
      expect(watchlist).toEqual(['card-1'])
    })

    it('should remove cards from watchlist', () => {
      addToWatchlist('card-1')
      addToWatchlist('card-2')
      
      removeFromWatchlist('card-1')
      
      const watchlist = getWatchlist()
      expect(watchlist).toEqual(['card-2'])
    })

    it('should check if card is in watchlist', () => {
      addToWatchlist('card-1')
      
      expect(isInWatchlist('card-1')).toBe(true)
      expect(isInWatchlist('card-2')).toBe(false)
    })
  })

  describe('User preferences', () => {
    it('should return default preferences when none exist', () => {
      const preferences = getPreferences()
      
      expect(preferences).toEqual({
        defaultCurrency: 'usd',
        showFoilPrices: false,
        defaultCondition: 'near_mint',
        priceAlerts: [],
        dashboardLayout: ['portfolio-overview', 'top-performers', 'price-alerts', 'market-trends'],
      })
    })

    it('should save and retrieve user preferences', () => {
      const preferences = {
        defaultCurrency: 'eur' as const,
        showFoilPrices: true,
        defaultCondition: 'lightly_played' as const,
        priceAlerts: [],
        dashboardLayout: ['portfolio-overview', 'market-trends'],
      }
      
      savePreferences(preferences)
      const savedPreferences = getPreferences()
      
      expect(savedPreferences).toEqual(preferences)
    })
  })

  describe('Data export/import', () => {
    it('should export all data as JSON string', () => {
      const portfolio = mockPortfolio()
      savePortfolio(portfolio)
      addToWatchlist('card-1')
      
      const exportedData = exportData()
      const parsedData = JSON.parse(exportedData)
      
      expect(parsedData.portfolios).toHaveLength(1)
      expect(parsedData.watchlist).toEqual(['card-1'])
      expect(parsedData.exportDate).toBeDefined()
    })

    it('should import valid data successfully', () => {
      const dataToImport = {
        portfolios: [mockPortfolio()],
        watchlist: ['card-1', 'card-2'],
        preferences: {
          defaultCurrency: 'eur',
          showFoilPrices: true,
          defaultCondition: 'near_mint',
          priceAlerts: [],
          dashboardLayout: ['portfolio-overview'],
        },
        exportDate: new Date().toISOString(),
      }
      
      const result = importData(JSON.stringify(dataToImport))
      
      expect(result.success).toBe(true)
      expect(getPortfolios()).toHaveLength(1)
      expect(getWatchlist()).toEqual(['card-1', 'card-2'])
    })

    it('should reject invalid import data', () => {
      const result = importData('invalid json')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid JSON')
    })

    it('should reject import data with missing required fields', () => {
      const incompleteData = {
        watchlist: ['card-1'],
        // Missing portfolios
      }
      
      const result = importData(JSON.stringify(incompleteData))
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid data structure')
    })
  })

  describe('Storage management', () => {
    it('should clear all data', () => {
      const portfolio = mockPortfolio()
      savePortfolio(portfolio)
      addToWatchlist('card-1')
      
      clearAllData()
      
      expect(getPortfolios()).toEqual([])
      expect(getWatchlist()).toEqual([])
    })

    it('should calculate storage usage', () => {
      const portfolio = mockPortfolio()
      savePortfolio(portfolio)
      
      const usage = getStorageUsage()
      
      expect(usage.used).toBeGreaterThan(0)
      expect(usage.total).toBe(5 * 1024 * 1024) // 5MB
      expect(usage.percentage).toBeGreaterThan(0)
      expect(usage.percentage).toBeLessThan(100)
    })
  })

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      ;(global.localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      const portfolios = getPortfolios()
      expect(portfolios).toEqual([])
    })

    it('should handle corrupted data gracefully', () => {
      // Mock localStorage to return corrupted JSON
      ;(global.localStorage.getItem as jest.Mock).mockReturnValue('{"corrupted": json}')
      
      const portfolios = getPortfolios()
      expect(portfolios).toEqual([])
    })
  })

  describe('Server-side rendering compatibility', () => {
    it('should handle undefined window object', () => {
      // Mock undefined window
      const originalWindow = global.window
      delete (global as any).window
      
      const portfolios = getPortfolios()
      expect(portfolios).toEqual([])
      
      // Restore window
      global.window = originalWindow
    })
  })
})
