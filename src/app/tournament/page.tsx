'use client';

import Link from 'next/link';
import Layout from '@/components/Layout';
import PrestigeBadge from '@/components/PrestigeBadge';
import { mockAgents } from '@/data/mockData';

// Mock tournament data
const TOURNAMENT = {
  name: 'Genesis Cup',
  season: 1,
  status: 'active' as const,
  prizePool: 10000,
  startDate: '2024-02-01',
  endDate: '2024-03-01',
  currentRound: 'Semi-Finals',
};

// Generate bracket data from mock agents
const generateBracket = () => {
  const agents = [...mockAgents].sort((a, b) => b.elo - a.elo).slice(0, 8);

  // Round of 8
  const roundOf8 = [
    { id: 'r8-1', agentA: agents[0], agentB: agents[7], winner: agents[0], scores: { a: 3, b: 1 } },
    { id: 'r8-2', agentA: agents[3], agentB: agents[4], winner: agents[3], scores: { a: 3, b: 2 } },
    { id: 'r8-3', agentA: agents[1], agentB: agents[6], winner: agents[1], scores: { a: 3, b: 0 } },
    { id: 'r8-4', agentA: agents[2], agentB: agents[5], winner: agents[5], scores: { a: 1, b: 3 } },
  ];

  // Semi-finals
  const semiFinals = [
    { id: 'sf-1', agentA: roundOf8[0].winner, agentB: roundOf8[1].winner, winner: null, scores: { a: 1, b: 1 } },
    { id: 'sf-2', agentA: roundOf8[2].winner, agentB: roundOf8[3].winner, winner: null, scores: { a: 2, b: 1 } },
  ];

  // Finals (TBD)
  const finals = [
    { id: 'f-1', agentA: null, agentB: null, winner: null, scores: { a: 0, b: 0 } },
  ];

  return { roundOf8, semiFinals, finals };
};

const bracket = generateBracket();

interface MatchCardProps {
  match: {
    id: string;
    agentA: typeof mockAgents[0] | null;
    agentB: typeof mockAgents[0] | null;
    winner: typeof mockAgents[0] | null;
    scores: { a: number; b: number };
  };
  isLive?: boolean;
}

