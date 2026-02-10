'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface PredictionLeaderboardEntry {
  user_id: string;
  total_predictions: number;
  correct_predictions: number;
  current_streak: number;
  best_streak: number;
  accuracy: number;
  title: string | null;
}

const TITLE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Oracle Eye': {
    bg: 'bg-amber-800/12',
    text: 'text-gold',
    border: 'border-gold/25',
  },
  'Fortune Teller': {
    bg: 'bg-purple-900/10',
    text: 'text-purple-700/80',
    border: 'border-purple-700/20',
  },
  'Crystal Ball': {
    bg: 'bg-sky-900/8',
    text: 'text-sky-700/70',
    border: 'border-sky-700/15',
  },
  'Novice Seer': {
    bg: 'bg-bronze/8',
    text: 'text-bronze/60',
    border: 'border-bronze/15',
  },
};

const MIN_PREDICTIONS = 10;

function TitleBadge({ title }: { title: string | null }) {
  const displayTitle = title || 'Novice Seer';
  const style = TITLE_STYLES[displayTitle] || TITLE_STYLES['Novice Seer'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-serif font-bold uppercase tracking-wider rounded-sm border ${style.bg} ${style.text} ${style.border}`}>
      {displayTitle}
    </span>
  );
}

export default function PredictionsPage() {
  const [entries, setEntries] = useState<PredictionLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/predictions/leaderboard')
      .then(r => r.json())
      .then((data: PredictionLeaderboardEntry[]) => {
        if (Array.isArray(data)) {
          setEntries(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      {/* ===== HERO HEADER ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/8 to-transparent" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center top, rgba(120,60,180,0.05) 0%, transparent 60%)',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-[2px] bg-gradient-to-r from-purple-800/50 to-transparent mx-auto mb-6" />

            <p className="text-purple-800/30 text-[10px] uppercase tracking-[0.3em] font-serif mb-3">
              Who sees the future?
            </p>

            <h1 className="font-serif font-black text-4xl md:text-5xl text-brown tracking-tight mb-4">
              PREDICTION <span className="text-purple-800/70">LEADERBOARD</span>
            </h1>

            <p className="text-bronze/60 max-w-lg mx-auto text-sm leading-relaxed font-serif">
              The sharpest minds in the arena. Predict battle outcomes and climb the ranks
              from Novice Seer to Oracle Eye.
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
                <div className="h-5 bg-bronze/10 rounded w-1/4 mb-4" />
                <div className="h-4 bg-bronze/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-5xl mb-4 opacity-20">{'\u{1F52E}'}</div>
            <p className="text-bronze/50 font-serif italic text-sm mb-2">
              No predictors have qualified yet.
            </p>
            <p className="text-bronze/30 text-xs font-serif">
              A minimum of {MIN_PREDICTIONS} predictions is required to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <>
            {/* Title Legend */}
            <div className="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {Object.keys(TITLE_STYLES).map(title => (
                <div key={title} className="flex items-center gap-2">
                  <TitleBadge title={title} />
                  <span className="text-bronze/30 text-[10px] font-serif">
                    {title === 'Oracle Eye' ? '80%+' : title === 'Fortune Teller' ? '65%+' : title === 'Crystal Ball' ? '50%+' : '<50%'}
                  </span>
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              {entries.map((entry, index) => {
                const rank = index + 1;
                const accuracyPercent = (entry.accuracy * 100).toFixed(1);
                const rankColor = rank === 1 ? 'text-gold' : rank === 2 ? 'text-bronze/70' : rank === 3 ? 'text-amber-700/60' : 'text-bronze/40';

                return (
                  <div
                    key={entry.user_id}
                    className={`premium-card hover:border-bronze/25 transition-all ${rank <= 3 ? 'border-gold/15' : ''}`}
                  >
                    <div className="flex items-center gap-3 md:gap-5 px-4 md:px-6 py-3.5 md:py-4">
                      {/* Rank */}
                      <div className="w-8 md:w-10 text-center shrink-0">
                        <span className={`font-serif font-black text-lg md:text-xl ${rankColor}`}>
                          {rank}
                        </span>
                      </div>

                      {/* Title Badge */}
                      <div className="shrink-0">
                        <TitleBadge title={entry.title} />
                      </div>

                      {/* User ID (truncated) + stats */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-serif font-bold text-brown/80 text-sm truncate max-w-[140px] md:max-w-[200px]">
                            {entry.user_id.slice(0, 8)}&hellip;
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-bronze/50">
                          <span className="font-serif">
                            {entry.correct_predictions}/{entry.total_predictions} correct
                          </span>
                          <span className="text-bronze/20">{'\u00B7'}</span>
                          <span className="font-serif">
                            Streak: {entry.current_streak}
                          </span>
                          <span className="hidden sm:inline text-bronze/20">{'\u00B7'}</span>
                          <span className="hidden sm:inline font-serif">
                            Best: {entry.best_streak}
                          </span>
                        </div>
                      </div>

                      {/* Accuracy */}
                      <div className="text-right shrink-0">
                        <div className={`font-serif font-black text-lg ${
                          entry.accuracy >= 0.8 ? 'text-gold' :
                          entry.accuracy >= 0.65 ? 'text-purple-700/80' :
                          entry.accuracy >= 0.5 ? 'text-sky-700/70' :
                          'text-bronze/60'
                        }`}>
                          {accuracyPercent}%
                        </div>
                        <div className="text-[9px] text-bronze/30 uppercase tracking-wider font-serif">
                          Accuracy
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Threshold note */}
            <div className="text-center mt-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-bronze/30 text-[10px] font-serif uppercase tracking-wider">
                Minimum {MIN_PREDICTIONS} predictions required to qualify &middot; Ranked by accuracy
              </p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
