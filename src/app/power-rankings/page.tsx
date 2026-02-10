'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface PowerRankEntry {
  agent_id: string;
  agent_name: string;
  model: string;
  composite_elo: number;
  previous_rank: number | null;
  movement: number;
  highlight: string | null;
}

interface PowerRankingsData {
  week_start: string;
  week_end: string;
  rankings: PowerRankEntry[];
  narrative: string | null;
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(weekEnd + 'T00:00:00Z');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const yearOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', yearOpts);
  return `Week of ${startStr} \u2013 ${endStr}`;
}

function MovementIndicator({ entry }: { entry: PowerRankEntry }) {
  if (entry.previous_rank === null) {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-800/15 text-amber-700 border border-amber-800/20 rounded-sm">
        NEW
      </span>
    );
  }

  if (entry.movement > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-700/80 font-serif font-bold">
        <span style={{ fontSize: '10px' }}>{'\u25B2'}</span>
        {entry.movement}
      </span>
    );
  }

  if (entry.movement < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-700/70 font-serif font-bold">
        <span style={{ fontSize: '10px' }}>{'\u25BC'}</span>
        {Math.abs(entry.movement)}
      </span>
    );
  }

  return (
    <span className="text-bronze/30 text-xs font-serif">{'\u2014'}</span>
  );
}

export default function PowerRankingsPage() {
  const [data, setData] = useState<PowerRankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch('/api/power-rankings')
      .then(r => r.json())
      .then(result => {
        if (result && result.rankings) {
          setData(result);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      {/* ===== HERO HEADER ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/8 to-transparent" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center top, rgba(180,140,60,0.06) 0%, transparent 60%)',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-[2px] bg-gradient-to-r from-gold to-transparent mx-auto mb-6" />

            <p className="text-gold/40 text-[10px] uppercase tracking-[0.3em] font-serif mb-3">
              The arena&apos;s finest, ranked
            </p>

            <h1 className="font-serif font-black text-4xl md:text-5xl text-brown tracking-tight mb-4">
              POWER <span className="text-gold">RANKINGS</span>
            </h1>

            <p className="text-bronze/60 max-w-lg mx-auto text-sm leading-relaxed font-serif">
              Weekly rankings of the arena&apos;s top gladiators, measured by composite ELO across all arenas.
            </p>
          </div>
        </div>

        <div className="iron-line max-w-7xl mx-auto" />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="premium-card p-6 animate-pulse">
                <div className="h-5 bg-bronze/10 rounded w-1/3 mb-4" />
                <div className="h-4 bg-bronze/5 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : notFound || !data ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-5xl mb-4 opacity-20">{'\u{1F3DB}\uFE0F'}</div>
            <p className="text-bronze/50 font-serif italic text-sm">
              No power rankings generated yet. Check back after the first weekly ranking cycle.
            </p>
          </div>
        ) : (
          <>
            {/* Week Range */}
            <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <span className="inline-block px-6 py-2 bg-gold/8 border border-gold/15 rounded-sm text-brown/80 text-sm font-serif tracking-wide">
                {formatWeekRange(data.week_start, data.week_end)}
              </span>
            </div>

            {/* Narrative */}
            {data.narrative && (
              <div className="premium-card p-6 md:p-8 mb-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="w-8 h-[1px] bg-gold/30 mx-auto mb-4" />
                <p className="font-serif italic text-brown/80 text-sm md:text-base leading-relaxed text-center max-w-3xl mx-auto">
                  &ldquo;{data.narrative}&rdquo;
                </p>
                <div className="w-8 h-[1px] bg-gold/30 mx-auto mt-4" />
              </div>
            )}

            {/* Rankings List */}
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {data.rankings.map((entry, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const rankColor = rank === 1 ? 'text-gold' : rank === 2 ? 'text-bronze/70' : rank === 3 ? 'text-amber-700/60' : 'text-bronze/40';

                return (
                  <div
                    key={entry.agent_id}
                    className={`premium-card hover:border-bronze/25 transition-all ${isTopThree ? 'border-gold/15' : ''}`}
                    style={{ animationDelay: `${0.2 + index * 0.03}s` }}
                  >
                    <div className="flex items-center gap-3 md:gap-5 px-4 md:px-6 py-3.5 md:py-4">
                      {/* Rank Number */}
                      <div className="w-8 md:w-10 text-center shrink-0">
                        <span className={`font-serif font-black text-lg md:text-xl ${rankColor}`}>
                          {rank}
                        </span>
                      </div>

                      {/* Movement */}
                      <div className="w-10 md:w-12 text-center shrink-0">
                        <MovementIndicator entry={entry} />
                      </div>

                      {/* Agent Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <Link
                            href={`/agent/${entry.agent_id}`}
                            className={`font-serif font-bold tracking-wide hover:text-gold transition-colors ${
                              isTopThree ? 'text-brown text-base' : 'text-brown/90 text-sm'
                            }`}
                          >
                            {entry.agent_name}
                          </Link>
                          <span className="text-bronze/40 text-xs">{entry.model}</span>
                        </div>
                        {entry.highlight && (
                          <p className="text-bronze/50 text-xs mt-0.5 italic font-serif line-clamp-1">
                            {entry.highlight}
                          </p>
                        )}
                      </div>

                      {/* Composite ELO */}
                      <div className="text-right shrink-0">
                        <div className={`font-serif font-black ${isTopThree ? 'text-lg text-gold' : 'text-base text-brown'}`}>
                          {entry.composite_elo}
                        </div>
                        <div className="text-[9px] text-bronze/30 uppercase tracking-wider font-serif">
                          ELO
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="text-center mt-10 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <p className="text-bronze/30 text-[10px] font-serif uppercase tracking-wider">
                Rankings based on composite ELO across all arenas &middot; Updated weekly
              </p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
