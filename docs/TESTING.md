# Testing Documentation

This document outlines the comprehensive testing strategy for the MTG Index application.

## 🧪 Testing Philosophy

Our testing strategy follows the **Testing Pyramid** approach:

1. **Unit Tests** (70%) - Fast, isolated tests for individual functions and components
2. **Integration Tests** (20%) - Tests that verify component interactions and data flow
3. **End-to-End Tests** (10%) - Full application flow tests from user perspective

## 📁 Testing Structure

```
src/
├── __tests__/
│   ├── integration/           # Integration tests
│   └── setup.ts              # Test setup files
├── app/
│   └── components/
│       └── __tests__/         # Component unit tests
├── lib/
│   ├── api/
│   │   └── __tests__/         # API unit tests
│   └── utils/
│       └── __tests__/         # Utility unit tests
├── test-utils/
│   └── index.tsx              # Testing utilities and helpers
e2e/                           # End-to-end tests
├── app-navigation.spec.ts
└── portfolio-management.spec.ts
```

## 🛠️ Testing Tools

### Core Testing Framework
- **Jest** - JavaScript testing framework
- **React Testing Library** - React component testing utilities
- **Playwright** - End-to-end testing framework

### Additional Testing Utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom Jest matchers for DOM

## 🚀 Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Debug tests
npm run test:debug
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests
```bash
# Run E2E tests headless
npm run test:e2e

# Run E2E tests with browser UI
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# View E2E test report
npm run test:e2e:report
```

### All Tests
```bash
# Run all test suites
npm run test:all

# Run comprehensive CI test suite
npm run test:ci
```

## 📋 Testing Guidelines

### Unit Testing

#### What to Test
- ✅ Component rendering with different props
- ✅ User interactions (clicks, form submissions)
- ✅ State changes and side effects
- ✅ Utility function logic
- ✅ API function behavior
- ✅ Error handling

#### What NOT to Test
- ❌ Implementation details
- ❌ Third-party library internals
- ❌ Styling and CSS
- ❌ Static content

#### Example Unit Test
```typescript
import { render, screen, createUser } from '@/test-utils'
import { CardItem } from '../CardItem'
import { mockMTGCard } from '@/test-utils'

describe('CardItem', () => {
  const mockCard = mockMTGCard()
  const mockOnClick = jest.fn()

  it('should render card information', () => {
    render(<CardItem card={mockCard} onClick={mockOnClick} />)
    
    expect(screen.getByText(mockCard.name)).toBeInTheDocument()
    expect(screen.getByText(mockCard.type)).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const user = createUser()
    render(<CardItem card={mockCard} onClick={mockOnClick} />)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockOnClick).toHaveBeenCalledWith(mockCard)
  })
})
```

### Integration Testing

#### Purpose
- Test component interactions
- Verify data flow between components
- Test complete user workflows
- Validate localStorage integration

#### Example Integration Test
```typescript
import { render, screen, createUser, waitFor } from '@/test-utils'
import PortfolioPage from '@/app/portfolio/page'

describe('Portfolio Management Integration', () => {
  it('should handle complete portfolio creation flow', async () => {
    const user = createUser()
    render(<PortfolioPage />)

    // Create portfolio
    await user.click(screen.getByRole('button', { name: /create portfolio/i }))
    await user.type(screen.getByLabelText(/portfolio name/i), 'Test Portfolio')
    await user.click(screen.getByRole('button', { name: /create/i }))

    // Verify creation
    await waitFor(() => {
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument()
    })
  })
})
```

### End-to-End Testing

#### Purpose
- Test complete user journeys
- Verify application behavior in real browsers
- Test cross-browser compatibility
- Validate performance and accessibility

