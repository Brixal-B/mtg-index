# Setup Guide

This guide will help you get the MTG Investment Tracker running on your local development environment or deployed to production.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or later
- **npm** 9.0 or later (or **yarn** 1.22+, **pnpm** 8.0+)
- **Git** for version control
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Checking Prerequisites

```bash
# Check Node.js version
node --version
# Should output v18.0.0 or later

# Check npm version  
npm --version
# Should output 9.0.0 or later

# Check Git version
git --version
# Should output git version 2.0 or later
```

## 🚀 Local Development Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/mtg-investment-tracker.git

# Navigate to the project directory
cd mtg-investment-tracker
```

### Step 2: Install Dependencies

Choose your preferred package manager:

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

### Step 3: Environment Setup

The application works entirely client-side and doesn't require environment variables for basic functionality. However, you can optionally create a `.env.local` file for development settings:

```bash
# .env.local (optional)
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=development
```

### Step 4: Start Development Server

```bash
# Using npm
npm run dev

# Using yarn
yarn dev

# Using pnpm
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Step 5: Verify Installation

1. Open your browser to [http://localhost:3000](http://localhost:3000)
2. You should see the MTG Investment Tracker homepage
3. Navigate to the "Browse Cards" section
4. Try searching for a card (e.g., "Lightning Bolt")
5. If cards load successfully, your setup is complete!

## 🛠️ Development Tools

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checker

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Utilities
npm run clean        # Clean build artifacts
```

### VS Code Setup

For the best development experience with VS Code, install these extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag"
  ]
}
```

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## 🔧 Configuration

### TypeScript Configuration

The project uses strict TypeScript configuration. Key settings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "allowJs": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/config/*": ["./src/config/*"]
    }
  }
}
```

### Tailwind CSS Configuration

Tailwind is configured with custom color schemes and component classes:

```typescript
// tailwind.config.ts
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... custom color system
      }
    }
  }
}
```

### Next.js Configuration

The project uses Next.js App Router with these settings:

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}
```

## 🌐 Production Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   # Build and deploy
   vercel

   # Or deploy with custom settings
   vercel --prod
   ```

3. **Environment Variables** (if needed)
   ```bash
   vercel env add NEXT_PUBLIC_APP_VERSION
   ```

### Netlify

1. **Build Command**: `npm run build`
2. **Publish Directory**: `.next`
3. **Environment Variables**: Set in Netlify dashboard if needed

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   WORKDIR /app
   
   COPY package.json package-lock.json* ./
   RUN npm ci
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   RUN npm run build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t mtg-tracker .
   docker run -p 3000:3000 mtg-tracker
   ```

### Static Export

For static hosting (GitHub Pages, AWS S3, etc.):

1. **Update next.config.js**
   ```javascript
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true,
     },
   }
   ```

2. **Build and Export**
   ```bash
   npm run build
   # Files will be in the 'out' directory
   ```

## 🔒 Security Considerations

### API Security

The application uses the public Scryfall API:
- Rate limiting is handled automatically
- No API keys required
- All requests are client-side

### Data Privacy

- All user data stored in browser localStorage
- No external tracking or analytics
- No user data sent to servers

### HTTPS Requirements

For production deployment:
- Always use HTTPS
- Scryfall API requires HTTPS for image loading
- Browser storage is more secure over HTTPS

## 🐛 Troubleshooting

### Common Setup Issues

**Node.js Version Issues**
```bash
# Using nvm to manage Node.js versions
nvm install 18
nvm use 18
```

**Package Installation Failures**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript Errors**
```bash
# Check TypeScript configuration
npm run type-check

# Update TypeScript
npm update typescript @types/node @types/react @types/react-dom
```

**Build Failures**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Performance Issues

**Large Bundle Size**
- Use dynamic imports for large components
- Enable bundle analyzer: `npm install @next/bundle-analyzer`

**Slow Development Server**
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run dev`
- Disable source maps in development if needed

### Browser Compatibility

**Minimum Browser Versions**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Polyfills** (if needed)
```bash
npm install --save core-js regenerator-runtime
```

## 📊 Monitoring

### Development Monitoring

```bash
# Watch for TypeScript errors
npm run type-check -- --watch

# Watch for linting issues
npm run lint -- --watch

# Monitor bundle size
npm run build -- --analyze
```

### Production Monitoring

- Monitor Vercel deployment logs
- Set up error tracking (Sentry, LogRocket)
- Monitor Core Web Vitals

## 🔄 Updates

### Keeping Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest
```

### Next.js Updates

```bash
# Update Next.js
npm install next@latest react@latest react-dom@latest

# Check for breaking changes
npx @next/codemod@latest
```

## 📞 Getting Help

If you encounter issues during setup:

1. **Check the logs** for detailed error messages
2. **Search existing issues** on GitHub
3. **Create a new issue** with:
   - Your operating system
   - Node.js version
   - Complete error message
   - Steps to reproduce

## ✅ Verification Checklist

Before considering your setup complete:

- [ ] Application starts without errors
- [ ] Card search functionality works
- [ ] Portfolio creation works
- [ ] Local storage persists data
- [ ] All navigation links work
- [ ] Responsive design works on mobile
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes without errors
- [ ] Build process completes successfully

Your MTG Investment Tracker should now be ready for development or deployment!






