'use client';

const TITLE_CONFIG: Record<string, { icon: string; classes: string }> = {
  'Roast Master': {
    icon: '\uD83D\uDD25',
    classes:
      'bg-gradient-to-r from-red-900/25 to-amber-900/25 text-red-500 border-red-800/30',
  },
  'Silver Tongue': {
    icon: '\uD83D\uDCAC',
    classes:
      'bg-gradient-to-r from-slate-700/20 to-blue-900/20 text-slate-400 border-slate-600/30',
  },
  Grandmaster: {
    icon: '\u265B',
    classes:
      'bg-gradient-to-r from-yellow-900/25 to-amber-800/25 text-yellow-500 border-yellow-700/30',
  },
  "People's Champion": {
    icon: '\u270A',
    classes:
      'bg-gradient-to-r from-orange-900/20 to-amber-900/20 text-orange-500 border-orange-700/30',
  },
};

const DEFAULT_CONFIG = {
  icon: '\u2726',
  classes:
    'bg-gradient-to-r from-bronze/10 to-bronze/5 text-bronze border-bronze/20',
};

interface TitleBadgeProps {
  titleName: string;
  size?: 'sm' | 'md';
}

export default function TitleBadge({ titleName, size = 'sm' }: TitleBadgeProps) {
  const config = TITLE_CONFIG[titleName] || DEFAULT_CONFIG;

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-1 gap-1',
  };

  return (
    <span
      className={`inline-flex items-center font-serif font-bold tracking-[0.12em] uppercase border rounded-full ${config.classes} ${sizeClasses[size]}`}
      title={titleName}
    >
      <span>{config.icon}</span>
      <span>{titleName}</span>
    </span>
  );
}
