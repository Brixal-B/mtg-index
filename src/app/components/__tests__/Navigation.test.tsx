import { Navigation } from '../Navigation'
import { render, screen, createUser } from '@/test-utils'

// Mock usePathname to control the active state
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  usePathname: jest.fn(),
}))

const { usePathname } = require('next/navigation')

describe('Navigation', () => {
  beforeEach(() => {
    usePathname.mockReturnValue('/')
  })

  it('renders the navigation bar', () => {
    render(<Navigation />)
    
    expect(screen.getByText('MTG Tracker')).toBeInTheDocument()
    expect(screen.getByText('Browse Cards')).toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('highlights the active navigation item', () => {
    usePathname.mockReturnValue('/cards')
    render(<Navigation />)
    
    const cardsLink = screen.getByRole('link', { name: /browse cards/i })
    expect(cardsLink).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('shows inactive styling for non-active items', () => {
    usePathname.mockReturnValue('/cards')
    render(<Navigation />)
    
    const portfolioLinks = screen.getAllByRole('link', { name: /portfolio/i })
    const desktopPortfolioLink = portfolioLinks[0] // First one is desktop
    expect(desktopPortfolioLink).toHaveClass('text-muted-foreground')
    expect(desktopPortfolioLink).not.toHaveClass('bg-primary')
  })

  it('includes proper navigation links', () => {
    render(<Navigation />)
    
    expect(screen.getAllByRole('link', { name: /browse cards/i })[0]).toHaveAttribute('href', '/cards')
    expect(screen.getAllByRole('link', { name: /portfolio/i })[0]).toHaveAttribute('href', '/portfolio')
    expect(screen.getAllByRole('link', { name: /analytics/i })[0]).toHaveAttribute('href', '/analytics')
    expect(screen.getAllByRole('link', { name: /admin/i })[0]).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
  })

  it('displays mobile navigation on small screens', () => {
    render(<Navigation />)
    
    // Mobile navigation should be present but hidden on larger screens
    const mobileNav = screen.getByText('Browse Cards').closest('.md\\:hidden')
    expect(mobileNav).toBeInTheDocument()
  })

  it('includes icons for each navigation item', () => {
    render(<Navigation />)
    
    // Check that icons are rendered (they should be SVG elements)
    const svgElements = screen.getAllByRole('img', { hidden: true })
    expect(svgElements.length).toBeGreaterThan(0)
  })

  it('handles hover states correctly', async () => {
    const user = createUser()
    render(<Navigation />)
    
    const portfolioLink = screen.getAllByRole('link', { name: /portfolio/i })[0]
    
    await user.hover(portfolioLink)
    
    // Note: Testing hover states with jsdom is limited, but we can test the classes exist
    expect(portfolioLink).toHaveClass('hover:text-foreground', 'hover:bg-accent')
  })

  it('includes proper accessibility attributes', () => {
    render(<Navigation />)
    
    const cardsLink = screen.getAllByRole('link', { name: /browse cards/i })[0]
    expect(cardsLink).toHaveAttribute('title', 'Search and explore MTG cards')
    
    const settingsLink = screen.getByRole('link', { name: /settings/i })
    expect(settingsLink).toHaveAttribute('title', 'Settings')
  })
})
