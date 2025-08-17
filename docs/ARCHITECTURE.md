# Architecture Documentation

This document provides a comprehensive overview of the MTG Investment Tracker's architecture, design patterns, and technical decisions.

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Browser  │    │  Scryfall API   │    │ Browser Storage │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │    UI     │  │    │  │   Cards   │  │    │  │Portfolio  │  │
│  │Components │◄─┼────┼─►│   Data    │  │    │  │   Data    │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   State   │  │    │  │  Images   │  │    │  │User Prefs │  │
│  │Management │  │    │  │   CDN     │  │    │  │ & Settings│  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Principles

1. **Client-Side First**: Everything runs in the browser
2. **No Backend Required**: Uses external APIs and local storage
3. **Type Safety**: Strict TypeScript throughout
4. **Responsive Design**: Mobile-first approach
5. **Performance Focused**: Optimized loading and caching
6. **Defensive Programming**: Comprehensive error handling

## 🔧 Technology Stack

### Frontend Framework
- **Next.js 14+**: React framework with App Router
- **React 18+**: UI library with concurrent features
- **TypeScript 5+**: Type-safe JavaScript

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Dynamic theming system
- **Lucide React**: Icon library
- **Recharts**: Data visualization

### Data & APIs
- **Scryfall API**: MTG card database
- **Browser localStorage**: Data persistence
- **Client-side routing**: Next.js App Router

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **TypeScript Compiler**: Type checking

## 📁 Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (routes)/
│   │   ├── cards/         # Card browser pages
│   │   ├── portfolio/     # Portfolio management
│   │   ├── analytics/     # Investment analytics
│   │   └── admin/         # Admin dashboard
│   ├── components/        # Shared UI components
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── lib/
│   ├── api/              # External API integrations
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── config/               # Configuration files
└── docs/                 # Documentation
```

### Component Organization

```
app/components/
├── ui/                   # Basic UI primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Modal.tsx
├── cards/               # Card-related components
│   ├── CardItem.tsx
│   ├── CardGrid.tsx
│   └── CardModal.tsx
├── portfolio/           # Portfolio components
│   ├── PortfolioList.tsx
│   └── AddCardModal.tsx
└── shared/              # Cross-cutting components
    ├── Navigation.tsx
    ├── LoadingSpinner.tsx
    └── ErrorMessage.tsx
```

## 🔄 Data Flow

### State Management Pattern

The application uses a **unidirectional data flow** pattern:

```
User Action → Component Event → State Update → UI Re-render
     ↓
Local Storage Update (for persistence)
     ↓
Other Components Re-render (via props/context)
```

### Component Communication

1. **Parent-Child**: Props and callbacks
2. **Sibling Components**: Lifting state up
3. **Cross-cutting**: React Context (minimal usage)
4. **Persistence**: localStorage utilities

### Data Persistence Strategy

```typescript
// localStorage abstraction
export interface LocalStorageData {
  portfolios: Portfolio[];
  watchlist: string[];
  preferences: UserPreferences;
  lastSync: string;
}

// Automatic persistence
function savePortfolio(portfolio: Portfolio) {
  // 1. Update in-memory state
  // 2. Persist to localStorage
  // 3. Trigger UI updates
}
```

## 🌐 API Integration

### Scryfall API Architecture

```typescript
// Rate limiting layer
class RateLimiter {
  private lastRequest = 0;
  private minInterval = 100;
  
  async throttle(): Promise<void> {
    // Ensure 100ms between requests
  }
}

// API abstraction layer
async function scryfallRequest<T>(endpoint: string): Promise<T> {
  await rateLimiter.throttle();
  
  try {
    const response = await fetch(`${SCRYFALL_BASE_URL}${endpoint}`);
    return await response.json();
  } catch (error) {
    // Error handling and retries
  }
}

// Type conversion layer
function convertScryfallCard(scryfallCard: ScryfallCard): MTGCard {
  // Convert external API format to internal types
}
```

### API Error Handling

```typescript
// Graceful degradation strategy
async function searchCards(query: string) {
  try {
    return await api.search(query);
  } catch (error) {
    if (error instanceof NetworkError) {
      // Show offline message, enable retry
      return { cards: [], error: 'Network unavailable' };
    }
    
    if (error instanceof RateLimitError) {
      // Auto-retry with backoff
      await delay(error.retryAfter);
      return searchCards(query);
    }
    
    // Log and show user-friendly error
    console.error('Search failed:', error);
    return { cards: [], error: 'Search temporarily unavailable' };
  }
}
```

## 🧱 Component Architecture

### Design Patterns

#### 1. Compound Components
```typescript
// CardGrid and CardItem work together
<CardGrid>
  {cards.map(card => 
    <CardItem 
      key={card.id}
      card={card}
      onSelect={handleSelect}
    />
  )}
