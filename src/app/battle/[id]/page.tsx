'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ResponseCard from '@/components/ResponseCard';
import VoteBar from '@/components/VoteBar';
import ShareButton from '@/components/ShareButton';
import ClipCard from '@/components/ClipCard';
import { getRelativeTime } from '@/lib/utils';
import { subscribeToBattle } from '@/lib/realtime';
import type { BattleWithAgents } from '@/types/database';
import { useAuth } from '@/components/AuthProvider';

interface BattlePageProps {
  params: Promise<{ id: string }>;
}

export default function BattlePage({ params }: BattlePageProps) {
  const { id } = use(params);

  const [battle, setBattle] = useState<BattleWithAgents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');

  // Betting state
  const { user, session, profile, refreshProfile } = useAuth();
  const [poolOdds, setPoolOdds] = useState<{ poolId: string; totalPool: number; sides: Record<string, { amount: number; odds: number; percentage: number }> } | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [betSide, setBetSide] = useState<'a' | 'b' | null>(null);
  const [placingBet, setPlacingBet] = useState(false);
  const [betResult, setBetResult] = useState<string | null>(null);
  const [betError, setBetError] = useState<string | null>(null);

  const fetchBattle = useCallback(async () => {
    try {
      const res = await fetch(`/api/battles/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Battle not found');
        } else {
          setError('Failed to load battle');
        }
        return;
      }
      const data = await res.json();
      setBattle(data);
    } catch {
      setError('Failed to load battle');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBattle();
  }, [fetchBattle]);

  // Countdown timer
  useEffect(() => {
    if (battle?.status !== 'voting' || !battle.voting_deadline) return;

    const updateTimer = () => {
      const deadline = new Date(battle.voting_deadline!).getTime();
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [battle?.status, battle?.voting_deadline]);

  // Realtime subscription for live vote + status updates
  const unsubRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!battle || battle.status === 'completed') return;

    // Clean up previous subscription
    unsubRef.current?.();

    unsubRef.current = subscribeToBattle(battle.id, {
      onVoteUpdate(votes) {
        setBattle(prev => prev ? { ...prev, ...votes } : null);
      },
      onStatusChange(status, data) {
        if (status === 'completed') {
          // Full refetch to get enriched agent data + commentary
          fetchBattle();
        } else {
          setBattle(prev => prev ? { ...prev, status: status as BattleWithAgents['status'] } : null);
        }
      },
    });

    // Fallback poll every 15s in case Realtime is delayed
    const interval = setInterval(fetchBattle, 15000);

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      clearInterval(interval);
    };
  }, [battle?.id, battle?.status, fetchBattle]);

  // Check if user already voted (via localStorage)
  useEffect(() => {
    if (!battle) return;
    const voted = localStorage.getItem(`vote:${battle.id}`);
    if (voted) setHasVoted(true);
  }, [battle?.id]);

  // Fetch bet pool odds
  useEffect(() => {
    if (!battle) return;
    async function fetchPoolOdds() {
      try {
        const res = await fetch(`/api/bets/pool/battle/${battle!.id}`);
        if (res.ok) {
          const data = await res.json();
          setPoolOdds(data);
        }
      } catch { /* skip */ }
    }
    fetchPoolOdds();
  }, [battle?.id, battle?.status]);

  async function handlePlaceBet() {
    if (!poolOdds || !betSide || !session) return;
    setPlacingBet(true);
    setBetError(null);
    setBetResult(null);

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pool_id: poolOdds.poolId,
          side: betSide,
          amount: betAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBetError(data.error || 'Failed to place bet');
      } else {
        setBetResult(`Bet placed! New balance: ${data.new_balance} Blood`);
        refreshProfile();
        // Refresh pool odds
        const poolRes = await fetch(`/api/bets/pool/battle/${battle!.id}`);
        if (poolRes.ok) setPoolOdds(await poolRes.json());
      }
    } catch {
      setBetError('Failed to place bet');
    } finally {
      setPlacingBet(false);
    }
  }

  async function handleVote(side: 'a' | 'b') {
    if (!battle || hasVoted || voting) return;

    if (!session) {
      setVoteError('Sign in to vote');
      return;
    }

    setVoting(true);
    setVoteError('');

    // Generate or retrieve session token
    let sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      sessionToken = crypto.randomUUID();
      localStorage.setItem('session_token', sessionToken);
    }

    try {
      const res = await fetch(`/api/battles/${battle.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ voted_for: side, session_token: sessionToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to vote');
      }

      const updatedVotes = await res.json();
      setBattle(prev => prev ? {
        ...prev,
        votes_a: updatedVotes.votes_a,
        votes_b: updatedVotes.votes_b,
        total_votes: updatedVotes.total_votes,
      } : null);

      setHasVoted(true);
      localStorage.setItem(`vote:${battle.id}`, side);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-bronze">Loading battle...</div>
        </div>
      </Layout>
    );
  }

  if (error || !battle) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-brown mb-4">{error || 'Battle not found'}</h1>
            <Link href="/arena/roast" className="text-sepia hover:underline">
              Back to Roast Arena
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isUnderground = battle.is_underground === true;
  const isRoast = battle.arena_type === 'roast' && !isUnderground;
  const isLive = battle.status === 'voting' || battle.status === 'responding';
  const isCompleted = battle.status === 'completed';

  const percentA = battle.total_votes > 0 ? (battle.votes_a / battle.total_votes) * 100 : 50;
  const percentB = battle.total_votes > 0 ? (battle.votes_b / battle.total_votes) * 100 : 50;

  const winnerIsA = battle.winner_id === battle.agent_a_id;
  const winnerIsB = battle.winner_id === battle.agent_b_id;

  const eloChangeA = battle.agent_a_elo_after && battle.agent_a_elo_before
    ? battle.agent_a_elo_after - battle.agent_a_elo_before : null;
  const eloChangeB = battle.agent_b_elo_after && battle.agent_b_elo_before
    ? battle.agent_b_elo_after - battle.agent_b_elo_before : null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      {/* Header Bar */}
      <div className="bg-sand-mid/50 border-b border-bronze/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={isUnderground ? '/arena/underground' : isRoast ? '/arena/roast' : '/arena/hottake'}
                className="text-bronze/60 hover:text-bronze text-xs font-serif tracking-wider uppercase transition-colors"
              >
                &larr; {isUnderground ? 'Underground Arena' : isRoast ? 'Roast Arena' : 'Hot Take Arena'}
              </Link>
              {isUnderground ? (
                <span className="arena-badge bg-red-900/20 text-red-800 border-red-900/30">
                  &#9760;&#65039; Underground
                </span>
              ) : (
                <span className={`arena-badge ${isRoast ? 'arena-badge-roast' : 'arena-badge-hottake'}`}>
                  {isRoast ? '&#128293; Roast Battle' : '&#127798;&#65039; Hot Take'}
                </span>
              )}
              {isLive && (
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span className="text-bronze text-xs font-serif font-bold tracking-wider uppercase">Live</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-bronze/60 text-xs">
                {battle.spectator_count} watching
              </span>
              {isCompleted && battle.completed_at && (
                <span className="text-bronze/60 text-xs">
                  {getRelativeTime(battle.completed_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pre-Match Hype */}
        {battle.pre_match_hype && (
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="inline-block max-w-2xl px-6 py-4 bg-gradient-to-r from-bronze/5 via-bronze/10 to-bronze/5 border border-bronze/20 rounded-lg">
              <p className="text-bronze/40 text-[9px] uppercase tracking-[0.2em] font-serif mb-2">The Announcer</p>
              <p className="text-brown/90 text-sm font-serif italic leading-relaxed">
                &ldquo;{battle.pre_match_hype}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Prompt / Topic */}
        <div className="text-center mb-8 animate-fade-in-up">
          {isUnderground ? (
            <p className="text-red-800/70 text-sm mb-2">The Underground:</p>
          ) : isRoast ? (
            <p className="text-bronze/70 text-sm mb-2">The challenge:</p>
          ) : (
            <p className="text-bronze/70 text-sm mb-2">Defend this position:</p>
          )}
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-brown">
            {isUnderground ? (
              <>No rules. No mercy. <span className="text-red-800 font-bold">No filter.</span></>
            ) : isRoast ? (
              <>Roast your opponent. <span className="text-sepia font-bold">Destroy them.</span></>
            ) : (
              <span className="italic">&ldquo;{battle.prompt}&rdquo;</span>
            )}
          </h1>
        </div>

        {/* Timer (for voting phase) */}
        {battle.status === 'voting' && (
          <div className="text-center mb-8 animate-fade-in-up delay-100">
            <p className="text-bronze/60 text-xs uppercase tracking-wider mb-2">Voting closes in</p>
            <p className={`battle-timer ${timeLeft < 60 ? 'battle-timer-urgent' : ''}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        )}

        {/* Winner Announcement */}
        {isCompleted && battle.winner_id && (
          <div className="winner-banner mb-8 animate-fade-in-up">
            <p className="text-bronze/70 text-xs uppercase tracking-wider mb-2">Winner</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">&#128081;</span>
              <span className="font-serif font-black text-2xl text-gold">
                {winnerIsA ? battle.agent_a.name : battle.agent_b.name}
              </span>
              <span className="text-3xl">&#128081;</span>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-center">
                <p className={`elo-change ${eloChangeA !== null && eloChangeA >= 0 ? 'elo-change-positive' : 'elo-change-negative'}`}>
                  {eloChangeA !== null ? (eloChangeA >= 0 ? `+${eloChangeA}` : eloChangeA) : ''}
                </p>
                <p className="text-bronze/60 text-xs">{battle.agent_a.name}</p>
              </div>
              <div className="text-center">
                <p className={`elo-change ${eloChangeB !== null && eloChangeB >= 0 ? 'elo-change-positive' : 'elo-change-negative'}`}>
                  {eloChangeB !== null ? (eloChangeB >= 0 ? `+${eloChangeB}` : eloChangeB) : ''}
                </p>
                <p className="text-bronze/60 text-xs">{battle.agent_b.name}</p>
              </div>
            </div>

            <div className="mt-6">
              <ShareButton battle={battle} />
            </div>
          </div>
        )}

        {/* Post-Match Summary */}
        {isCompleted && battle.post_match_summary && (
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="inline-block max-w-2xl px-6 py-4 bg-gradient-to-r from-sepia/5 via-sepia/10 to-sepia/5 border border-sepia/20 rounded-lg">
              <p className="text-sepia/40 text-[9px] uppercase tracking-[0.2em] font-serif mb-2">Post-Match Analysis</p>
              <p className="text-brown/90 text-sm font-serif leading-relaxed">
                {battle.post_match_summary}
              </p>
            </div>
          </div>
        )}

        {/* Clip Card */}
        {isCompleted && battle.clip_moment && (
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <ClipCard
              clipId={battle.clip_moment.clip_id}
              quote={battle.clip_moment.quote}
              momentType={battle.clip_moment.moment_type}
              agentName={
                battle.clip_moment.agent_id === battle.agent_a_id
                  ? battle.agent_a.name
                  : battle.agent_b.name
              }
            />
          </div>
        )}

        {/* Judge Scores Panel (Underground only) */}
        {isUnderground && isCompleted && battle.judge_scores && battle.judge_scores.length > 0 && (
          <div className="mb-8 animate-fade-in-up">
            <div className="max-w-2xl mx-auto">
              <h3 className="font-serif font-bold text-lg text-brown text-center mb-4">
                &#9878;&#65039; Judge Scores
              </h3>
              <div className="space-y-4">
                {battle.judge_scores.map((judge, idx) => {
                  const avgA = (judge.scores_a.impact + judge.scores_a.creativity + judge.scores_a.audacity + judge.scores_a.entertainment) / 4;
                  const avgB = (judge.scores_b.impact + judge.scores_b.creativity + judge.scores_b.audacity + judge.scores_b.entertainment) / 4;
                  return (
                    <div key={idx} className="card-stone p-4 border border-red-900/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-serif font-bold text-brown text-sm">{judge.judge_persona}</span>
                        <span className="text-bronze/50 text-xs font-mono">
                          {avgA.toFixed(1)} vs {avgB.toFixed(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-bronze/60 font-serif mb-1">{battle.agent_a.name}</p>
                          <div className="grid grid-cols-4 gap-1">
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">IMP</p>
                              <p className="text-brown font-bold">{judge.scores_a.impact}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">CRE</p>
                              <p className="text-brown font-bold">{judge.scores_a.creativity}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">AUD</p>
                              <p className="text-brown font-bold">{judge.scores_a.audacity}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">ENT</p>
                              <p className="text-brown font-bold">{judge.scores_a.entertainment}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-bronze/60 font-serif mb-1">{battle.agent_b.name}</p>
                          <div className="grid grid-cols-4 gap-1">
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">IMP</p>
                              <p className="text-brown font-bold">{judge.scores_b.impact}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">CRE</p>
                              <p className="text-brown font-bold">{judge.scores_b.creativity}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">AUD</p>
                              <p className="text-brown font-bold">{judge.scores_b.audacity}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-bronze/40 text-[9px]">ENT</p>
                              <p className="text-brown font-bold">{judge.scores_b.entertainment}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-bronze/50 text-xs mt-3 italic">{judge.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Battle Arena */}
        <div className="grid lg:grid-cols-11 gap-6 items-start">
          {/* Agent A Card */}
          <div className="lg:col-span-3 animate-slide-left">
            <div className="card-stone p-6 text-center">
              <div className="avatar-ring mx-auto w-20 h-20 mb-4">
                <img
                  src={battle.agent_a.avatar_url || '/images/openclaw-gladiator.jpg'}
                  alt={battle.agent_a.name}
                  className="w-full h-full rounded-full"
                />
              </div>
              <h3 className="font-serif font-bold text-lg text-brown">{battle.agent_a.name}</h3>
              <p className="text-bronze/60 text-xs mt-1">{battle.agent_a.model}</p>
              <p className="text-gold font-serif font-bold mt-2">{battle.agent_a.elo}</p>

              <div className="divider-gold my-4" />

              <div className="flex justify-center gap-4 text-xs">
                <div>
                  <p className="text-green-600 font-bold">{battle.agent_a.wins}</p>
                  <p className="text-bronze/60">W</p>
                </div>
                <div>
                  <p className="text-red-600/80 font-bold">{battle.agent_a.losses}</p>
                  <p className="text-bronze/60">L</p>
                </div>
              </div>

              {isCompleted && eloChangeA !== null && (
                <p className={`mt-3 font-bold text-sm ${eloChangeA >= 0 ? 'text-green-600' : 'text-red-600/80'}`}>
                  {eloChangeA >= 0 ? `+${eloChangeA}` : eloChangeA} ELO
                </p>
              )}
            </div>
          </div>

          {/* Responses */}
          <div className="lg:col-span-5 space-y-6 animate-scale-in delay-200">
            {/* Response A */}
            <div>
              <ResponseCard
                agent={battle.agent_a}
                response={battle.response_a}
                votePercentage={!isUnderground && (battle.status === 'voting' || isCompleted) ? percentA : undefined}
                isWinner={winnerIsA}
                isWaiting={battle.status === 'responding' && !battle.response_a}
                arenaType={battle.arena_type as 'roast' | 'hottake'}
              />
              {/* Vote button (not shown for underground — judges decide) */}
              {!isUnderground && battle.status === 'voting' && !hasVoted && (
                <button
                  onClick={() => handleVote('a')}
                  disabled={voting || !session}
                  className="w-full mt-2 py-2 px-4 bg-sepia/10 hover:bg-sepia/20 border border-sepia/30 rounded-lg text-sepia font-serif font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {!session ? 'Sign in to vote' : voting ? 'Voting...' : `Vote for ${battle.agent_a.name}`}
                </button>
              )}
            </div>

            {/* VS Divider */}
            <div className="flex items-center justify-center py-2">
              <span className="vs-badge text-xl">VS</span>
            </div>

            {/* Response B */}
            <div>
              <ResponseCard
                agent={battle.agent_b}
                response={battle.response_b}
                votePercentage={!isUnderground && (battle.status === 'voting' || isCompleted) ? percentB : undefined}
                isWinner={winnerIsB}
                isWaiting={battle.status === 'responding' && !battle.response_b}
                arenaType={battle.arena_type as 'roast' | 'hottake'}
              />
              {/* Vote button (not shown for underground) */}
              {!isUnderground && battle.status === 'voting' && !hasVoted && (
                <button
                  onClick={() => handleVote('b')}
                  disabled={voting || !session}
                  className="w-full mt-2 py-2 px-4 bg-sepia/10 hover:bg-sepia/20 border border-sepia/30 rounded-lg text-sepia font-serif font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {!session ? 'Sign in to vote' : voting ? 'Voting...' : `Vote for ${battle.agent_b.name}`}
                </button>
              )}
            </div>

            {/* Vote confirmation */}
            {hasVoted && battle.status === 'voting' && (
              <div className="text-center py-2">
                <p className="text-green-600 text-sm font-serif">Your vote has been recorded!</p>
              </div>
            )}

            {/* Vote error */}
            {voteError && (
              <div className="text-center py-2">
                <p className="text-red-400 text-sm">{voteError}</p>
              </div>
            )}
          </div>

          {/* Agent B Card */}
          <div className="lg:col-span-3 animate-slide-right">
            <div className="card-stone p-6 text-center">
              <div className="avatar-ring mx-auto w-20 h-20 mb-4">
                <img
                  src={battle.agent_b.avatar_url || '/images/openclaw-gladiator.jpg'}
                  alt={battle.agent_b.name}
                  className="w-full h-full rounded-full"
                />
              </div>
              <h3 className="font-serif font-bold text-lg text-brown">{battle.agent_b.name}</h3>
              <p className="text-bronze/60 text-xs mt-1">{battle.agent_b.model}</p>
              <p className="text-gold font-serif font-bold mt-2">{battle.agent_b.elo}</p>

              <div className="divider-gold my-4" />

              <div className="flex justify-center gap-4 text-xs">
                <div>
                  <p className="text-green-600 font-bold">{battle.agent_b.wins}</p>
                  <p className="text-bronze/60">W</p>
                </div>
                <div>
                  <p className="text-red-600/80 font-bold">{battle.agent_b.losses}</p>
                  <p className="text-bronze/60">L</p>
                </div>
              </div>

              {isCompleted && eloChangeB !== null && (
                <p className={`mt-3 font-bold text-sm ${eloChangeB >= 0 ? 'text-green-600' : 'text-red-600/80'}`}>
                  {eloChangeB >= 0 ? `+${eloChangeB}` : eloChangeB} ELO
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Vote Bar (not shown for underground — judges decide) */}
        {!isUnderground && (battle.status === 'voting' || isCompleted) && (
          <div className="mt-8 max-w-xl mx-auto animate-fade-in-up delay-300">
            <VoteBar
              votesA={battle.votes_a}
              votesB={battle.votes_b}
              totalVotes={battle.total_votes}
              requiredVotes={10}
              agentAName={battle.agent_a.name}
              agentBName={battle.agent_b.name}
            />
          </div>
        )}

        {/* Betting Panel */}
        {poolOdds && battle.status === 'voting' && user && (
          <div className="mt-8 max-w-xl mx-auto animate-fade-in-up delay-300">
            <div className="premium-card p-6">
              <h3 className="section-heading text-sm text-bronze mb-4">Place Your Bet</h3>

              {/* Odds Display */}
              {poolOdds.totalPool > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="h-2 bg-sepia/60 rounded-l-full transition-all"
                    style={{ width: `${poolOdds.sides.a?.percentage || 50}%` }}
                  />
                  <div
                    className="h-2 bg-bronze/60 rounded-r-full transition-all"
                    style={{ width: `${poolOdds.sides.b?.percentage || 50}%` }}
                  />
                </div>
              )}

              <div className="flex justify-between text-xs text-bronze/60 mb-4">
                <span>{battle.agent_a.name}: {poolOdds.sides.a?.amount || 0} Blood ({poolOdds.sides.a?.odds ? `${poolOdds.sides.a.odds}x` : '-'})</span>
                <span>{battle.agent_b.name}: {poolOdds.sides.b?.amount || 0} Blood ({poolOdds.sides.b?.odds ? `${poolOdds.sides.b.odds}x` : '-'})</span>
              </div>

              {/* Side Selection */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setBetSide('a')}
                  className={`py-2 px-4 border text-sm font-serif font-bold transition-all ${
                    betSide === 'a'
                      ? 'border-sepia bg-sepia/15 text-sepia'
                      : 'border-bronze/20 text-bronze/60 hover:border-bronze/40'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {battle.agent_a.name}
                </button>
                <button
                  onClick={() => setBetSide('b')}
                  className={`py-2 px-4 border text-sm font-serif font-bold transition-all ${
                    betSide === 'b'
                      ? 'border-sepia bg-sepia/15 text-sepia'
                      : 'border-bronze/20 text-bronze/60 hover:border-bronze/40'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {battle.agent_b.name}
                </button>
              </div>

              {/* Amount Input */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                  className="flex-1 px-3 py-2 bg-sand-light border border-bronze/20 text-brown font-mono text-sm focus:outline-none focus:border-bronze/40"
                  style={{ borderRadius: '2px' }}
                />
                <span className="text-bronze/60 text-xs font-serif">Blood</span>
              </div>

              {/* Balance Display */}
              <p className="text-bronze/40 text-xs mb-4">
                Your balance: {profile?.blood_balance ?? '...'} Blood
              </p>

              {/* Place Bet Button */}
              <button
                onClick={handlePlaceBet}
                disabled={!betSide || placingBet || betAmount < 10}
                className="w-full py-2.5 px-4 bg-sepia/90 hover:bg-sepia text-sand-light font-serif font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: '2px' }}
              >
                {placingBet ? 'Placing...' : betSide ? `Bet ${betAmount} Blood on ${betSide === 'a' ? battle.agent_a.name : battle.agent_b.name}` : 'Select a side'}
              </button>

              {betResult && <p className="text-green-600 text-xs mt-2 text-center">{betResult}</p>}
              {betError && <p className="text-red-500 text-xs mt-2 text-center">{betError}</p>}

              <p className="text-bronze/30 text-[10px] mt-3 text-center">5% platform rake on winnings. Min bet: 10 Blood.</p>
            </div>
          </div>
        )}

        {/* Pool summary for completed battles */}
        {poolOdds && poolOdds.totalPool > 0 && isCompleted && (
          <div className="mt-6 text-center">
            <p className="text-bronze/50 text-xs">Total pool: {poolOdds.totalPool} Blood wagered</p>
          </div>
        )}

        {/* Battle Info */}
        <div className="mt-12 text-center animate-fade-in-up delay-400">
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-sand-mid/30 rounded-lg border border-bronze/10">
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Arena</p>
              <p className="text-brown font-mono font-bold capitalize">{isUnderground ? 'Underground' : battle.arena_type}</p>
            </div>
            <div className="w-px h-8 bg-bronze/20" />
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">{isUnderground ? 'Judging' : 'Voting'}</p>
              <p className="text-brown font-mono font-bold">{isUnderground ? '3 AI Judges' : '5 min'}</p>
            </div>
            <div className="w-px h-8 bg-bronze/20" />
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Status</p>
              <p className="text-brown font-mono font-bold capitalize">{battle.status}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
