import { test, expect } from '@playwright/test'

test.describe('Portfolio Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should create a new portfolio', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Should show empty state
    await expect(page.getByText(/no portfolios found/i)).toBeVisible()
    await expect(page.getByText(/create your first portfolio/i)).toBeVisible()
    
    // Create new portfolio
    await page.getByRole('button', { name: /create portfolio/i }).click()
    
    // Fill form
    await page.getByLabel(/portfolio name/i).fill('My Test Portfolio')
    await page.getByLabel(/description/i).fill('A portfolio for E2E testing')
    
    // Submit
    await page.getByRole('button', { name: /create/i }).click()
    
    // Should show created portfolio
    await expect(page.getByText('My Test Portfolio')).toBeVisible()
    await expect(page.getByText('A portfolio for E2E testing')).toBeVisible()
    await expect(page.getByText(/\$0\.00/)).toBeVisible() // Total value
  })

  test('should persist portfolio data across page reloads', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Create portfolio
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill('Persistent Portfolio')
    await page.getByRole('button', { name: /create/i }).click()
    
    // Reload page
    await page.reload()
    
    // Portfolio should still be there
    await expect(page.getByText('Persistent Portfolio')).toBeVisible()
  })

  test('should edit portfolio details', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Create initial portfolio
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill('Original Name')
    await page.getByLabel(/description/i).fill('Original Description')
    await page.getByRole('button', { name: /create/i }).click()
    
    // Edit portfolio
    await page.getByRole('button', { name: /edit portfolio/i }).click()
    
    await page.getByDisplayValue('Original Name').fill('Updated Name')
    await page.getByDisplayValue('Original Description').fill('Updated Description')
    
    await page.getByRole('button', { name: /save changes/i }).click()
    
    // Verify changes
    await expect(page.getByText('Updated Name')).toBeVisible()
    await expect(page.getByText('Updated Description')).toBeVisible()
  })

  test('should delete portfolio', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Create portfolio to delete
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill('Portfolio to Delete')
    await page.getByRole('button', { name: /create/i }).click()
    
    // Delete portfolio
    await page.getByRole('button', { name: /portfolio menu/i }).click()
    await page.getByRole('menuitem', { name: /delete/i }).click()
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm delete/i }).click()
    
    // Should return to empty state
    await expect(page.getByText(/no portfolios found/i)).toBeVisible()
    await expect(page.queryByText('Portfolio to Delete')).not.toBeVisible()
  })

  test('should handle multiple portfolios', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Create first portfolio
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill('Red Deck')
    await page.getByRole('button', { name: /create/i }).click()
    
    // Create second portfolio
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill('Blue Control')
    await page.getByRole('button', { name: /create/i }).click()
    
    // Switch between portfolios
    const portfolioSelector = page.getByRole('combobox', { name: /select portfolio/i })
    await portfolioSelector.click()
    
    await page.getByRole('option', { name: /red deck/i }).click()
    await expect(page.getByText('Red Deck')).toBeVisible()
    
    await portfolioSelector.click()
    await page.getByRole('option', { name: /blue control/i }).click()
    await expect(page.getByText('Blue Control')).toBeVisible()
  })

  test('should handle portfolio with no cards', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Create empty portfolio
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill('Empty Portfolio')
    await page.getByRole('button', { name: /create/i }).click()
    
    // Should show empty card state
    await expect(page.getByText(/no cards in this portfolio/i)).toBeVisible()
    await expect(page.getByText(/add your first card/i)).toBeVisible()
    
    // Values should be zero
    await expect(page.getByText(/total value.*\$0\.00/i)).toBeVisible()
    await expect(page.getByText(/total cost.*\$0\.00/i)).toBeVisible()
  })

  test('should validate portfolio creation form', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByRole('button', { name: /create/i }).click()
    
    // Should show validation error
    await expect(page.getByText(/portfolio name is required/i)).toBeVisible()
    
    // Form should still be open
    await expect(page.getByLabel(/portfolio name/i)).toBeVisible()
  })

  test('should close modal on cancel', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Open create modal
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await expect(page.getByLabel(/portfolio name/i)).toBeVisible()
    
    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click()
    
    // Modal should be closed
    await expect(page.getByLabel(/portfolio name/i)).not.toBeVisible()
  })

  test('should close modal on backdrop click', async ({ page }) => {
    await page.goto('/portfolio')
    
    // Open create modal
    await page.getByRole('button', { name: /create portfolio/i }).click()
    
    // Click backdrop
    await page.locator('[data-testid="modal-backdrop"]').click()
    
    // Modal should be closed
    await expect(page.getByLabel(/portfolio name/i)).not.toBeVisible()
  })

  test('should handle very long portfolio names', async ({ page }) => {
    await page.goto('/portfolio')
    
    const longName = 'A'.repeat(100) // Very long name
    
    await page.getByRole('button', { name: /create portfolio/i }).click()
    await page.getByLabel(/portfolio name/i).fill(longName)
    await page.getByRole('button', { name: /create/i }).click()
    
    // Should handle long names gracefully (truncated display)
    await expect(page.getByText(longName.substring(0, 50))).toBeVisible()
  })
})
