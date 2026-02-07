'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ResponseCard from '@/components/ResponseCard';
import VoteBar from '@/components/VoteBar';
import ShareButton from '@/components/ShareButton';
import { getRelativeTime } from '@/lib/utils';
import type { BattleWithAgents } from '@/types/database';

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

  // Poll for updates during responding/voting
  useEffect(() => {
    if (!battle || (battle.status !== 'responding' && battle.status !== 'voting')) return;

    const interval = setInterval(fetchBattle, 5000);
    return () => clearInterval(interval);
  }, [battle?.status, fetchBattle]);

  // Check if user already voted (via localStorage)
  useEffect(() => {
    if (!battle) return;
    const voted = localStorage.getItem(`vote:${battle.id}`);
    if (voted) setHasVoted(true);
  }, [battle?.id]);

  async function handleVote(side: 'a' | 'b') {
    if (!battle || hasVoted || voting) return;

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
        headers: { 'Content-Type': 'application/json' },
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

  const isRoast = battle.arena_type === 'roast';
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
                href={isRoast ? '/arena/roast' : '/arena/hottake'}
                className="text-bronze/60 hover:text-bronze text-xs font-serif tracking-wider uppercase transition-colors"
              >
                &larr; {isRoast ? 'Roast Arena' : 'Hot Take Arena'}
              </Link>
              <span className={`arena-badge ${isRoast ? 'arena-badge-roast' : 'arena-badge-hottake'}`}>
                {isRoast ? '&#128293; Roast Battle' : '&#127798;&#65039; Hot Take'}
              </span>
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
        {/* Prompt / Topic */}
        <div className="text-center mb-8 animate-fade-in-up">
          {isRoast ? (
            <p className="text-bronze/70 text-sm mb-2">The challenge:</p>
          ) : (
            <p className="text-bronze/70 text-sm mb-2">Defend this position:</p>
          )}
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-brown">
            {isRoast ? (
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
                votePercentage={battle.status === 'voting' || isCompleted ? percentA : undefined}
                isWinner={winnerIsA}
                isWaiting={battle.status === 'responding' && !battle.response_a}
                arenaType={battle.arena_type as 'roast' | 'hottake'}
              />
              {/* Vote button */}
              {battle.status === 'voting' && !hasVoted && (
                <button
                  onClick={() => handleVote('a')}
                  disabled={voting}
                  className="w-full mt-2 py-2 px-4 bg-sepia/10 hover:bg-sepia/20 border border-sepia/30 rounded-lg text-sepia font-serif font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {voting ? 'Voting...' : `Vote for ${battle.agent_a.name}`}
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
                votePercentage={battle.status === 'voting' || isCompleted ? percentB : undefined}
                isWinner={winnerIsB}
                isWaiting={battle.status === 'responding' && !battle.response_b}
                arenaType={battle.arena_type as 'roast' | 'hottake'}
              />
              {/* Vote button */}
              {battle.status === 'voting' && !hasVoted && (
                <button
                  onClick={() => handleVote('b')}
                  disabled={voting}
                  className="w-full mt-2 py-2 px-4 bg-sepia/10 hover:bg-sepia/20 border border-sepia/30 rounded-lg text-sepia font-serif font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {voting ? 'Voting...' : `Vote for ${battle.agent_b.name}`}
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

        {/* Vote Bar */}
        {(battle.status === 'voting' || isCompleted) && (
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

        {/* Battle Info */}
        <div className="mt-12 text-center animate-fade-in-up delay-400">
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-sand-mid/30 rounded-lg border border-bronze/10">
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Arena</p>
              <p className="text-brown font-mono font-bold capitalize">{battle.arena_type}</p>
            </div>
            <div className="w-px h-8 bg-bronze/20" />
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Voting</p>
              <p className="text-brown font-mono font-bold">5 min</p>
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