</CardGrid>
```

#### 2. Render Props Pattern
```typescript
// Flexible data loading
<DataLoader
  loader={() => searchCards(query)}
  render={({ data, loading, error }) => (
    loading ? <Spinner /> :
    error ? <ErrorMessage error={error} /> :
    <CardGrid cards={data} />
  )}
/>
```

#### 3. Custom Hooks
```typescript
// Reusable stateful logic
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    return getStorageItem(key, defaultValue);
  });
  
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    setStorageItem(key, newValue);
  }, [key]);
  
  return [value, updateValue] as const;
}
```

#### 4. Error Boundaries
```typescript
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

### Component Lifecycle

```typescript
// Typical component structure
function CardBrowser() {
  // 1. State initialization
  const [cards, setCards] = useState<MTGCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2. Side effects
  useEffect(() => {
    loadInitialCards();
  }, []);
  
  // 3. Event handlers
  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await searchCards(query);
      setCards(results.cards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 4. Render logic
  return (
    <div>
      <SearchBar onSearch={handleSearch} />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && <CardGrid cards={cards} />}
    </div>
  );
}
```

## 🎨 Styling Architecture

### CSS Architecture

```css
/* Global styles - globals.css */
:root {
  /* Color system using HSL for easy manipulation */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  
  /* Spacing system */
  --radius: 0.5rem;
}

/* Component styles via Tailwind utilities */
.card-item {
  @apply bg-card border border-border rounded-lg p-4;
  @apply hover:shadow-lg transition-shadow duration-200;
}
```

### Responsive Design Strategy

```typescript
// Mobile-first responsive patterns
const ResponsiveGrid = () => (
  <div className="
    grid grid-cols-1           /* Mobile: 1 column */
    sm:grid-cols-2             /* Small: 2 columns */
    md:grid-cols-3             /* Medium: 3 columns */
    lg:grid-cols-4             /* Large: 4 columns */
    xl:grid-cols-5             /* XL: 5 columns */
    gap-4                      /* Consistent gap */
  ">
    {children}
  </div>
);
```

### Theme System

```typescript
// Dynamic theming support
interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// CSS variable management
function updateTheme(theme: ThemeConfig) {
  Object.entries(theme.colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value);
  });
}
```

## 📊 Performance Architecture

### Loading Strategies

#### 1. Code Splitting
```typescript
// Route-based splitting
const AnalyticsPage = lazy(() => import('./analytics/page'));
const AdminPage = lazy(() => import('./admin/page'));

// Component-based splitting
const HeavyChart = lazy(() => import('./components/HeavyChart'));
```

#### 2. Image Optimization
```typescript
// Next.js Image component with optimization
<Image
  src={card.imageUrl}
  alt={card.name}
  width={300}
  height={420}
  priority={index < 4}  // Prioritize first 4 images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

#### 3. Data Fetching Optimization
```typescript
// Debounced search to reduce API calls
const debouncedSearch = useMemo(
  () => debounce(async (query: string) => {
    const results = await searchCards(query);
    setCards(results.cards);
  }, 300),
  []
);
```

#### 4. Virtual Scrolling (for large lists)
```typescript
// Virtual scrolling for large card lists
function VirtualCardGrid({ cards }: { cards: MTGCard[] }) {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(20);
  
  const visibleCards = cards.slice(startIndex, endIndex);
  
  const handleScroll = useCallback((e: React.UIEvent) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      // Load more items
      setEndIndex(prev => Math.min(prev + 20, cards.length));
    }
  }, [cards.length]);
  
  return (
    <div onScroll={handleScroll} className="overflow-auto">
      {visibleCards.map(card => <CardItem key={card.id} card={card} />)}
    </div>
  );
}
```

### Memory Management

```typescript
// Cleanup patterns
useEffect(() => {
  const abortController = new AbortController();
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: abortController.signal
      });
      // Handle response
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Handle actual errors
      }
    }
  };
  
  fetchData();
  
  return () => {
    abortController.abort(); // Cleanup
  };
}, []);
```

## 🔐 Security Architecture

### Client-Side Security

#### 1. Input Sanitization
```typescript
// Sanitize user input
function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>]/g, '') // Remove potential HTML
    .trim()
    .slice(0, 100); // Limit length
}
```

#### 2. Safe API Integration
```typescript
// Validate API responses
function validateScryfallCard(data: unknown): data is ScryfallCard {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string'
  );
}
```

#### 3. localStorage Security
```typescript
// Safe localStorage operations
function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    // Validate structure before using
    return validateStructure(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}
