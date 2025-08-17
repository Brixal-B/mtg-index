'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getPreferences, savePreferences } from '@/lib/utils/localStorage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // The resolved theme (system resolved to light/dark)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark'); // Default to dark
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load theme from preferences on mount
  useEffect(() => {
    if (!isClient) return;

    try {
      const preferences = getPreferences();
      const savedTheme = preferences.theme || 'dark'; // Default to dark if not set
      setThemeState(savedTheme);
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setThemeState('dark'); // Fallback to dark
    }
  }, [isClient]);

  // Update actual theme when theme or system preference changes
  useEffect(() => {
    if (!isClient) return;

    const updateActualTheme = () => {
      let resolvedTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolvedTheme = theme;
      }
      
      setActualTheme(resolvedTheme);
      
      // Apply theme to document
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
    };

    updateActualTheme();

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateActualTheme);
      return () => mediaQuery.removeEventListener('change', updateActualTheme);
    }
  }, [theme, isClient]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Save to preferences
    try {
      const preferences = getPreferences();
      const updatedPreferences = { ...preferences, theme: newTheme };
      savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return <div className="dark">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}