import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from './components/Navigation'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MTG Investment Tracker',
  description: 'Track your Magic: The Gathering card investments and portfolio performance',
  keywords: ['MTG', 'Magic The Gathering', 'investment', 'cards', 'portfolio', 'tracker'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}






