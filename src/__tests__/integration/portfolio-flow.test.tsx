/**
 * Integration tests for the complete portfolio management flow
 */

import { render, screen, createUser, waitFor, mockLocalStorage } from '@/test-utils'
import PortfolioPage from '@/app/portfolio/page'
import { mockPortfolio, mockPortfolioCard, mockMTGCard } from '@/test-utils'

// Mock the Scryfall API
jest.mock('@/lib/api/scryfall', () => ({
  getCard: jest.fn(),
  searchCards: jest.fn(),
}))

const { getCard, searchCards } = require('@/lib/api/scryfall')

describe('Portfolio Management Integration', () => {
  const user = createUser()

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage()
    
    // Mock API responses
    getCard.mockResolvedValue(mockMTGCard())
    searchCards.mockResolvedValue({
      data: [mockMTGCard()],
      totalCount: 1,
      hasMore: false,
      page: 1,
    })
  })

  it('should handle complete portfolio creation and management flow', async () => {
    render(<PortfolioPage />)

    // Initially should show empty state
    expect(screen.getByText(/no portfolios found/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create your first portfolio/i })).toBeInTheDocument()

    // Create new portfolio
    const createButton = screen.getByRole('button', { name: /create your first portfolio/i })
    await user.click(createButton)

    // Fill out portfolio form
    const nameInput = screen.getByLabelText(/portfolio name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(nameInput, 'My Test Portfolio')
    await user.type(descriptionInput, 'A portfolio for testing')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create portfolio/i })
    await user.click(submitButton)

    // Should now show the created portfolio
    await waitFor(() => {
      const portfolioElements = screen.getAllByText('My Test Portfolio')
      expect(portfolioElements).toHaveLength(2) // Should appear in both list and overview
    })

    expect(screen.getAllByText('A portfolio for testing')).toHaveLength(2) // Should appear in both list and overview
    expect(screen.getByText('Total Portfolios')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Portfolio count should be 1

    // Add a card to the portfolio
    const addCardButton = screen.getByRole('button', { name: /add card/i })
    await user.click(addCardButton)

    // Search for a card
    const searchInput = screen.getByPlaceholderText(/search for cards/i)
    await user.type(searchInput, 'Lightning Bolt')

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    })

    // Add the card
    const cardResult = screen.getByTestId('card-search-result')
    await user.click(cardResult)

    // Fill quantity and price
    const quantityInput = screen.getByLabelText(/quantity/i)
    const priceInput = screen.getByLabelText(/purchase price/i)
    
    await user.clear(quantityInput)
    await user.type(quantityInput, '4')
    
    await user.clear(priceInput)
    await user.type(priceInput, '0.25')

    // Add to portfolio
    const addToPortfolioButton = screen.getByRole('button', { name: /add to portfolio/i })
    await user.click(addToPortfolioButton)

    // Verify card was added
    await waitFor(() => {
      expect(screen.getByText('4x Lightning Bolt')).toBeInTheDocument()
    })

    expect(screen.getByText(/\$1\.00/)).toBeInTheDocument() // 4 × $0.25
  })

  it('should handle portfolio deletion', async () => {
    // Start with existing portfolio
    const existingPortfolio = mockPortfolio({
      name: 'Portfolio to Delete',
      cards: [mockPortfolioCard()],
    })

    mockLocalStorage({
      'mtg-portfolios': JSON.stringify([existingPortfolio]),
    })

    render(<PortfolioPage />)

    // Verify portfolio exists
    await waitFor(() => {
      expect(screen.getByText('Portfolio to Delete')).toBeInTheDocument()
    })

    // Open portfolio menu
    const menuButton = screen.getByRole('button', { name: /portfolio menu/i })
    await user.click(menuButton)

    // Delete portfolio
    const deleteButton = screen.getByRole('menuitem', { name: /delete/i })
    await user.click(deleteButton)

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm delete/i })
    await user.click(confirmButton)

    // Should return to empty state
    await waitFor(() => {
      expect(screen.getByText(/no portfolios found/i)).toBeInTheDocument()
    })

    expect(screen.queryByText('Portfolio to Delete')).not.toBeInTheDocument()
  })

  it('should handle portfolio editing', async () => {
    const existingPortfolio = mockPortfolio({
      name: 'Original Name',
      description: 'Original Description',
    })

    mockLocalStorage({
      'mtg-portfolios': JSON.stringify([existingPortfolio]),
    })

    render(<PortfolioPage />)

    // Open edit dialog
    const editButton = screen.getByRole('button', { name: /edit portfolio/i })
    await user.click(editButton)

    // Update portfolio details
    const nameInput = screen.getByDisplayValue('Original Name')
    const descriptionInput = screen.getByDisplayValue('Original Description')

    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Updated Description')

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Verify updates
    await waitFor(() => {
      expect(screen.getByText('Updated Name')).toBeInTheDocument()
    })

    expect(screen.getByText('Updated Description')).toBeInTheDocument()
    expect(screen.queryByText('Original Name')).not.toBeInTheDocument()
  })

  it('should calculate portfolio values correctly', async () => {
    const portfolioWithCards = mockPortfolio({
      cards: [
        mockPortfolioCard({
          cardId: 'card-1',
          quantity: 2,
          purchasePrice: 1.00,
        }),
        mockPortfolioCard({
          cardId: 'card-2',
          quantity: 1,
          purchasePrice: 5.00,
        }),
      ],
    })

    // Mock current card prices
    getCard
      .mockResolvedValueOnce(mockMTGCard({
        id: 'card-1',
        prices: { usd: 1.50 }, // Price increased
      }))
      .mockResolvedValueOnce(mockMTGCard({
        id: 'card-2',
        prices: { usd: 4.00 }, // Price decreased
      }))

    mockLocalStorage({
      'mtg-portfolios': JSON.stringify([portfolioWithCards]),
    })

    render(<PortfolioPage />)

    // Wait for price calculations
    await waitFor(() => {
      // Total cost: (2 × $1.00) + (1 × $5.00) = $7.00
      expect(screen.getByText(/total cost.*\$7\.00/i)).toBeInTheDocument()
    })

    // Total current value: (2 × $1.50) + (1 × $4.00) = $7.00
    expect(screen.getByText(/total value.*\$7\.00/i)).toBeInTheDocument()

    // Performance: $7.00 - $7.00 = $0.00 (0%)
    expect(screen.getByText(/\+\$0\.00.*0\.00%/)).toBeInTheDocument()
  })

  it('should handle card removal from portfolio', async () => {
    const portfolioWithCard = mockPortfolio({
      cards: [
        mockPortfolioCard({
          cardId: 'lightning-bolt',
          quantity: 4,
          purchasePrice: 0.25,
        }),
      ],
    })

    getCard.mockResolvedValue(mockMTGCard({
      id: 'lightning-bolt',
      name: 'Lightning Bolt',
    }))

    mockLocalStorage({
      'mtg-portfolios': JSON.stringify([portfolioWithCard]),
    })

    render(<PortfolioPage />)

    // Wait for card to load
    await waitFor(() => {
      expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    })

    // Remove card
    const removeButton = screen.getByRole('button', { name: /remove card/i })
    await user.click(removeButton)

    // Confirm removal
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    // Card should be removed
    await waitFor(() => {
      expect(screen.queryByText('Lightning Bolt')).not.toBeInTheDocument()
    })

    expect(screen.getByText(/no cards in this portfolio/i)).toBeInTheDocument()
  })

  it('should handle portfolio switching', async () => {
    const portfolio1 = mockPortfolio({
      id: 'portfolio-1',
      name: 'Red Deck',
    })

    const portfolio2 = mockPortfolio({
      id: 'portfolio-2',
      name: 'Blue Control',
    })

    mockLocalStorage({
      'mtg-portfolios': JSON.stringify([portfolio1, portfolio2]),
    })

    render(<PortfolioPage />)

    // Should start with first portfolio selected
    await waitFor(() => {
      expect(screen.getByText('Red Deck')).toBeInTheDocument()
    })

    // Switch to second portfolio
    const portfolioSelector = screen.getByRole('combobox', { name: /select portfolio/i })
    await user.click(portfolioSelector)

    const blueControlOption = screen.getByRole('option', { name: /blue control/i })
    await user.click(blueControlOption)

    // Should now show second portfolio
    await waitFor(() => {
      expect(screen.getByText('Blue Control')).toBeInTheDocument()
    })
  })
})
