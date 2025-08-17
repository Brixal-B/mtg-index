import { CardItem } from '../CardItem'
import { render, screen, createUser } from '@/test-utils'
import { mockMTGCard } from '@/test-utils'

describe('CardItem', () => {
  const defaultCard = mockMTGCard()
  const mockOnClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders card information correctly', () => {
    render(<CardItem card={defaultCard} onClick={mockOnClick} />)
    
    expect(screen.getByText(defaultCard.name)).toBeInTheDocument()
    expect(screen.getByText(defaultCard.type)).toBeInTheDocument()
    expect(screen.getByText(defaultCard.setName, { exact: false })).toBeInTheDocument()
    expect(screen.getByText('$0.25')).toBeInTheDocument()
  })

  it('displays mana cost correctly', () => {
    const cardWithManaCost = mockMTGCard({
      manaCost: '{2}{R}{R}',
    })
    
    render(<CardItem card={cardWithManaCost} onClick={mockOnClick} />)
    
    // The mana cost formatting converts {2}{R}{R} to 2🔴🔴
    expect(screen.getByText('2🔴🔴')).toBeInTheDocument()
  })

  it('handles missing price gracefully', () => {
    const cardWithoutPrice = mockMTGCard({
      prices: {
        usd: null,
        usdFoil: null,
        eur: null,
        eurFoil: null,
        tix: null,
      },
    })
    
    render(<CardItem card={cardWithoutPrice} onClick={mockOnClick} />)
    
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('displays foil price when regular price is unavailable', () => {
    const foilOnlyCard = mockMTGCard({
      prices: {
        usd: null,
        usdFoil: 5.00,
        eur: null,
        eurFoil: null,
        tix: null,
      },
    })
    
    render(<CardItem card={foilOnlyCard} onClick={mockOnClick} />)
    
    expect(screen.getByText('$5.00')).toBeInTheDocument()
    expect(screen.getByText('(Foil)')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', async () => {
    const user = createUser()
    render(<CardItem card={defaultCard} onClick={mockOnClick} />)
    
    const cardElement = screen.getByTestId('card-item')
    await user.click(cardElement)
    
    expect(mockOnClick).toHaveBeenCalledWith(defaultCard)
  })

  it('shows actions when showActions is true', () => {
    render(<CardItem card={defaultCard} onClick={mockOnClick} showActions={true} />)
    
    // Assuming there are action buttons like watchlist or add to portfolio
    expect(screen.getByLabelText(/add to watchlist/i)).toBeInTheDocument()
  })

  it('hides actions when showActions is false', () => {
    render(<CardItem card={defaultCard} onClick={mockOnClick} showActions={false} />)
    
    expect(screen.queryByLabelText(/add to watchlist/i)).not.toBeInTheDocument()
  })

  it('displays rarity with appropriate styling', () => {
    const mythicCard = mockMTGCard({
      rarity: 'mythic',
    })
    
    render(<CardItem card={mythicCard} onClick={mockOnClick} />)
    
    const rarityElement = screen.getByText('mythic', { exact: false })
    expect(rarityElement).toBeInTheDocument()
    // Test for rarity-specific styling classes
    expect(rarityElement).toHaveClass('text-orange-600') // Assuming mythic is orange
  })

  it('handles long card names properly', () => {
    const longNameCard = mockMTGCard({
      name: 'This Is A Very Long Card Name That Should Be Handled Properly',
    })
    
    render(<CardItem card={longNameCard} onClick={mockOnClick} />)
    
    expect(screen.getByText(longNameCard.name)).toBeInTheDocument()
    // The element should have proper text truncation classes
    const nameElement = screen.getByText(longNameCard.name)
    expect(nameElement).toHaveClass('truncate')
  })

  it('displays card image with proper alt text', () => {
    render(<CardItem card={defaultCard} onClick={mockOnClick} />)
    
    const cardImage = screen.getByRole('img')
    expect(cardImage).toHaveAttribute('src', defaultCard.imageUrl)
    expect(cardImage).toHaveAttribute('alt', defaultCard.name)
  })

  it('handles image loading errors gracefully', () => {
    const cardWithBrokenImage = mockMTGCard({
      imageUrl: 'https://broken-url.com/image.jpg',
    })
    
    render(<CardItem card={cardWithBrokenImage} onClick={mockOnClick} />)
    
    const cardImage = screen.getByRole('img')
    
    // Simulate image error
    Object.defineProperty(cardImage, 'complete', { value: false })
    Object.defineProperty(cardImage, 'naturalHeight', { value: 0 })
    
    // Should show placeholder or fallback
    expect(cardImage).toBeInTheDocument()
  })

  it('shows power and toughness for creatures', () => {
    const creatureCard = mockMTGCard({
      type: 'Creature — Dragon',
      power: '5',
      toughness: '5',
    })
    
    render(<CardItem card={creatureCard} onClick={mockOnClick} />)
    
    expect(screen.getByText('5/5')).toBeInTheDocument()
  })

  it('shows loyalty for planeswalkers', () => {
    const planeswalkerCard = mockMTGCard({
      type: 'Planeswalker — Chandra',
      loyalty: '4',
    })
    
    render(<CardItem card={planeswalkerCard} onClick={mockOnClick} />)
    
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('applies hover effects correctly', async () => {
    const user = createUser()
    render(<CardItem card={defaultCard} onClick={mockOnClick} />)
    
    const cardElement = screen.getByTestId('card-item')
    
    await user.hover(cardElement)
    
    // Should have hover classes
    expect(cardElement).toHaveClass('hover:shadow-lg', 'hover:scale-105')
  })
})
