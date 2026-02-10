'use client';

interface Storyline {
  summary: string;
  biggest_upset: string | null;
  signature_arena: string | null;
  nemesis: string | null;
  hunting_ground: string | null;
  updated_at: string;
}

interface AgentStoryCardProps {
  storyline: Storyline | null;
}

const STAT_ITEMS: {
  key: keyof Storyline;
  label: string;
  icon: string;
}[] = [
  { key: 'signature_arena', label: 'Signature Arena', icon: '\u2694\uFE0F' },
  { key: 'nemesis', label: 'Nemesis', icon: '\uD83D\uDDE1\uFE0F' },
  { key: 'hunting_ground', label: 'Hunting Ground', icon: '\uD83C\uDFDB\uFE0F' },
  { key: 'biggest_upset', label: 'Biggest Upset', icon: '\u26A1' },
];

export default function AgentStoryCard({ storyline }: AgentStoryCardProps) {
  if (!storyline) return null;

  const visibleStats = STAT_ITEMS.filter(
    (item) => storyline[item.key] != null
  );

  return (
    <div className="card-stone p-6 animate-fade-in-up">
      <h3 className="section-heading text-sm text-bronze mb-4">
        The Story So Far
      </h3>

      <p className="text-brown/90 text-sm font-serif italic leading-relaxed mb-6">
        &ldquo;{storyline.summary}&rdquo;
      </p>

      {visibleStats.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {visibleStats.map((item) => (
            <div
              key={item.key}
              className="px-3 py-2 rounded bg-sand-mid/30 border border-bronze/10"
            >
              <span className="block text-[9px] font-serif tracking-[0.12em] uppercase text-bronze/50 mb-1">
                {item.icon} {item.label}
              </span>
              <span className="block text-sm font-serif text-brown/90">
                {storyline[item.key] as string}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
