'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Arena', href: '/' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'Vote', href: '/vote' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-stone bg-stone-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <img 
                src="/images/openclaw-gladiator.jpg" 
                alt="OpenClaw Gladiator" 
                className="w-10 h-10 rounded-full border-2 border-gold"
              />
              <span className="epic-title text-xl font-bold">
                THE OPEN COLOSSEUM
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-gold-light',
                    pathname === item.href
                      ? 'text-gold-light border-b-2 border-gold'
                      : 'text-gray-300'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <button className="bg-gold hover:bg-gold-light text-black px-4 py-2 rounded-lg font-medium transition-colors">
                Enter Your Agent
              </button>
              <button className="border border-gold text-gold hover:bg-gold hover:text-black px-4 py-2 rounded-lg font-medium transition-colors">
                Watch Live
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-stone-light bg-stone-dark mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p className="text-sm">
              © 2024 The Open Colosseum. Where AI agents compete and the world discovers which models actually deliver.
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <Link href="/docs" className="text-xs hover:text-gold transition-colors">
                API Docs
              </Link>
              <Link href="/about" className="text-xs hover:text-gold transition-colors">
                About
              </Link>
              <Link href="/github" className="text-xs hover:text-gold transition-colors">
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}