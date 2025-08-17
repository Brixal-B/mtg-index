import Link from 'next/link';
import { Search, Wallet, TrendingUp, BarChart3, Star, ArrowRight } from 'lucide-react';

const features = [
  {
    name: 'Browse Cards',
    description: 'Search through the entire Magic: The Gathering card database with advanced filters and real-time pricing.',
    icon: Search,
    href: '/cards',
    color: 'text-blue-500',
  },
  {
    name: 'Portfolio Management',
    description: 'Track your card collection, monitor values, and analyze your investment performance over time.',
    icon: Wallet,
    href: '/portfolio',
    color: 'text-green-500',
  },
  {
    name: 'Investment Analytics',
    description: 'Discover trends, analyze market data, and make informed decisions with comprehensive analytics.',
    icon: TrendingUp,
    href: '/analytics',
    color: 'text-purple-500',
  },
  {
    name: 'Admin Dashboard',
    description: 'Monitor system health, track usage statistics, and manage application performance.',
    icon: BarChart3,
    href: '/admin',
    color: 'text-orange-500',
  },
];

const stats = [
  { name: 'Cards Tracked', value: '25,000+' },
  { name: 'Price Updates', value: 'Daily' },
  { name: 'Sets Covered', value: '100+' },
  { name: 'Data Source', value: 'Scryfall API' },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <TrendingUp className="h-12 w-12 text-primary" />
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            MTG Investment Tracker
          </h1>
        </div>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          The ultimate tool for Magic: The Gathering collectors and investors. 
          Track your cards, analyze trends, and maximize your collection&apos;s value with real-time data.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link
            href="/cards"
            className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Search className="h-5 w-5" />
            <span>Browse Cards</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          
          <Link
            href="/portfolio"
            className="inline-flex items-center space-x-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
          >
            <Wallet className="h-5 w-5" />
            <span>Manage Portfolio</span>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
        {stats.map((stat) => (
          <div key={stat.name} className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground">
              {stat.name}
            </div>
          </div>
        ))}
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to manage your collection
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful tools to track, analyze, and optimize your MTG investments
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.name}
                href={feature.href}
                className="group block p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-all hover:shadow-lg"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg bg-accent ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                      {feature.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-4 text-primary group-hover:text-primary/80 transition-colors">
                      <span className="text-sm font-medium">Learn more</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="bg-accent rounded-xl p-8 text-center space-y-6">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Star className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            Ready to get started?
          </h2>
        </div>
        
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Start by browsing our extensive card database or create your first portfolio. 
          All your data is stored locally in your browser for privacy and instant access.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/cards"
            className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Search className="h-5 w-5" />
            <span>Explore Cards</span>
          </Link>
          
          <Link
            href="/portfolio"
            className="inline-flex items-center space-x-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-card transition-colors"
          >
            <Wallet className="h-5 w-5" />
            <span>Create Portfolio</span>
          </Link>
        </div>
      </section>
    </div>
  );
}






