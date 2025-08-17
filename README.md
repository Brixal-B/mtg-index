# MTG Investment Tracker

A modern, client-side Magic: The Gathering investment tracking application built with Next.js 14, TypeScript, and Tailwind CSS. Track your MTG card collection, analyze investment performance, and monitor market trends—all without requiring a backend server.

![MTG Investment Tracker](https://img.shields.io/badge/MTG-Investment%20Tracker-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-blue?style=flat-square&logo=tailwindcss)

## 🌟 Features

### 📚 Card Browser
- **Real-time Search**: Search through 25,000+ MTG cards using Scryfall API
- **Advanced Filters**: Filter by colors, rarity, sets, types, price ranges, and mana cost
- **Card Details**: View comprehensive card information including oracle text, pricing, and set details
- **Watchlist**: Track cards you're interested in purchasing

### 💼 Portfolio Management
- **Multiple Portfolios**: Create and manage multiple investment portfolios
- **Card Tracking**: Add cards with purchase prices, conditions, and quantities
- **Performance Monitoring**: Track gains/losses and percentage returns
- **Local Storage**: All data stored securely in your browser

### 📊 Investment Analytics
- **Performance Charts**: Visual tracking of portfolio value over time
- **Diversification Analysis**: Pie charts showing distribution by set, rarity, and color
- **Top Performers**: Identify your best and worst performing cards
- **Market Trends**: Simulated market data and trend analysis
- **Risk Assessment**: Portfolio risk scores and diversification metrics

### 🛠️ Admin Dashboard
- **System Monitoring**: Real-time system health and performance metrics
- **API Status**: Monitor external service availability
- **Storage Management**: Track browser storage usage and manage data
- **Performance Metrics**: Response times, error rates, and uptime statistics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/mtg-investment-tracker.git
   cd mtg-investment-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
mtg-index/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── analytics/          # Investment analytics dashboard
│   │   ├── admin/              # Admin monitoring dashboard  
│   │   ├── cards/              # Card browser and search
│   │   ├── portfolio/          # Portfolio management
│   │   ├── components/         # Shared UI components
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── lib/
│   │   ├── api/                # API integrations
│   │   │   └── scryfall.ts     # Scryfall API client
│   │   ├── types/              # TypeScript type definitions
│   │   │   ├── index.ts        # Core application types
│   │   │   └── scryfall.ts     # Scryfall API types
│   │   └── utils/              # Utility functions
│   │       └── localStorage.ts # Local storage management
├── docs/                       # Documentation
├── scripts/                    # Build and utility scripts
├── config/                     # Configuration files
├── package.json               # Dependencies and scripts
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── next.config.js             # Next.js configuration
```

## 🔧 Configuration

### Tailwind CSS
The application uses a custom Tailwind configuration with CSS variables for theming:

```typescript
// tailwind.config.ts
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... additional color scheme
      }
    }
  }
}
```

### TypeScript
Strict TypeScript configuration with path mapping:

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

## 🏗️ Architecture

### Data Flow
1. **API Layer**: Scryfall API integration for real-time card data
2. **State Management**: React hooks for local state management
3. **Data Persistence**: Browser localStorage for portfolio and user data
4. **UI Components**: Reusable TypeScript components with Tailwind CSS

### Key Components

#### Card Browser (`src/app/cards/`)
- **SearchFilters**: Advanced filtering interface
- **CardGrid**: Responsive card display grid
- **CardItem**: Individual card component with actions
- **CardModal**: Detailed card view modal

#### Portfolio Management (`src/app/portfolio/`)
- **PortfolioList**: Portfolio selection sidebar
- **PortfolioOverview**: Main portfolio dashboard
- **AddCardModal**: Card addition interface
- **PortfolioCardItem**: Portfolio card management

#### Analytics Dashboard (`src/app/analytics/`)
- **PortfolioOverviewChart**: Value tracking over time
- **PerformanceChart**: Portfolio comparison
- **DiversificationChart**: Portfolio distribution analysis
- **TopPerformersTable**: Best/worst performing cards

#### Admin Dashboard (`src/app/admin/`)
- **SystemHealthChart**: System performance monitoring
- **ApiStatusGrid**: External service status
- **StorageMonitor**: Browser storage management

### API Integration

The application integrates with the Scryfall API for card data:

```typescript
// lib/api/scryfall.ts
export async function searchCards(query: string): Promise<MTGCard[]> {
  const response = await scryfallRequest<ScryfallSearchResponse>(
    `/cards/search?q=${encodeURIComponent(query)}`
  );
  return response.data.map(convertScryfallCard);
}
```

### Local Storage Management

All user data is stored in browser localStorage:

```typescript
// lib/utils/localStorage.ts
export function savePortfolio(portfolio: Portfolio): void {
  const portfolios = getPortfolios();
  // ... update logic
  setStorageItem(STORAGE_KEYS.PORTFOLIOS, portfolios);
}
```

## 🎨 Styling

### Design System
- **Colors**: HSL-based color system with CSS variables
- **Typography**: Inter font family for clean readability
- **Spacing**: Consistent spacing scale using Tailwind utilities
- **Components**: Reusable component patterns with hover states

### Responsive Design
- **Mobile-first**: Responsive design starting from mobile
- **Breakpoints**: Standard Tailwind breakpoints (sm, md, lg, xl)
- **Layout**: CSS Grid and Flexbox for flexible layouts

### Theme Support
Built-in light theme with dark theme support ready:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

## 📊 Analytics Features

### Portfolio Analytics
- **Value Tracking**: Historical portfolio value charts
- **Performance Metrics**: ROI, gains/losses, percentage returns
- **Diversification Analysis**: Distribution across sets, rarities, colors
- **Risk Assessment**: Portfolio concentration and risk scores

### Market Insights
- **Price Trends**: Simulated market trend analysis
- **Top Performers**: Best and worst performing cards
- **Market Sentiment**: Bull/bear market indicators
- **Volatility Tracking**: Price volatility measurements

### Data Visualization
Built with Recharts for interactive charts:
- Line charts for value tracking
- Bar charts for performance comparison
- Pie charts for diversification analysis
- Area charts for market trends

## 🔒 Security & Privacy

### Data Privacy
- **Local Storage**: All data stored in browser, never sent to external servers
- **No Tracking**: No analytics or tracking scripts
- **API Safety**: Rate-limited API calls to respect Scryfall's terms

### Error Handling
- **Defensive Programming**: Null/undefined checks throughout
- **API Error Handling**: Graceful handling of API failures
- **Storage Errors**: Fallback handling for storage quota issues

## 🧪 Testing

### Test Structure
```bash
npm run test        # Run all tests
npm run test:watch  # Run tests in watch mode
npm run type-check  # TypeScript type checking
```

### Test Coverage
- Component unit tests
- API integration tests
- localStorage utility tests
- Type safety validation

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Static Export
```bash
npm run build
npm run export
# Deploy static files to any hosting provider
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass: `npm run test`
6. Check TypeScript: `npm run type-check`
7. Commit changes: `git commit -m 'Add amazing feature'`
8. Push to branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Standard configuration with React rules
- **Prettier**: Automatic code formatting
- **Naming**: camelCase for variables, PascalCase for components

