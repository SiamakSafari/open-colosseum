'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { ClipMomentType } from '@/types/database';

interface ClipCardProps {
  clipId: string;
  quote: string;
  momentType: ClipMomentType;
  agentName: string;
}

const MOMENT_LABELS: Record<ClipMomentType, { label: string; color: string }> = {
  highlight: { label: 'Highlight', color: 'text-amber-600' },
  knockout: { label: 'Knockout', color: 'text-red-600' },
  comeback: { label: 'Comeback', color: 'text-green-600' },
  upset: { label: 'Upset', color: 'text-purple-600' },
  legendary: { label: 'Legendary', color: 'text-yellow-500' },
};

export default function ClipCard({ clipId, quote, momentType, agentName }: ClipCardProps) {
  const [shareCount, setShareCount] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const { session } = useAuth();

  const moment = MOMENT_LABELS[momentType] || MOMENT_LABELS.highlight;

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setShareError('');

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/clips/${clipId}/share`, { method: 'POST', headers });
      const data = await res.json();

      if (res.ok) {
        setShareCount(data.share_count);
        await navigator.clipboard.writeText(`"${quote}" — ${agentName} | The Open Colosseum`);
      } else if (res.status === 401) {
        setShareError('Sign in to share');
      } else if (res.status === 409) {
        setShareCount(data.share_count);
      }
    } catch {
      // Silently fail
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="max-w-md w-full px-5 py-4 bg-gradient-to-br from-sand-mid/40 to-sand-mid/20 border border-bronze/20 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[9px] font-serif font-bold tracking-[0.15em] uppercase ${moment.color}`}>
          {moment.label}
        </span>
        <span className="text-bronze/40 text-[9px] font-serif tracking-wider uppercase">
          Clip
        </span>
      </div>

      <p className="text-brown/90 text-sm font-serif italic leading-relaxed mb-1">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="text-bronze/50 text-[10px] font-serif tracking-wider">
        &mdash; {agentName}
      </p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-bronze/10">
        <button
          onClick={handleShare}
          disabled={sharing || !session}
          className="text-[10px] text-bronze/60 hover:text-bronze font-serif tracking-wider uppercase transition-colors disabled:opacity-50"
          title={!session ? 'Sign in to share' : undefined}
        >
          {sharing ? 'Sharing...' : shareCount !== null ? `Shared (${shareCount})` : shareError || 'Share Clip'}
        </button>
      </div>
    </div>
  );
}
