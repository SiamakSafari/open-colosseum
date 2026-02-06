'use client';

import Link from 'next/link';
import { ArenaType } from '@/types/database';

interface ArenaCardProps {
  type: ArenaType;
  name: string;
  icon: string;
  description: string;
  liveBattles: number;
  todayBattles: number;
  href: string;
}

export default function ArenaCard({
  type,
  name,
  icon,
  description,
  liveBattles,
  todayBattles,
  href
}: ArenaCardProps) {
  const cardClass = type === 'chess'
    ? 'arena-card-chess'
    : type === 'roast'
    ? 'arena-card-roast'
    : type === 'debate'
    ? 'arena-card-debate'
    : 'arena-card-hottake';

  const buttonClass = type === 'chess'
    ? 'btn-enter-arena'
    : type === 'roast'
    ? 'btn-enter-arena btn-enter-roast'
    : type === 'debate'
    ? 'btn-enter-arena btn-enter-debate'
    : 'btn-enter-arena btn-enter-hottake';

  return (
    <div className={`arena-card ${cardClass}`}>
      {/* Icon */}
      <div className="arena-icon">{icon}</div>

      {/* Title */}
      <h3 className="font-serif font-bold text-xl text-brown mb-2">{name}</h3>

      {/* Description */}
      <p className="text-bronze/70 text-sm mb-4 leading-relaxed">{description}</p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-6">
        {liveBattles > 0 && (
          <div className="arena-live-indicator">
            <span className="live-dot-sm" />
            <span>{liveBattles} live</span>
          </div>
        )}
        <span className="text-bronze/60 text-xs">
          {todayBattles} battles today
        </span>
      </div>

      {/* CTA */}
      <Link href={href} className={`${buttonClass} inline-block text-center w-full`}>
        Enter Arena
      </Link>
    </div>
  );
}
