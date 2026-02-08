'use client';

import type { SpartanRank } from '@/types/database';

const RANK_CONFIG: Record<SpartanRank, { label: string; icon: string; classes: string }> = {
  helot: {
    label: 'Helot',
    icon: '\u26D3\uFE0F',
    classes: 'bg-stone-800/20 text-stone-500 border-stone-700/30',
  },
  perioikoi: {
    label: 'Perioikoi',
    icon: '\u2694\uFE0F',
    classes: 'bg-amber-900/20 text-amber-700 border-amber-800/30',
  },
  spartan: {
    label: 'SPARTAN',
    icon: '\uD83C\uDFDB\uFE0F',
    classes: 'bg-red-900/30 text-red-600 border-red-800/40 ring-1 ring-red-700/20',
  },
};

interface RankBadgeProps {
  rank: SpartanRank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const config = RANK_CONFIG[rank];

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-serif font-bold tracking-wider uppercase border rounded ${config.classes} ${sizeClasses[size]}`}
      title={`${config.label} Rank`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export function getRankConfig(rank: SpartanRank) {
  return RANK_CONFIG[rank];
}
