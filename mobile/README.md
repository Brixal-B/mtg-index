# MTG Index Mobile

React Native mobile application for the MTG Index project.

## 🚀 Getting Started

### Prerequisites

Before running the mobile app, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **React Native CLI**: `npm install -g @react-native-community/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Java Development Kit (JDK)** 11 or newer

### Environment Setup

#### Android Development

1. Install Android Studio
2. Install Android SDK (API level 33 or higher)
3. Set up Android Virtual Device (AVD)
4. Add Android SDK to your PATH:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

#### iOS Development (macOS only)

1. Install Xcode from the App Store
2. Install Xcode Command Line Tools: `xcode-select --install`
3. Install CocoaPods: `sudo gem install cocoapods`

## 📱 Installation & Running

### From the root directory:

```bash
# Install mobile dependencies
npm run mobile:install

# Start the Metro bundler
npm run mobile:start

# Run on Android (in another terminal)
npm run mobile:android

# Run on iOS (in another terminal)
npm run mobile:ios
```

### From the mobile directory:

```bash
cd mobile

# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── CardItem.tsx     # MTG card display component
│   ├── screens/             # App screens/pages
│   │   └── HomeScreen.tsx   # Main home screen
│   ├── services/            # API and external services
│   │   └── api.ts           # MTG API service (Scryfall)
│   ├── utils/               # Utility functions
│   │   └── storage.ts       # AsyncStorage wrapper
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Common types and interfaces
│   ├── hooks/               # Custom React hooks
│   ├── navigation/          # Navigation configuration
│   └── App.tsx              # Main app component
├── android/                 # Android-specific code
├── ios/                     # iOS-specific code
├── __tests__/               # Test files
├── babel.config.js          # Babel configuration
├── metro.config.js          # Metro bundler configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Mobile app dependencies
```

## 🔧 Configuration

### TypeScript Configuration

The mobile app extends the root TypeScript configuration with React Native-specific settings. Path aliases are configured for clean imports:

- `@/*` → `src/*`
- `@/components/*` → `src/components/*`
- `@/screens/*` → `src/screens/*`
- `@/services/*` → `src/services/*`

### Metro Configuration

Metro is configured with:
- Path aliases matching TypeScript configuration
- Proper resolution for React Native modules

### API Integration

The app uses the Scryfall API for MTG card data. The API service (`src/services/api.ts`) provides:

- Card search functionality
- Individual card retrieval
- Random card fetching
- Set information and cards

## 🎯 Features

### Core Features
- **Card Search**: Search MTG cards by name, type, set, etc.
- **Card Details**: View detailed information about individual cards
- **Favorites**: Save and manage favorite cards locally
- **Sets Browser**: Browse cards by expansion sets
- **Random Cards**: Discover random MTG cards

### Technical Features
- **TypeScript**: Full type safety
- **Async Storage**: Local data persistence
- **API Integration**: Scryfall API for card data
- **Responsive Design**: Optimized for mobile devices
- **Cross-Platform**: Runs on both iOS and Android

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🔍 Debugging

### React Native Debugger

1. Install React Native Debugger
2. Start the app in debug mode
3. Open developer menu (shake device or Cmd+D/Ctrl+M)
4. Select "Debug JS Remotely"

### Flipper Integration

Flipper can be used for advanced debugging:
- Network inspection
- Layout inspection
- AsyncStorage viewer
- Performance monitoring

## 📚 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling
- Add comments for complex logic

### File Naming

- Components: PascalCase (e.g., `CardItem.tsx`)
- Utilities: camelCase (e.g., `storage.ts`)
- Types: camelCase (e.g., `index.ts`)
- Constants: UPPER_SNAKE_CASE

### Import Organization

```typescript
// 1. React and React Native imports
import React from 'react';
import { View, Text } from 'react-native';

// 2. Third-party libraries
import AsyncStorage from '@react-native-async-storage/async-storage';

// 3. Internal imports (using path aliases)
import { Card } from '@/types';
import { mtgApi } from '@/services/api';
```

## 🚀 Deployment

### Android

1. Generate signed APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. The APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`

### iOS

1. Open `ios/MTGIndexMobile.xcworkspace` in Xcode
2. Select your team and provisioning profile
3. Archive the app (Product → Archive)
4. Upload to App Store Connect

## 🔗 Useful Links

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [React Navigation](https://reactnavigation.org/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler not starting**: Clear cache with `npx react-native start --reset-cache`
2. **Android build fails**: Clean and rebuild with `cd android && ./gradlew clean && cd .. && npm run android`
3. **iOS build fails**: Clean build folder in Xcode (Product → Clean Build Folder)
4. **Module not found**: Ensure all dependencies are installed with `npm install`

### Performance Issues

- Use `React.memo()` for expensive components
- Implement `FlatList` for large datasets
- Optimize images and use appropriate formats
- Profile with Flipper or React Native Performance Monitor

## 📄 License

This project is part of the MTG Index application. See the main project README for license information.