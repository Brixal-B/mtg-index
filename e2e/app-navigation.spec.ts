import { test, expect } from '@playwright/test'

test.describe('Application Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display homepage correctly', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: /MTG Investment Tracker/i })).toBeVisible()
    
    // Check hero description
    await expect(page.getByText(/The ultimate tool for Magic: The Gathering collectors/)).toBeVisible()
    
    // Check main CTA buttons
    await expect(page.getByRole('link', { name: /Browse Cards/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Manage Portfolio/i })).toBeVisible()
  })

  test('should navigate to cards page', async ({ page }) => {
    await page.getByRole('link', { name: /Browse Cards/i }).first().click()
    await expect(page).toHaveURL('/cards')
    await expect(page.getByRole('heading', { name: /Browse Cards/i })).toBeVisible()
  })

  test('should navigate to portfolio page', async ({ page }) => {
    await page.getByRole('link', { name: /Portfolio/i }).first().click()
    await expect(page).toHaveURL('/portfolio')
    await expect(page.getByRole('heading', { name: /Portfolio/i })).toBeVisible()
  })

  test('should navigate to analytics page', async ({ page }) => {
    await page.getByRole('link', { name: /Analytics/i }).first().click()
    await expect(page).toHaveURL('/analytics')
    await expect(page.getByRole('heading', { name: /Analytics/i })).toBeVisible()
  })

  test('should navigate to admin page', async ({ page }) => {
    await page.getByRole('link', { name: /Admin/i }).first().click()
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: /Admin/i })).toBeVisible()
  })

  test('should highlight active navigation item', async ({ page }) => {
    await page.getByRole('link', { name: /Portfolio/i }).first().click()
    
    // Check that Portfolio nav item has active styling
    const portfolioNav = page.getByRole('link', { name: /Portfolio/i }).first()
    await expect(portfolioNav).toHaveClass(/bg-primary/)
  })

  test('should work on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Should show mobile navigation
    await expect(page.locator('.md\\:hidden')).toBeVisible()
    
    // Mobile navigation should work
    await page.getByRole('link', { name: /Browse Cards/i }).last().click()
    await expect(page).toHaveURL('/cards')
  })
})

test.describe('Application Features', () => {
  test('should display statistics section', async ({ page }) => {
    await page.goto('/')
    
    // Check statistics
    await expect(page.getByText('25,000+')).toBeVisible()
    await expect(page.getByText('Cards Tracked')).toBeVisible()
    await expect(page.getByText('Daily')).toBeVisible()
    await expect(page.getByText('Price Updates')).toBeVisible()
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/')
    
    // Check feature sections
    await expect(page.getByText('Browse Cards')).toBeVisible()
    await expect(page.getByText('Portfolio Management')).toBeVisible()
    await expect(page.getByText('Investment Analytics')).toBeVisible()
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    
    // Feature cards should be clickable
    await page.getByText('Browse Cards').click()
    await expect(page).toHaveURL('/cards')
  })

  test('should handle getting started section', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByText('Ready to get started?')).toBeVisible()
    await expect(page.getByText('Start by browsing our extensive card database')).toBeVisible()
    
    // CTA buttons in getting started section
    const exploreCardsBtn = page.getByRole('link', { name: /Explore Cards/i })
    const createPortfolioBtn = page.getByRole('link', { name: /Create Portfolio/i })
    
    await expect(exploreCardsBtn).toBeVisible()
    await expect(createPortfolioBtn).toBeVisible()
  })
})
