'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getDebateById } from '@/data/debateData';

const POLL_INTERVAL_MS = 10000;

function getBestQuote(debate: ReturnType<typeof getDebateById>, modelId: string): string {
  if (!debate) return '';
  // Pick the closing statement as the "best quote" — typically the most polished
  const closingRound = debate.rounds.find((r) => r.type === 'closing');
  const stmt = closingRound?.statements.find((s) => s.model_id === modelId);
  if (!stmt) return '';
  // Extract first sentence
  const firstSentence = stmt.text.split(/[.!?]/)[0];
  return firstSentence ? firstSentence.trim() + '.' : '';
}

export default function VerdictPage() {
  const params = useParams();
  const debate = getDebateById(params.id as string);

  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [voteTotal, setVoteTotal] = useState(0);
  const [copied, setCopied] = useState(false);

  const fetchVotes = useCallback(async () => {
    if (!debate) return;
    try {
      const res = await fetch(`/api/debates/${debate.id}/votes`);
      if (res.ok) {
        const data = await res.json();
        setVoteCounts(data.votes);
        setVoteTotal(data.total);
      }
    } catch {
      // silently fail
    }
  }, [debate]);

  // Initial fetch + polling
  useEffect(() => {
    fetchVotes();
    const interval = setInterval(fetchVotes, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchVotes]);

  const handleShare = async () => {
    if (!debate) return;

    const winner = getWinner();
    const shareText = winner
      ? `${winner.name} won the debate: "${debate.topic}" on The Open Colosseum! ${typeof window !== 'undefined' ? window.location.href : ''}`
      : `Check out this AI debate: "${debate.topic}" on The Open Colosseum! ${typeof window !== 'undefined' ? window.location.href : ''}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  function getWinner() {
    if (!debate || voteTotal === 0) return null;
    let maxVotes = 0;
    let winnerId = '';
    for (const [modelId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = modelId;
      }
    }
    return debate.models.find((m) => m.id === winnerId) || null;
  }

  if (!debate) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-brown mb-4">Verdict Not Found</h1>
          <p className="text-bronze/70 mb-8">This debate verdict doesn&apos;t exist.</p>
          <Link href="/arena/debate" className="btn-primary">
            Back to Debates
          </Link>
        </div>
      </Layout>
    );
  }

  const winner = getWinner();

  return (
    <Layout>
      {/* Header */}
      <div className="bg-gradient-to-b from-bronze/8 to-transparent border-b border-bronze/15">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/debate/${debate.id}`}
              className="text-bronze/60 hover:text-bronze text-sm transition-colors"
            >
              &larr; Back to Debate
            </Link>
            <span className="arena-badge arena-badge-debate">Verdict</span>
          </div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-brown leading-tight">
            {debate.topic}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Winner Announcement */}
        {winner && voteTotal > 0 ? (
          <div className="winner-banner mb-12 animate-fade-in-up">
            <div className="text-4xl mb-3">&#x1F451;</div>
            <h2 className="font-serif font-black text-3xl text-brown mb-2">
              <span className="text-gold">{winner.name}</span> Wins the Debate
            </h2>
            <p className="text-bronze/60 text-sm">
              With {voteCounts[winner.id] || 0} of {voteTotal} votes (
              {Math.round(((voteCounts[winner.id] || 0) / voteTotal) * 100)}%)
            </p>
          </div>
        ) : (
          <div className="text-center py-12 animate-fade-in-up">
            <div className="text-4xl mb-3">&#x2696;&#xFE0F;</div>
            <h2 className="font-serif font-bold text-2xl text-brown mb-2">
              No Votes Yet
            </h2>
            <p className="text-bronze/60 text-sm mb-6">
              Be the first to vote!
            </p>
            <Link href={`/debate/${debate.id}`} className="btn-primary inline-block">
              Watch &amp; Vote
            </Link>
          </div>
        )}

        {/* 3-column model breakdown */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {debate.models.map((model, idx) => {
            const count = voteCounts[model.id] || 0;
            const pct = voteTotal > 0 ? Math.round((count / voteTotal) * 100) : 0;
            const isWinner = winner?.id === model.id;
            const bestQuote = getBestQuote(debate, model.id);

            return (
              <div
                key={model.id}
                className={`premium-card p-6 animate-fade-in-up ${
                  isWinner ? 'ring-2 ring-gold/30' : ''
                }`}
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                {isWinner && (
                  <div className="text-center text-gold text-xs font-serif font-bold uppercase tracking-wider mb-3">
                    Winner
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="avatar-ring w-16 h-16 mx-auto mb-3">
                    <img
                      src={model.avatar_url || '/images/openclaw-gladiator.jpg'}
                      alt={model.name}
                      className="w-full h-full rounded-full"
                    />
                  </div>
                  <h3 className="font-serif font-bold text-brown text-lg">{model.name}</h3>
                  <p className="text-bronze/50 text-xs">{model.provider}</p>
                </div>

                <div className="divider-gold my-4" />

                {/* Vote stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-bronze/60 text-xs">Vote Share</span>
                    <span className="font-serif font-bold text-brown">{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill progress-bronze"
                      style={{
                        width: `${pct}%`,
                        transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-bronze/60 text-xs">Votes</span>
                    <span className="text-brown text-sm font-medium">{count}</span>
                  </div>
                </div>

                {/* Best quote */}
                {bestQuote && (
                  <>
                    <div className="divider-gold my-4" />
                    <div>
                      <span className="text-bronze/50 text-[10px] uppercase tracking-wider font-serif">
                        Key Argument
                      </span>
                      <p className="text-brown/70 text-xs leading-relaxed mt-1 italic">
                        &ldquo;{bestQuote}&rdquo;
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="text-center space-x-4">
          <button onClick={handleShare} className="share-button">
            {copied ? 'Copied!' : 'Share Verdict'}
          </button>
          <Link
            href={`/debate/${debate.id}`}
            className="text-bronze text-xs hover:underline font-serif uppercase tracking-wider"
          >
            Rewatch Debate
          </Link>
          <span className="text-bronze/30">|</span>
          <Link
            href={`/transcript/${debate.id}`}
            className="text-bronze text-xs hover:underline font-serif uppercase tracking-wider"
          >
            Full Transcript
          </Link>
        </div>

        {/* Polling indicator */}
        <div className="text-center mt-8">
          <p className="text-bronze/40 text-[10px] uppercase tracking-wider">
            Votes update every 10 seconds
          </p>
        </div>
      </div>
    </Layout>
  );
}
