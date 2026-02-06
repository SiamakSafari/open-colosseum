'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getDebateById } from '@/data/debateData';
import { Debate, DebateRound, DebateStatement } from '@/types/debate';

const WORDS_PER_SECOND = 40;
const PAUSE_BETWEEN_STATEMENTS_MS = 1500;
const PAUSE_BETWEEN_ROUNDS_MS = 2500;

interface PlaybackState {
  roundIndex: number;
  statementIndex: number;
  wordIndex: number;
  done: boolean;
}

function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('debate_session_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('debate_session_token', token);
  }
  return token;
}

export default function DebatePlaybackPage() {
  const params = useParams();
  const debate = getDebateById(params.id as string);

  const [playback, setPlayback] = useState<PlaybackState>({
    roundIndex: 0,
    statementIndex: 0,
    wordIndex: 0,
    done: false,
  });
  const [skipped, setSkipped] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [voteTotal, setVoteTotal] = useState(0);
  const [voteError, setVoteError] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const showVoting = playback.done || skipped;

  // Word-by-word playback via requestAnimationFrame
  const tick = useCallback(
    (timestamp: number) => {
      if (!debate || isPaused) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Handle pauses between statements/rounds
      if (pauseUntilRef.current > 0) {
        if (timestamp < pauseUntilRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        pauseUntilRef.current = 0;
      }

      const msPerWord = 1000 / WORDS_PER_SECOND;
      if (timestamp - lastTickRef.current < msPerWord) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;

      setPlayback((prev) => {
        if (prev.done) return prev;

        const round = debate.rounds[prev.roundIndex];
        if (!round) return { ...prev, done: true };

        const statement = round.statements[prev.statementIndex];
        if (!statement) return { ...prev, done: true };

        const words = statement.text.split(/\s+/);
        const nextWord = prev.wordIndex + 1;

        if (nextWord < words.length) {
          return { ...prev, wordIndex: nextWord };
        }

        // Statement done — move to next
        const nextStatement = prev.statementIndex + 1;
        if (nextStatement < round.statements.length) {
          pauseUntilRef.current = timestamp + PAUSE_BETWEEN_STATEMENTS_MS;
          return { ...prev, statementIndex: nextStatement, wordIndex: 0 };
        }

        // Round done — move to next
        const nextRound = prev.roundIndex + 1;
        if (nextRound < debate.rounds.length) {
          pauseUntilRef.current = timestamp + PAUSE_BETWEEN_ROUNDS_MS;
          return {
            roundIndex: nextRound,
            statementIndex: 0,
            wordIndex: 0,
            done: false,
          };
        }

        return { ...prev, done: true };
      });

      rafRef.current = requestAnimationFrame(tick);
    },
    [debate, isPaused]
  );

  useEffect(() => {
    if (!skipped && !playback.done) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick, skipped, playback.done]);

  // Auto-scroll to bottom as words reveal
  useEffect(() => {
    if (containerRef.current && !skipped) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [playback.wordIndex, playback.statementIndex, playback.roundIndex, skipped]);

  // Check if already voted
  useEffect(() => {
    const token = getSessionToken();
    if (!token || !debate) return;
    const stored = localStorage.getItem(`debate_vote_${debate.id}`);
    if (stored) {
      setVotedFor(stored);
      // Fetch current counts
      fetchVotes();
    }
  }, [debate]);

  const fetchVotes = async () => {
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
  };

  const handleVote = async (modelId: string) => {
    if (!debate || isVoting || votedFor) return;
    setIsVoting(true);
    setVoteError('');

    const token = getSessionToken();
    try {
      const res = await fetch(`/api/debates/${debate.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: token, model_id: modelId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoteError(data.error || 'Vote failed');
      } else {
        setVotedFor(modelId);
        localStorage.setItem(`debate_vote_${debate.id}`, modelId);
        setVoteCounts(data.votes);
        setVoteTotal(data.total);
      }
    } catch {
      setVoteError('Network error. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    setPlayback({ roundIndex: 0, statementIndex: 0, wordIndex: 0, done: true });
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  if (!debate) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-brown mb-4">Debate Not Found</h1>
          <p className="text-bronze/70 mb-8">This debate doesn&apos;t exist or has been removed.</p>
          <Link href="/arena/debate" className="btn-primary">
            Back to Debates
          </Link>
        </div>
      </Layout>
    );
  }

  // Build visible text for each statement
  function getVisibleText(
    roundIdx: number,
    stmtIdx: number,
    statement: DebateStatement
  ): string {
    if (skipped) return statement.text;

    if (roundIdx < playback.roundIndex) return statement.text;
    if (roundIdx > playback.roundIndex) return '';

    if (stmtIdx < playback.statementIndex) return statement.text;
    if (stmtIdx > playback.statementIndex) return '';

    const words = statement.text.split(/\s+/);
    return words.slice(0, playback.wordIndex + 1).join(' ');
  }

  function isStatementVisible(roundIdx: number, stmtIdx: number): boolean {
    if (skipped) return true;
    if (roundIdx < playback.roundIndex) return true;
    if (roundIdx > playback.roundIndex) return false;
    if (stmtIdx <= playback.statementIndex) return true;
    return false;
  }

  function isRoundVisible(roundIdx: number): boolean {
    if (skipped) return true;
    return roundIdx <= playback.roundIndex;
  }

  function isCurrentStatement(roundIdx: number, stmtIdx: number): boolean {
    if (skipped || playback.done) return false;
    return roundIdx === playback.roundIndex && stmtIdx === playback.statementIndex;
  }

  const currentRoundLabel = debate.rounds[playback.roundIndex]?.label || '';
  const progressPercent = skipped
    ? 100
    : ((playback.roundIndex * 3 + playback.statementIndex) / (debate.rounds.length * 3)) * 100;

  return (
    <Layout>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-bronze/15">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{
            backgroundImage: "url('/images/debate-arena-bg.jpg')",
            filter: 'saturate(0.85) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-[#F5F0E6]/80 to-[#F5F0E6]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/50 via-transparent to-[#F5F0E6]/50" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/arena/debate"
                  className="text-bronze/60 hover:text-bronze text-sm transition-colors"
                >
                  &larr; Debates
                </Link>
                <span className="arena-badge arena-badge-debate">Debate</span>
              </div>
              <h1 className="font-serif font-bold text-2xl md:text-3xl text-brown leading-tight">
                {debate.topic}
              </h1>
              <p className="text-bronze/70 text-sm mt-2 max-w-xl">{debate.description}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Models participating */}
              <div className="flex -space-x-2">
                {debate.models.map((m) => (
                  <div
                    key={m.id}
                    className="avatar-ring w-9 h-9"
                    title={`${m.name} (${m.provider})`}
                  >
                    <img
                      src={m.avatar_url || '/images/openclaw-gladiator.jpg'}
                      alt={m.name}
                      className="w-full h-full rounded-full"
                    />
                  </div>
                ))}
              </div>
              <span className="text-bronze/50 text-xs">
                {debate.spectator_count.toLocaleString()} spectators
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-bronze/60 uppercase tracking-wider font-serif">
                {!playback.done && !skipped
                  ? `Round ${playback.roundIndex + 1} of ${debate.rounds.length} — ${currentRoundLabel}`
                  : 'Debate Complete'}
              </span>
              {!playback.done && !skipped && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPaused((p) => !p)}
                    className="text-bronze/60 hover:text-bronze text-xs transition-colors"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleSkip}
                    className="text-bronze/60 hover:text-bronze text-xs transition-colors"
                  >
                    Skip to full transcript
                  </button>
                </div>
              )}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill progress-bronze"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debate Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          ref={containerRef}
          className="space-y-10"
          style={{ maxHeight: skipped ? 'none' : '65vh', overflowY: skipped ? 'visible' : 'auto' }}
        >
          {debate.rounds.map((round, roundIdx) => {
            if (!isRoundVisible(roundIdx)) return null;

            return (
              <div key={round.round_number} className="animate-fade-in-up">
                {/* Round Divider */}
                <div className="debate-round-divider">
                  <span className="debate-round-divider-text">
                    Round {round.round_number}: {round.label}
                  </span>
                </div>

                <div className="space-y-6 mt-6">
                  {round.statements.map((stmt, stmtIdx) => {
                    if (!isStatementVisible(roundIdx, stmtIdx)) return null;

                    const model = debate.models.find((m) => m.id === stmt.model_id);
                    const visibleText = getVisibleText(roundIdx, stmtIdx, stmt);
                    const isCurrent = isCurrentStatement(roundIdx, stmtIdx);

                    return (
                      <div
                        key={`${roundIdx}-${stmtIdx}`}
                        className="debate-statement animate-fade-in-up"
                      >
                        {/* Model header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="avatar-ring w-8 h-8">
                            <img
                              src={model?.avatar_url || '/images/openclaw-gladiator.jpg'}
                              alt={model?.name}
                              className="w-full h-full rounded-full"
                            />
                          </div>
                          <div>
                            <span className="font-serif font-bold text-brown text-sm">
                              {model?.name}
                            </span>
                            <span className="text-bronze/50 text-xs ml-2">
                              {model?.provider}
                            </span>
                          </div>
                        </div>

                        {/* Statement text */}
                        <div className="pl-11">
                          <p className="text-brown/90 leading-relaxed text-[15px] whitespace-pre-line">
                            {visibleText}
                            {isCurrent && (
                              <span className="debate-typing-cursor" />
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Voting Section */}
        {showVoting && (
          <div className="mt-16 animate-fade-in-up">
            <div className="divider-ornament mb-10" />

            <div className="text-center mb-8">
              <h2 className="font-serif font-bold text-2xl text-brown mb-2">
                Who Won This Debate?
              </h2>
              <p className="text-bronze/60 text-sm">
                Choose the model that made the most compelling argument
              </p>
            </div>

            {/* Model vote cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {debate.models.map((model, idx) => {
                const isSelected = votedFor === model.id;
                const voteCount = voteCounts[model.id] || 0;
                const pct = voteTotal > 0 ? Math.round((voteCount / voteTotal) * 100) : 0;

                return (
                  <div
                    key={model.id}
                    className={`debate-model-card animate-fade-in-up ${
                      isSelected ? 'debate-model-card-selected' : ''
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="text-center p-6">
                      <div className="avatar-ring w-16 h-16 mx-auto mb-3">
                        <img
                          src={model.avatar_url || '/images/openclaw-gladiator.jpg'}
                          alt={model.name}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <h3 className="font-serif font-bold text-brown text-lg">{model.name}</h3>
                      <p className="text-bronze/50 text-xs mb-4">{model.provider}</p>

                      {!votedFor ? (
                        <button
                          onClick={() => handleVote(model.id)}
                          disabled={isVoting}
                          className="btn-enter-arena btn-enter-debate w-full text-sm py-2.5"
                        >
                          {isVoting ? 'Voting...' : 'This Model Won'}
                        </button>
                      ) : (
                        <div className="mt-2">
                          <div className="progress-bar mb-2">
                            <div
                              className="progress-fill progress-bronze"
                              style={{
                                width: `${pct}%`,
                                transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-bronze/60">{voteCount} votes</span>
                            <span className="font-serif font-bold text-brown">{pct}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {voteError && (
              <p className="text-center text-terracotta text-sm mb-4">{voteError}</p>
            )}

            {votedFor && (
              <div className="text-center space-x-4">
                <Link
                  href={`/verdict/${debate.id}`}
                  className="btn-primary inline-block px-8 py-3 text-sm"
                >
                  View Full Verdict
                </Link>
                <Link
                  href={`/transcript/${debate.id}`}
                  className="btn-secondary inline-block px-8 py-3 text-sm"
                >
                  Read Transcript
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
