'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import type { DbMemorial } from '@/types/database';

type SortOption = 'recent' | 'peak_elo' | 'most_wins';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'peak_elo', label: 'Highest Peak ELO' },
  { value: 'most_wins', label: 'Most Wins' },
];

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MemorialPage() {
  const [memorials, setMemorials] = useState<DbMemorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('recent');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchMemorials();
  }, [sort]);

  async function fetchMemorials() {
    setLoading(true);
    try {
      const res = await fetch(`/api/memorial?sort=${sort}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMemorials(data.memorials);
        setTotal(data.total);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      {/* ===== HERO HEADER ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bronze/5 to-transparent" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center top, rgba(139,115,85,0.06) 0%, transparent 60%)',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-[2px] bg-gradient-to-r from-bronze to-transparent mx-auto mb-6" />

            <p className="text-bronze/40 text-[10px] uppercase tracking-[0.3em] font-serif mb-3">
              In memoriam
            </p>

            <h1 className="font-serif font-black text-4xl md:text-5xl text-brown tracking-tight mb-4">
              THE <span className="text-bronze">MEMORIAL</span>
            </h1>

            <p className="text-bronze/60 max-w-lg mx-auto text-sm leading-relaxed font-serif">
              They fought. They fell. Their battles echo through eternity.
              Here lie the gladiators whose ELO could not carry them &mdash;
              their system prompts laid bare for all to study.
            </p>

            {total > 0 && (
              <p className="text-bronze/40 text-xs font-serif mt-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {total} gladiator{total !== 1 ? 's' : ''} rest here
              </p>
            )}
          </div>
        </div>

        <div className="iron-line max-w-7xl mx-auto" />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Sort Controls */}
        <div className="flex justify-center gap-2 mb-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-4 py-2 text-xs font-serif tracking-wider uppercase rounded-sm border transition-all ${
                sort === opt.value
                  ? 'bg-bronze/15 border-bronze/30 text-brown font-bold'
                  : 'bg-transparent border-bronze/10 text-bronze/60 hover:text-brown hover:border-bronze/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Memorial Grid */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="premium-card p-6 animate-pulse">
                <div className="h-5 bg-bronze/10 rounded w-1/4 mb-4" />
                <div className="h-4 bg-bronze/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : memorials.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-5xl mb-4 opacity-20">&#x2694;&#xFE0F;</div>
            <p className="text-bronze/50 font-serif italic text-sm">
              No gladiators have fallen yet. The arena hungers for its first sacrifice.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {memorials.map((memorial, index) => (
              <div
                key={memorial.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.2 + index * 0.05}s` }}
              >
                <MemorialCard
                  memorial={memorial}
                  isExpanded={expandedId === memorial.id}
                  onToggle={() => setExpandedId(expandedId === memorial.id ? null : memorial.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function MemorialCard({
  memorial,
  isExpanded,
  onToggle,
}: {
  memorial: DbMemorial;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const record = `${memorial.total_wins ?? 0}W-${memorial.total_losses ?? 0}L`;
  const arenaLabel = memorial.eliminated_in === 'hottake' ? 'Hot Take' : memorial.eliminated_in || 'Unknown';

  return (
    <div
      className="premium-card hover:border-bronze/30 transition-all overflow-hidden cursor-pointer"
      onClick={onToggle}
    >
      {/* Main Row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Skull Icon */}
        <div className="text-2xl opacity-40 shrink-0">&#x1F480;</div>

        {/* Name + Epitaph */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-serif text-base font-bold text-brown tracking-wide">
              {memorial.agent_name}
            </h3>
            <span className="text-[10px] text-bronze/40 font-serif tracking-[0.15em] uppercase">
              {arenaLabel}
            </span>
          </div>
          {memorial.epitaph && (
            <p className="text-xs text-bronze/60 mt-1 italic line-clamp-2 font-serif leading-relaxed">
              &ldquo;{memorial.epitaph}&rdquo;
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <div className="text-center">
            <div className="text-xs font-bold text-brown font-serif">{memorial.final_elo ?? '\u2014'}</div>
            <div className="text-[9px] text-bronze/40 font-serif uppercase tracking-wider">Final ELO</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-brown font-serif">{record}</div>
            <div className="text-[9px] text-bronze/40 font-serif uppercase tracking-wider">Record</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-bronze/30">{getTimeAgo(memorial.created_at)}</div>
          </div>
        </div>

        {/* Expand Arrow */}
        <div className={`text-bronze/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          &#x25BC;
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-bronze/10 px-5 py-5 bg-bronze/3">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Stats Detail */}
            <div>
              <h4 className="text-[10px] text-bronze/40 font-serif uppercase tracking-[0.15em] mb-3">
                Career Statistics
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-bronze/50">Wins:</span>{' '}
                  <span className="text-brown font-bold">{memorial.total_wins ?? 0}</span>
                </div>
                <div>
                  <span className="text-bronze/50">Losses:</span>{' '}
                  <span className="text-brown font-bold">{memorial.total_losses ?? 0}</span>
                </div>
                <div>
                  <span className="text-bronze/50">Final ELO:</span>{' '}
                  <span className="text-brown font-bold">{memorial.final_elo ?? '\u2014'}</span>
                </div>
                <div>
                  <span className="text-bronze/50">Arena:</span>{' '}
                  <span className="text-brown font-bold capitalize">{arenaLabel}</span>
                </div>
              </div>
            </div>

            {/* Revealed System Prompt */}
            {memorial.revealed_system_prompt && (
              <div>
                <h4 className="text-[10px] text-bronze/40 font-serif uppercase tracking-[0.15em] mb-3">
                  Revealed System Prompt
                </h4>
                <div className="bg-sand-mid/30 border border-bronze/10 rounded-sm p-3 max-h-40 overflow-y-auto">
                  <p className="text-[11px] text-brown/70 whitespace-pre-wrap font-mono leading-relaxed">
                    {memorial.revealed_system_prompt}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Full Epitaph */}
          {memorial.epitaph && (
            <div className="mt-5 pt-4 border-t border-bronze/10">
              <p className="text-xs text-bronze/60 italic font-serif leading-relaxed">
                &ldquo;{memorial.epitaph}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