#### Example E2E Test
```typescript
import { test, expect } from '@playwright/test'

test('should create and manage portfolio', async ({ page }) => {
  await page.goto('/portfolio')
  
  // Create portfolio
  await page.getByRole('button', { name: /create portfolio/i }).click()
  await page.getByLabel(/portfolio name/i).fill('E2E Test Portfolio')
  await page.getByRole('button', { name: /create/i }).click()
  
  // Verify creation
  await expect(page.getByText('E2E Test Portfolio')).toBeVisible()
})
```

## 🔧 Testing Utilities

### Mock Data Generators
```typescript
// Create mock MTG card
const mockCard = mockMTGCard({
  name: 'Lightning Bolt',
  prices: { usd: 0.25 }
})

// Create mock portfolio
const mockPortfolio = mockPortfolio({
  name: 'Test Portfolio',
  cards: [mockPortfolioCard()]
})
```

### Custom Render Function
```typescript
import { render, screen } from '@/test-utils'

// Renders with providers and utilities
render(<MyComponent />)
```

### Mock API Responses
```typescript
import { mockFetch } from '@/test-utils'

// Mock successful API response
mockFetch({ data: mockCard })

// Mock error response
mockFetch({ error: 'Not found' }, 404)
```

### Mock localStorage
```typescript
import { mockLocalStorage } from '@/test-utils'

// Mock localStorage with data
mockLocalStorage({
  'mtg-portfolios': JSON.stringify([mockPortfolio()])
})
```

## 📊 Coverage Requirements

### Minimum Coverage Targets
- **Overall Coverage**: 80%
- **Functions**: 85%
- **Lines**: 80%
- **Branches**: 75%

### Critical Areas (95%+ Coverage Required)
- API functions (`src/lib/api/`)
- Utility functions (`src/lib/utils/`)
- Core business logic
- Error handling code

### View Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🐛 Debugging Tests

### Debug Unit Tests
```bash
# Run specific test file
npm test -- CardItem.test.tsx

# Run with verbose output
npm run test:debug

# Run single test
npm test -- --testNamePattern="should render card information"
```

### Debug E2E Tests
```bash
# Run with browser UI
npm run test:e2e:headed

# Debug with Playwright Inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test portfolio-management.spec.ts
```

### Common Issues and Solutions

#### "Module not found" Errors
- Check import paths use `@/` alias correctly
- Verify file exists and is exported properly
- Check Jest module name mapping in config

#### "Window is not defined" Errors
- Use `mockLocalStorage()` for localStorage tests
- Check SSR compatibility in components
- Use proper mocking for browser APIs

#### Flaky E2E Tests
- Add proper wait conditions (`waitFor`, `toBeVisible`)
- Use data-testid attributes for reliable selectors
- Avoid hardcoded timeouts

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests  
  run: npm run test:integration

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test hook
npx husky add .husky/pre-commit "npm run test:unit"
```

## 📈 Testing Best Practices

### Do's ✅
- Write tests that test behavior, not implementation
- Use descriptive test names that explain the scenario
- Test edge cases and error conditions
- Keep tests independent and isolated
- Use proper async/await patterns
- Mock external dependencies
- Test accessibility with screen readers

### Don'ts ❌
- Don't test implementation details
- Don't write overly complex tests
- Don't mock everything (test real interactions when possible)
- Don't ignore flaky tests
- Don't skip error case testing
- Don't use brittle selectors in E2E tests

### Writing Effective Test Names
```typescript
// ❌ Bad: Vague and unclear
it('should work')

// ✅ Good: Specific and descriptive
it('should display error message when API returns 404')
it('should save portfolio to localStorage when form is submitted')
it('should navigate to card details when card is clicked')
```

## 🎯 Testing Checklist

Before submitting code, ensure:

- [ ] All new components have unit tests
- [ ] Critical user flows have integration tests
- [ ] API functions are tested with mocked responses
- [ ] Error scenarios are tested
- [ ] Accessibility is tested
- [ ] Tests pass locally
- [ ] Coverage meets minimum requirements
- [ ] No console errors in test output
- [ ] E2E tests pass in CI environment

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