```

### Data Privacy

- **No external tracking**: No analytics or tracking scripts
- **Local data only**: All user data stays in browser
- **API privacy**: Only public Scryfall API data used
- **No user accounts**: No personal information collected

## 🧪 Testing Architecture

### Testing Strategy

```typescript
// Component testing
describe('CardItem', () => {
  it('displays card information correctly', () => {
    const mockCard = createMockCard();
    render(<CardItem card={mockCard} />);
    
    expect(screen.getByText(mockCard.name)).toBeInTheDocument();
    expect(screen.getByText(mockCard.setName)).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    const mockCard = createMockCard();
    
    render(<CardItem card={mockCard} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(mockCard);
  });
});

// API testing
describe('Scryfall API', () => {
  it('handles rate limiting correctly', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce(createMockResponse())
      .mockResolvedValueOnce(createMockResponse());
    
    global.fetch = mockFetch;
    
    // Make rapid requests
    await Promise.all([
      searchCards('lightning'),
      searchCards('bolt')
    ]);
    
    // Verify rate limiting was applied
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// Integration testing
describe('Portfolio Management', () => {
  it('persists portfolio data across page reloads', () => {
    const portfolio = createMockPortfolio();
    
    // Create portfolio
    const { getByText } = render(<PortfolioManager />);
    
    // Add portfolio
    savePortfolio(portfolio);
    
    // Simulate page reload
    cleanup();
    render(<PortfolioManager />);
    
    // Verify persistence
    expect(getByText(portfolio.name)).toBeInTheDocument();
  });
});
```

### Test Utilities

```typescript
// Test helpers
export function createMockCard(overrides: Partial<MTGCard> = {}): MTGCard {
  return {
    id: 'test-card-id',
    name: 'Test Card',
    manaCost: '{1}{R}',
    convertedManaCost: 2,
    type: 'Instant',
    rarity: 'common',
    set: 'TST',
    setName: 'Test Set',
    colors: ['R'],
    colorIdentity: ['R'],
    legalities: {},
    prices: { usd: 1.50, lastUpdated: new Date().toISOString() },
    scryfallId: 'test-scryfall-id',
    ...overrides,
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions = {}
) {
  const AllProviders = ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ErrorBoundary>
  );
  
  return render(ui, { wrapper: AllProviders, ...options });
}
```

## 🚀 Deployment Architecture

### Build Process

```bash
# Production build pipeline
npm run type-check    # TypeScript validation
npm run lint         # Code quality checks
npm run test         # Test suite
npm run build        # Production build
```

### Static Generation

```typescript
// Next.js static optimization
export default function Page() {
  return <ClientSideApp />;
}

// All pages are client-side rendered
export const dynamic = 'force-dynamic';
```

### CDN Strategy

```typescript
// Asset optimization
const nextConfig = {
  images: {
    domains: ['cards.scryfall.io'], // Allow Scryfall images
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeFonts: true,
    optimizeImages: true,
  },
};
```

## 📈 Monitoring & Analytics

### Error Tracking

```typescript
// Error boundary with reporting
function logError(error: Error, errorInfo: ErrorInfo) {
  console.error('Application error:', {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
  });
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTracker(error, errorInfo);
  }
}
```

### Performance Monitoring

```typescript
// Core Web Vitals tracking
function measurePerformance() {
  // First Contentful Paint
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log('FCP:', entry.startTime);
      }
    }
  }).observe({ entryTypes: ['paint'] });
  
  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });
}
```

## 🔮 Future Architecture Considerations

### Scalability

- **Service Workers**: Offline functionality
- **WebAssembly**: Performance-critical operations
- **IndexedDB**: Larger data storage
- **WebSockets**: Real-time price updates

### Progressive Enhancement

- **PWA Features**: App-like experience
- **Background Sync**: Offline operation support
- **Push Notifications**: Price alerts
- **Share API**: Portfolio sharing

### Advanced Features

- **Machine Learning**: Price prediction
- **WebGL**: 3D card visualization
- **WebRTC**: Peer-to-peer trading
- **Blockchain**: NFT integration

This architecture provides a solid foundation for the current application while remaining flexible for future enhancements and scale.






