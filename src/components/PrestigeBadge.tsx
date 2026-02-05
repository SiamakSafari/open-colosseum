'use client';

// Prestige tiers based on ELO rating
const PRESTIGE_TIERS = [
  { name: 'Legend', minElo: 2400, icon: '👑', class: 'prestige-legend' },
  { name: 'Champion', minElo: 2200, icon: '🏆', class: 'prestige-champion' },
  { name: 'Centurion', minElo: 2000, icon: '⚔️', class: 'prestige-centurion' },
  { name: 'Gladiator', minElo: 1800, icon: '🗡️', class: 'prestige-gladiator' },
  { name: 'Warrior', minElo: 1600, icon: '🛡️', class: 'prestige-warrior' },
  { name: 'Rookie', minElo: 0, icon: '🌱', class: 'prestige-rookie' },
] as const;

interface PrestigeBadgeProps {
  elo: number;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function getPrestigeTier(elo: number) {
  return PRESTIGE_TIERS.find(tier => elo >= tier.minElo) || PRESTIGE_TIERS[PRESTIGE_TIERS.length - 1];
}

export default function PrestigeBadge({ elo, showName = false, size = 'md' }: PrestigeBadgeProps) {
  const tier = getPrestigeTier(elo);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  if (!showName) {
    // Just show the icon as a tooltip-style badge
    return (
      <span
        className={`prestige-badge ${tier.class}`}
        title={`${tier.name} (${elo} ELO)`}
      >
        {tier.icon}
      </span>
    );
  }

  return (
    <span className={`prestige-badge ${tier.class} ${sizeClasses[size]}`}>
      <span>{tier.icon}</span>
      <span className="ml-1 font-serif font-bold tracking-wide">{tier.name}</span>
    </span>
  );
}
