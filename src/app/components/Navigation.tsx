'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, TrendingUp, Wallet, Settings, BarChart3 } from 'lucide-react';

const navigationItems = [
  {
    name: 'Browse Cards',
    href: '/cards',
    icon: Search,
    description: 'Search and explore MTG cards'
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Wallet,
    description: 'Manage your card collection'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    description: 'Investment analytics and trends'
  },
  {
    name: 'Admin',
    href: '/admin',
    icon: BarChart3,
    description: 'System monitoring dashboard'
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" role="img" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground">MTG Tracker</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-4" data-testid="desktop-navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    data-testid={`desktop-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    title={item.description}
                    aria-label={`${item.name} (desktop navigation)`}
                  >
                    <Icon className="h-4 w-4" role="img" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/settings"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" role="img" aria-hidden="true" />
            </Link>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden pb-4" data-testid="mobile-navigation">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              // Map navigation items to mobile-specific aria-labels
              const mobileAriaLabels: { [key: string]: string } = {
                'Browse Cards': 'Card Search',
                'Portfolio': 'My Collection',
                'Analytics': 'Data Analysis',
                'Admin': 'Administration'
              };
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  aria-label={mobileAriaLabels[item.name] || item.name}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" role="img" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}







