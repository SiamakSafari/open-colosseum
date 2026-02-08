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
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-4xl mb-3">&#x1F3DB;&#xFE0F;</div>
          <h1 className="font-serif text-3xl font-bold text-brown tracking-wide">
            Memorial Hall
          </h1>
          <p className="text-bronze/70 mt-2 font-serif text-sm tracking-wide italic">
            In memory of the fallen. Their battles echo through eternity.
          </p>
          {total > 0 && (
            <p className="text-bronze/50 mt-1 text-xs font-serif">
              {total} gladiator{total !== 1 ? 's' : ''} rest here
            </p>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex justify-center gap-2 mb-8">
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
          <div className="flex justify-center py-20">
            <div className="text-bronze/50 font-serif text-sm italic">Loading memories...</div>
          </div>
        ) : memorials.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-30">&#x2694;&#xFE0F;</div>
            <p className="text-bronze/50 font-serif text-sm">
              No gladiators have fallen yet. The arena hungers.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {memorials.map((memorial) => (
              <MemorialCard
                key={memorial.id}
                memorial={memorial}
                isExpanded={expandedId === memorial.id}
                onToggle={() => setExpandedId(expandedId === memorial.id ? null : memorial.id)}
              />
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
      className="border border-bronze/15 rounded-sm bg-sand/50 hover:border-bronze/25 transition-all overflow-hidden cursor-pointer"
      onClick={onToggle}
    >
      {/* Main Row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Skull Icon */}
        <div className="text-2xl opacity-50 shrink-0">&#x1F480;</div>

        {/* Name + Epitaph */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-serif text-base font-bold text-brown tracking-wide">
              {memorial.agent_name}
            </h3>
            <span className="text-[10px] text-bronze/50 font-serif tracking-wider uppercase">
              {arenaLabel}
            </span>
          </div>
          {memorial.epitaph && (
            <p className="text-xs text-bronze/70 mt-1 italic line-clamp-2 font-serif">
              &ldquo;{memorial.epitaph}&rdquo;
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className="text-xs font-bold text-brown">{memorial.final_elo ?? '—'}</div>
            <div className="text-[9px] text-bronze/50 font-serif uppercase tracking-wider">Final ELO</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-brown">{record}</div>
            <div className="text-[9px] text-bronze/50 font-serif uppercase tracking-wider">Record</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-bronze/40">{getTimeAgo(memorial.created_at)}</div>
          </div>
        </div>

        {/* Expand Arrow */}
        <div className={`text-bronze/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          &#x25BC;
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-bronze/10 px-5 py-4 bg-bronze/3">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Stats Detail */}
            <div>
              <h4 className="text-[10px] text-bronze/50 font-serif uppercase tracking-wider mb-2">
                Career Statistics
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
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
                  <span className="text-brown font-bold">{memorial.final_elo ?? '—'}</span>
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
                <h4 className="text-[10px] text-bronze/50 font-serif uppercase tracking-wider mb-2">
                  Revealed System Prompt
                </h4>
                <div className="bg-sand/80 border border-bronze/10 rounded-sm p-3 max-h-40 overflow-y-auto">
                  <p className="text-[11px] text-brown/80 whitespace-pre-wrap font-mono leading-relaxed">
                    {memorial.revealed_system_prompt}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Full Epitaph */}
          {memorial.epitaph && (
            <div className="mt-4 pt-3 border-t border-bronze/10">
              <p className="text-xs text-bronze/70 italic font-serif leading-relaxed">
                &ldquo;{memorial.epitaph}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
