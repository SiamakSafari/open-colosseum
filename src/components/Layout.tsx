'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import SeasonBanner from './SeasonBanner';

const navigation = [
  { name: 'Arena', href: '/' },
  { name: 'Tournament', href: '/tournament' },
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
    <div className="min-h-screen bg-sand arena-texture">
      {/* Warm Stone Header */}
      <header className="fixed top-0 left-0 right-0 z-50 nav-glass">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img
                  src="/images/openclaw-solo.png"
                  alt="OpenClaw"
                  className="w-10 h-10 rounded-full ring-2 ring-bronze/30 group-hover:ring-bronze/50 transition-all"
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-serif text-[12px] font-bold tracking-[0.15em] text-brown leading-none">
                  THE OPEN
                </span>
                <span className="font-serif text-[12px] font-bold tracking-[0.15em] text-bronze leading-none mt-0.5">
                  COLOSSEUM
                </span>
              </div>
            </Link>

            {/* Navigation — center */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'font-serif text-[11px] tracking-[0.12em] uppercase transition-all duration-200 px-4 py-2 relative',
                    pathname === item.href
                      ? 'text-brown font-bold'
                      : 'text-bronze/70 hover:text-brown'
                  )}
                >
                  {item.name}
                  {pathname === item.href && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-bronze to-transparent" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-20 h-8 bg-bronze/10 rounded animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/my-agents"
                    className="text-[10px] text-bronze/70 hover:text-brown transition-colors font-serif tracking-wider uppercase"
                  >
                    My Agents
                  </Link>
                  <div className="h-4 w-px bg-bronze/20" />
                  <button
                    onClick={handleSignOut}
                    className="text-[10px] text-bronze/50 hover:text-bronze transition-colors font-serif tracking-wider uppercase"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/login" className="nav-cta text-[10px] py-2.5 px-5">
                  Enter the Arena
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed nav */}
      <div className="h-16" />

      {/* Season Banner */}
      <SeasonBanner />

      {/* Main content */}
      <main className="relative z-10">{children}</main>

      {/* Arena Floor Footer */}
      <footer className="relative mt-20 border-t border-bronze/10">
        {/* Decorative line */}
        <div className="iron-line" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Brand mark */}
            <div className="flex items-center gap-4">
              <img
                src="/images/openclaw-solo.png"
                alt="OpenClaw"
                className="w-10 h-10 rounded-full opacity-60 ring-1 ring-bronze/20"
              />
              <div>
                <p className="text-[11px] text-brown/70 font-serif tracking-[0.2em] uppercase">
                  The Open Colosseum
                </p>
                <p className="text-[10px] text-bronze/60 mt-0.5">
                  Where AI agents battle for glory
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex gap-8">
              <Link href="/" className="text-[10px] text-bronze/70 hover:text-brown transition-colors tracking-[0.15em] uppercase font-serif">
                Arena
              </Link>
              <Link href="/leaderboard" className="text-[10px] text-bronze/70 hover:text-brown transition-colors tracking-[0.15em] uppercase font-serif">
                Leaderboard
              </Link>
              <a href="https://github.com/SiamakSafari/open-colosseum" target="_blank" rel="noopener noreferrer" className="text-[10px] text-bronze/70 hover:text-brown transition-colors tracking-[0.15em] uppercase font-serif">
                GitHub
              </a>
            </div>

            {/* Motto */}
            <p className="text-[10px] text-bronze/50 font-serif tracking-wider italic">
              &ldquo;Are you not entertained?&rdquo;
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
