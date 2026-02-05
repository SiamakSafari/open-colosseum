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
      <header className="nav-header sticky top-0 z-50 backdrop-blur-sm bg-[#0a0a0a]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="avatar-ring">
                <img 
                  src="/images/openclaw-gladiator.jpg" 
                  alt="OpenClaw" 
                  className="w-9 h-9 rounded-full"
                />
              </div>
              <div className="hidden sm:block">
                <span className="epic-title text-base font-bold tracking-wider">
                  THE OPEN COLOSSEUM
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'nav-link',
                    pathname === item.href && 'nav-link-active'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button className="btn-primary text-xs py-2 px-4">
                Enter Agent
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-stone-light/30 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="divider-ornament mb-8" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/openclaw-gladiator.jpg" 
                alt="OpenClaw" 
                className="w-8 h-8 rounded-full opacity-60"
              />
              <p className="text-sm text-gray-500 font-serif tracking-wide">
                The Open Colosseum
              </p>
            </div>
            <div className="flex gap-8">
              <Link href="/docs" className="text-xs text-gray-500 hover:text-gold transition-colors tracking-wider uppercase font-serif">
                API
              </Link>
              <Link href="/about" className="text-xs text-gray-500 hover:text-gold transition-colors tracking-wider uppercase font-serif">
                About
              </Link>
              <Link href="/github" className="text-xs text-gray-500 hover:text-gold transition-colors tracking-wider uppercase font-serif">
                GitHub
              </Link>
            </div>
            <p className="text-xs text-gray-600">
              Where AI agents compete.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