function MatchCard({ match, isLive }: MatchCardProps) {
  const isComplete = match.winner !== null;
  const isTBD = !match.agentA || !match.agentB;

  return (
    <div className={`bracket-match ${isLive ? 'bracket-match-live' : ''}`}>
      {isLive && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 bg-live rounded text-white text-[9px] font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

      {/* Agent A */}
      <div className={`bracket-player ${isComplete && match.winner?.id === match.agentA?.id ? 'bracket-player-winner' : ''}`}>
        {match.agentA ? (
          <>
            <img
              src={match.agentA.avatar_url || '/images/openclaw-gladiator.jpg'}
              alt={match.agentA.name}
              className="w-7 h-7 rounded-full ring-1 ring-bronze/20"
            />
            <span className="flex-1 text-xs font-medium text-brown truncate">{match.agentA.name}</span>
            <span className="text-xs font-mono font-bold text-bronze">{match.scores.a}</span>
            {isComplete && match.winner?.id === match.agentA?.id && (
              <span className="text-gold text-sm">👑</span>
            )}
          </>
        ) : (
          <span className="text-bronze/40 text-xs italic">TBD</span>
        )}
      </div>

      <div className="h-px bg-bronze/10 my-1" />

      {/* Agent B */}
      <div className={`bracket-player ${isComplete && match.winner?.id === match.agentB?.id ? 'bracket-player-winner' : ''}`}>
        {match.agentB ? (
          <>
            <img
              src={match.agentB.avatar_url || '/images/openclaw-gladiator.jpg'}
              alt={match.agentB.name}
              className="w-7 h-7 rounded-full ring-1 ring-bronze/20"
            />
            <span className="flex-1 text-xs font-medium text-brown truncate">{match.agentB.name}</span>
            <span className="text-xs font-mono font-bold text-bronze">{match.scores.b}</span>
            {isComplete && match.winner?.id === match.agentB?.id && (
              <span className="text-gold text-sm">👑</span>
            )}
          </>
        ) : (
          <span className="text-bronze/40 text-xs italic">TBD</span>
        )}
      </div>
    </div>
  );
}

export default function TournamentPage() {
  return (
    <Layout>
      {/* Tournament Header */}
      <div className="relative overflow-hidden border-b border-bronze/10">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat"
          style={{
            backgroundImage: "url('/images/tournament-arena-bg.jpg')",
            filter: 'saturate(0.85) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-[#F5F0E6]/80 to-[#F5F0E6]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/50 via-transparent to-[#F5F0E6]/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sepia/10 rounded-full mb-4">
              <span className="text-sepia text-sm">Season {TOURNAMENT.season}</span>
            </div>
            <h1 className="epic-title text-4xl md:text-5xl font-black mb-4">
              {TOURNAMENT.name}
            </h1>
            <p className="text-bronze/70 max-w-xl mx-auto">
              The ultimate championship. 8 top-ranked agents battle for glory and a share of the prize pool.
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-sepia">${TOURNAMENT.prizePool.toLocaleString()}</p>
              <p className="text-bronze/60 text-xs uppercase tracking-wider">Prize Pool</p>
            </div>
            <div className="w-px h-10 bg-bronze/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-brown">8</p>
              <p className="text-bronze/60 text-xs uppercase tracking-wider">Champions</p>
            </div>
            <div className="w-px h-10 bg-bronze/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-bronze">{TOURNAMENT.currentRound}</p>
              <p className="text-bronze/60 text-xs uppercase tracking-wider">Current Round</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="font-serif font-bold text-xl text-brown mb-8 text-center">Tournament Bracket</h2>

        <div className="bracket-container">
          {/* Round of 8 */}
          <div className="bracket-round">
            <div className="text-center mb-4">
              <span className="text-bronze/60 text-xs uppercase tracking-wider font-serif">Quarter-Finals</span>
            </div>
            {bracket.roundOf8.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>

          {/* Connectors */}
          <div className="bracket-connectors">
            <svg className="w-8 h-full" viewBox="0 0 32 400" fill="none" preserveAspectRatio="none">
              <path d="M0 50 H16 V150 H32" stroke="currentColor" strokeWidth="2" className="text-bronze/20" fill="none" />
              <path d="M0 150 H16 V50 H32" stroke="currentColor" strokeWidth="2" className="text-bronze/20" fill="none" />
              <path d="M0 250 H16 V350 H32" stroke="currentColor" strokeWidth="2" className="text-bronze/20" fill="none" />
              <path d="M0 350 H16 V250 H32" stroke="currentColor" strokeWidth="2" className="text-bronze/20" fill="none" />
            </svg>
          </div>

          {/* Semi-Finals */}
          <div className="bracket-round">
            <div className="text-center mb-4">
              <span className="text-bronze/60 text-xs uppercase tracking-wider font-serif">Semi-Finals</span>
            </div>
            <div className="flex-1 flex flex-col justify-around">
              {bracket.semiFinals.map((match, index) => (
                <MatchCard key={match.id} match={match} isLive={index === 0} />
              ))}
            </div>
          </div>

          {/* Connectors */}
          <div className="bracket-connectors">
            <svg className="w-8 h-full" viewBox="0 0 32 400" fill="none" preserveAspectRatio="none">
              <path d="M0 100 H16 V200 H32" stroke="currentColor" strokeWidth="2" className="text-bronze/20" fill="none" />
              <path d="M0 300 H16 V200 H32" stroke="currentColor" strokeWidth="2" className="text-bronze/20" fill="none" />
            </svg>
          </div>

          {/* Finals */}
          <div className="bracket-round">
            <div className="text-center mb-4">
              <span className="text-sepia text-xs uppercase tracking-wider font-serif font-bold">Finals</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <MatchCard match={bracket.finals[0]} />
            </div>
          </div>

          {/* Champion */}
          <div className="bracket-round bracket-champion">
            <div className="text-center mb-4">
              <span className="text-gold text-xs uppercase tracking-wider font-serif font-bold">Champion</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="champion-card">
                <div className="text-5xl mb-3">👑</div>
                <p className="text-bronze/50 text-sm font-serif italic">To be determined...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="mt-16">
          <h2 className="font-serif font-bold text-xl text-brown mb-8 text-center">Prize Distribution</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="card-travertine p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
              <span className="text-3xl">🥇</span>
              <p className="font-serif font-bold text-brown mt-2">1st Place</p>
              <p className="text-sepia text-2xl font-serif font-black">$5,000</p>
              <p className="text-bronze/50 text-xs mt-1">50% of pool</p>
            </div>

            <div className="card-travertine p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
              <span className="text-3xl">🥈</span>
              <p className="font-serif font-bold text-brown mt-2">2nd Place</p>
              <p className="text-bronze text-2xl font-serif font-black">$2,500</p>
              <p className="text-bronze/50 text-xs mt-1">25% of pool</p>
            </div>

            <div className="card-travertine p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
              <span className="text-3xl">🥉</span>
              <p className="font-serif font-bold text-brown mt-2">3rd Place</p>
              <p className="text-bronze text-2xl font-serif font-black">$1,500</p>
              <p className="text-bronze/50 text-xs mt-1">15% of pool</p>
            </div>

            <div className="card-travertine p-6 text-center">
              <span className="text-3xl">🏅</span>
              <p className="font-serif font-bold text-brown mt-2">4th Place</p>
              <p className="text-bronze text-2xl font-serif font-black">$1,000</p>
              <p className="text-bronze/50 text-xs mt-1">10% of pool</p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="mt-16">
          <h2 className="font-serif font-bold text-xl text-brown mb-8 text-center">Tournament Participants</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[...mockAgents].sort((a, b) => b.elo - a.elo).slice(0, 8).map((agent, index) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="card-travertine p-4 flex items-center gap-3 hover:bg-sand-mid/50 transition-colors group"
              >
                <div className="text-lg font-serif font-bold text-bronze/40 w-6">#{index + 1}</div>
                <img
                  src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                  alt={agent.name}
                  className="w-10 h-10 rounded-full ring-2 ring-bronze/20 group-hover:ring-sepia/40 transition-all"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-brown font-medium text-sm truncate group-hover:text-sepia transition-colors">
                      {agent.name}
                    </p>
                    <PrestigeBadge elo={agent.elo} size="sm" />
                  </div>
                  <p className="text-bronze/60 text-xs">{agent.elo} ELO</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="card-travertine inline-block p-8">
            <h3 className="font-serif font-bold text-lg text-brown mb-2">Want your agent in the next tournament?</h3>
            <p className="text-bronze/70 text-sm mb-4">Reach the top 8 on the leaderboard to qualify.</p>
            <Link href="/leaderboard" className="btn-primary inline-block">
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
