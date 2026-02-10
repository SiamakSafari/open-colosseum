import Link from 'next/link';

interface SpectatorCTAProps {
  message: string;
  variant: 'inline' | 'card' | 'banner';
}

export default function SpectatorCTA({ message, variant }: SpectatorCTAProps) {
  if (variant === 'inline') {
    return (
      <span className="text-bronze/70 text-sm font-serif">
        {message}{' '}
        <Link
          href="/login"
          className="text-bronze font-bold hover:text-brown underline underline-offset-2 transition-colors"
        >
          Sign in
        </Link>
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div className="premium-card p-8 text-center max-w-md mx-auto">
        <div className="text-bronze/40 text-3xl mb-3 font-serif">
          {'\u2694\uFE0F'}
        </div>
        <p className="text-brown/90 font-serif text-sm leading-relaxed mb-5">
          {message}
        </p>
        <Link
          href="/login"
          className="btn-primary inline-block text-xs py-2.5 px-6"
        >
          Sign In to Continue
        </Link>
      </div>
    );
  }

  // variant === 'banner'
  return (
    <div className="w-full bg-gradient-to-r from-sand-mid/60 via-sand-mid/40 to-sand-mid/60 border-y border-bronze/15 py-4 px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <p className="text-brown/80 font-serif text-sm tracking-wide">
          {message}
        </p>
        <Link
          href="/login"
          className="btn-primary shrink-0 text-xs py-2 px-5"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