## 📚 API Reference

### Scryfall API Integration
The application uses the Scryfall API for card data:

- **Base URL**: `https://api.scryfall.com`
- **Rate Limit**: 10 requests per second (automatically handled)
- **Documentation**: [Scryfall API Docs](https://scryfall.com/docs/api)

### Key Endpoints Used
- `/cards/search` - Card search
- `/cards/{id}` - Card details
- `/cards/named` - Exact name lookup
- `/cards/autocomplete` - Search suggestions
- `/sets` - Set information

## 🐛 Troubleshooting

### Common Issues

**API Rate Limiting**
```
Error: Scryfall API Error: Rate limit exceeded
```
*Solution*: The app automatically handles rate limiting. Wait a moment and try again.

**Storage Quota Exceeded**
```
Error: QuotaExceededError
```
*Solution*: Use the Admin Dashboard to clear old data or manage storage usage.

**Cards Not Loading**
```
Error: Failed to fetch card data
```
*Solution*: Check internet connection and Scryfall API status.

### Performance Tips
- **Large Portfolios**: Consider splitting into multiple smaller portfolios
- **Storage Management**: Regularly check storage usage in Admin Dashboard
- **Browser Cache**: Clear browser cache if experiencing issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Scryfall**: For providing the comprehensive MTG card database API
- **Wizards of the Coast**: For creating Magic: The Gathering
- **Next.js Team**: For the excellent React framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Recharts**: For beautiful and interactive chart components

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/mtg-investment-tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/mtg-investment-tracker/discussions)
- **Documentation**: [docs/](./docs/)

---

Built with ❤️ for the MTG community. Happy investing!





