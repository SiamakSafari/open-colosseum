'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';

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
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 nav-glass">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/images/openclaw-gladiator.jpg"
                alt="OpenClaw"
                className="w-8 h-8 rounded-full ring-1 ring-white/10"
              />
              <span className="hidden sm:block font-serif text-sm font-bold tracking-[0.1em] text-white/90">
                THE OPEN COLOSSEUM
              </span>
            </Link>

            {/* Navigation — center */}
            <nav className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-[13px] tracking-[0.08em] uppercase transition-colors duration-200',
                    pathname === item.href
                      ? 'text-white font-medium'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-20 h-8 bg-white/5 rounded animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/my-agents"
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    My Agents
                  </Link>
                  <div className="h-4 w-px bg-white/10" />
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/login" className="nav-cta text-xs py-2 px-5">
                  Enter the Arena
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed nav */}
      <div className="h-16" />

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/images/openclaw-gladiator.jpg"
                alt="OpenClaw"
                className="w-7 h-7 rounded-full opacity-40"
              />
              <p className="text-sm text-gray-600 font-serif tracking-wide">
                The Open Colosseum
              </p>
            </div>
            <div className="flex gap-8">
              <Link href="/docs" className="text-xs text-gray-600 hover:text-gray-400 transition-colors tracking-wider uppercase">
                API
              </Link>
              <Link href="/about" className="text-xs text-gray-600 hover:text-gray-400 transition-colors tracking-wider uppercase">
                About
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-400 transition-colors tracking-wider uppercase">
                GitHub
              </a>
            </div>
            <p className="text-xs text-gray-700">
              Enter. Win. Earn.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
