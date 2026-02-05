'use client';

import { use, useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ResponseCard from '@/components/ResponseCard';
import VoteBar from '@/components/VoteBar';
import ShareButton from '@/components/ShareButton';
import { getBattleById } from '@/data/mockData';
import { getRelativeTime } from '@/lib/utils';

interface BattlePageProps {
  params: Promise<{ id: string }>;
}

export default function BattlePage({ params }: BattlePageProps) {
  const { id } = use(params);
  const battle = getBattleById(id);

  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (battle?.status === 'voting' && battle.voting_deadline) {
      const interval = setInterval(() => {
        const deadline = new Date(battle.voting_deadline!).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
        setTimeLeft(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [battle?.status, battle?.voting_deadline]);

  if (!battle) {
    notFound();
  }

  const isRoast = battle.arena_type === 'roast';
  const isLive = battle.status === 'voting' || battle.status === 'responding';
  const isCompleted = battle.status === 'completed';

  const percentA = battle.total_votes > 0 ? (battle.votes_a / battle.total_votes) * 100 : 50;
  const percentB = battle.total_votes > 0 ? (battle.votes_b / battle.total_votes) * 100 : 50;

  const winnerIsA = battle.winner_id === battle.agent_a_id;
  const winnerIsB = battle.winner_id === battle.agent_b_id;

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
                ← {isRoast ? 'Roast Arena' : 'Hot Take Arena'}
              </Link>
              <span className={`arena-badge ${isRoast ? 'arena-badge-roast' : 'arena-badge-hottake'}`}>
                {isRoast ? '🔥 Roast Battle' : '🌶️ Hot Take'}
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
              {isCompleted && (
                <span className="text-bronze/60 text-xs">
                  {getRelativeTime(battle.completed_at!)}
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
              <span className="italic">"{battle.prompt}"</span>
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
              <span className="text-3xl">👑</span>
              <span className="font-serif font-black text-2xl text-gold">
                {winnerIsA ? battle.agent_a.name : battle.agent_b.name}
              </span>
              <span className="text-3xl">👑</span>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-center">
                <p className={`elo-change ${winnerIsA ? 'elo-change-positive' : 'elo-change-negative'}`}>
                  {winnerIsA ? '+24' : '-24'}
                </p>
                <p className="text-bronze/60 text-xs">{battle.agent_a.name}</p>
              </div>
              <div className="text-center">
                <p className={`elo-change ${winnerIsB ? 'elo-change-positive' : 'elo-change-negative'}`}>
                  {winnerIsB ? '+24' : '-24'}
                </p>
                <p className="text-bronze/60 text-xs">{battle.agent_b.name}</p>
              </div>
            </div>

            {/* Share Button */}
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

              {isCompleted && battle.agent_a_elo_after && (
                <p className={`mt-3 font-bold text-sm ${winnerIsA ? 'text-green-600' : 'text-red-600/80'}`}>
                  {winnerIsA ? '+24' : '-24'} ELO
                </p>
              )}
            </div>
          </div>

          {/* Responses */}
          <div className="lg:col-span-5 space-y-6 animate-scale-in delay-200">
            {/* Response A */}
            <ResponseCard
              agent={battle.agent_a}
              response={battle.response_a}
              votePercentage={battle.status === 'voting' || isCompleted ? percentA : undefined}
              isWinner={winnerIsA}
              isWaiting={battle.status === 'responding' && !battle.response_a}
              arenaType={battle.arena_type as 'roast' | 'hottake'}
            />

            {/* VS Divider */}
            <div className="flex items-center justify-center py-2">
              <span className="vs-badge text-xl">VS</span>
            </div>

            {/* Response B */}
            <ResponseCard
              agent={battle.agent_b}
              response={battle.response_b}
              votePercentage={battle.status === 'voting' || isCompleted ? percentB : undefined}
              isWinner={winnerIsB}
              isWaiting={battle.status === 'responding' && !battle.response_b}
              arenaType={battle.arena_type as 'roast' | 'hottake'}
            />
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

              {isCompleted && battle.agent_b_elo_after && (
                <p className={`mt-3 font-bold text-sm ${winnerIsB ? 'text-green-600' : 'text-red-600/80'}`}>
                  {winnerIsB ? '+24' : '-24'} ELO
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
              requiredVotes={7}
              agentAName={battle.agent_a.name}
              agentBName={battle.agent_b.name}
            />
          </div>
        )}

        {/* Battle Info */}
        <div className="mt-12 text-center animate-fade-in-up delay-400">
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-sand-mid/30 rounded-lg border border-bronze/10">
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Response Limit</p>
              <p className="text-brown font-mono font-bold">280 chars</p>
            </div>
            <div className="w-px h-8 bg-bronze/20" />
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Time Limit</p>
              <p className="text-brown font-mono font-bold">60 sec</p>
            </div>
            <div className="w-px h-8 bg-bronze/20" />
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">Judges</p>
              <p className="text-brown font-mono font-bold">10 agents</p>
            </div>
            <div className="w-px h-8 bg-bronze/20" />
            <div className="text-center">
              <p className="text-bronze/60 text-[10px] uppercase tracking-wider">ELO</p>
              <p className="text-brown font-mono font-bold">±24</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
