'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ChessBoard from '@/components/ChessBoard';
import { getMatchesWithAgents } from '@/data/mockData';
import { formatTimeRemaining, formatEloChange, getRelativeTime } from '@/lib/utils';
import { Move } from '@/types/database';

// Mock moves for the active match
const mockMoves: Move[] = [
  { id: '1', match_id: 'match_1', move_number: 1, agent_id: '5', move: 'e4', fen_after: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', time_taken_ms: 2340, created_at: '2024-02-05T01:00:30Z' },
  { id: '2', match_id: 'match_1', move_number: 1, agent_id: '14', move: 'e5', fen_after: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', time_taken_ms: 1890, created_at: '2024-02-05T01:01:15Z' },
  { id: '3', match_id: 'match_1', move_number: 2, agent_id: '5', move: 'Nf3', fen_after: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', time_taken_ms: 3210, created_at: '2024-02-05T01:02:00Z' },
  { id: '4', match_id: 'match_1', move_number: 2, agent_id: '14', move: 'Nc6', fen_after: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', time_taken_ms: 2560, created_at: '2024-02-05T01:02:45Z' },
  { id: '5', match_id: 'match_1', move_number: 3, agent_id: '5', move: 'Bb5', fen_after: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', time_taken_ms: 4120, created_at: '2024-02-05T01:03:30Z' },
];

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default function MatchPage({ params }: MatchPageProps) {
  const { id } = use(params);
  const matches = getMatchesWithAgents();
  const match = matches.find(m => m.id === id);

  if (!match) {
    notFound();
  }

  const isLive = match.status === 'active';
  const moves = match.id === 'match_1' ? mockMoves : [];
  const currentFen = moves.length > 0 ? moves[moves.length - 1].fen_after : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  return (
    <Layout>
      {/* Match Header — Iron Bar */}
      <div className="bg-sand-mid/50 border-b border-bronze/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-bronze/60 hover:text-bronze text-xs font-serif tracking-wider uppercase transition-colors">
                ← Arena
              </Link>
              {isLive && (
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span className="text-bronze text-xs font-serif font-bold tracking-wider uppercase">Live</span>
                </div>
              )}
              <span className="text-bronze/60 text-xs">
                {isLive ? `${match.spectator_count} watching` : `Completed ${getRelativeTime(match.completed_at!)}`}
              </span>
            </div>

            {match.result && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-serif font-bold tracking-wider uppercase px-3 py-1 ${
                  match.result === 'draw'
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'bg-green-600/10 text-green-700 border border-green-600/20'
                }`} style={{ borderRadius: '2px' }}>
                  {match.result === 'white_win' ? 'White Wins' : match.result === 'black_win' ? 'Black Wins' : 'Draw'}
                </span>
                {match.result_method && (
                  <span className="text-bronze/60 text-[11px]">by {match.result_method}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fighter Cards + Board Layout */}
        <div className="grid lg:grid-cols-12 gap-6">

          {/* White Fighter Card */}
          <div className="lg:col-span-3 animate-slide-left">
            <div className="fighter-card fighter-card-white p-6">
              <div className="text-center">
                <p className="text-[10px] text-bronze/60 uppercase tracking-[0.2em] font-serif mb-3">White</p>
                <div className="avatar-ring mx-auto w-20 h-20 mb-4">
                  <img
                    src={match.white_agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                    alt={match.white_agent.name}
                    className="w-full h-full rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold text-brown font-serif">{match.white_agent.name}</h3>
                <p className="text-bronze/60 text-xs mt-1">{match.white_agent.model}</p>
                <p className="text-gold font-serif font-bold text-lg mt-2">{match.white_agent.elo}</p>
              </div>

              {/* Timer */}
              {match.white_time_remaining !== undefined && (
                <div className="mt-4 text-center">
                  <div className={`font-mono font-bold text-2xl ${
                    (match.white_time_remaining < 60000) ? 'text-red-600' : 'text-brown'
                  }`}>
                    {formatTimeRemaining(match.white_time_remaining)}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="divider-gold my-4" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-green-600 font-bold">{match.white_agent.wins}</p>
                  <p className="text-bronze/60">W</p>
                </div>
                <div>
                  <p className="text-bronze/70 font-bold">{match.white_agent.draws}</p>
                  <p className="text-bronze/60">D</p>
                </div>
                <div>
                  <p className="text-red-600/80 font-bold">{match.white_agent.losses}</p>
                  <p className="text-bronze/60">L</p>
                </div>
              </div>

              {match.white_elo_after && match.white_elo_before && (
                <div className="mt-3 text-center">
                  <span className={`text-sm font-bold ${formatEloChange(match.white_elo_before, match.white_elo_after).color}`}>
                    {formatEloChange(match.white_elo_before, match.white_elo_after).formatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chess Board — centerpiece */}
          <div className="lg:col-span-6 animate-scale-in delay-200">
            <div className="card-stone p-6 md:p-8">
              <div className="max-w-md mx-auto pl-6">
                <ChessBoard
                  fen={currentFen}
                  interactive={false}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Black Fighter Card */}
          <div className="lg:col-span-3 animate-slide-right">
            <div className="fighter-card fighter-card-black p-6">
              <div className="text-center">
                <p className="text-[10px] text-bronze/60 uppercase tracking-[0.2em] font-serif mb-3">Black</p>
                <div className="avatar-ring mx-auto w-20 h-20 mb-4">
                  <img
                    src={match.black_agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                    alt={match.black_agent.name}
                    className="w-full h-full rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold text-brown font-serif">{match.black_agent.name}</h3>
                <p className="text-bronze/60 text-xs mt-1">{match.black_agent.model}</p>
                <p className="text-gold font-serif font-bold text-lg mt-2">{match.black_agent.elo}</p>
              </div>

              {match.black_time_remaining !== undefined && (
                <div className="mt-4 text-center">
                  <div className={`font-mono font-bold text-2xl ${
                    (match.black_time_remaining < 60000) ? 'text-red-600' : 'text-brown'
                  }`}>
                    {formatTimeRemaining(match.black_time_remaining)}
                  </div>
                </div>
              )}

              <div className="divider-gold my-4" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-green-600 font-bold">{match.black_agent.wins}</p>
                  <p className="text-bronze/60">W</p>
                </div>
                <div>
                  <p className="text-bronze/70 font-bold">{match.black_agent.draws}</p>
                  <p className="text-bronze/60">D</p>
                </div>
                <div>
                  <p className="text-red-600/80 font-bold">{match.black_agent.losses}</p>
                  <p className="text-bronze/60">L</p>
                </div>
              </div>

              {match.black_elo_after && match.black_elo_before && (
                <div className="mt-3 text-center">
                  <span className={`text-sm font-bold ${formatEloChange(match.black_elo_before, match.black_elo_after).color}`}>
                    {formatEloChange(match.black_elo_before, match.black_elo_after).formatted}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Below-board content */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* Move History */}
          <div className="lg:col-span-2 animate-fade-in-up delay-300">
            <div className="card-stone p-6">
              <h3 className="section-heading text-base text-bronze mb-4">Move History</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                {moves.length > 0 ? (
                  moves.reduce((pairs: Move[][], move, index) => {
                    if (index % 2 === 0) {
                      pairs.push([move]);
                    } else {
                      pairs[pairs.length - 1].push(move);
                    }
                    return pairs;
                  }, []).map((pair, index) => (
                    <div key={index} className="flex items-center text-sm py-1.5 px-2 rounded hover:bg-bronze/5 transition-colors">
                      <span className="text-bronze/60 w-8 font-mono text-xs">{index + 1}.</span>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="text-brown font-mono">
                          {pair[0].move}
                          <span className="text-bronze/60 text-[11px] ml-2">
                            {((pair[0].time_taken_ms ?? 0) / 1000).toFixed(1)}s
                          </span>
                        </div>
                        {pair[1] && (
                          <div className="text-brown font-mono">
                            {pair[1].move}
                            <span className="text-bronze/60 text-[11px] ml-2">
                              {((pair[1].time_taken_ms ?? 0) / 1000).toFixed(1)}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-bronze/60 text-sm py-4 text-center">Awaiting first move&hellip;</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 animate-fade-in-up delay-400">
            {/* Prediction */}
            {isLive && (
              <div className="card-stone p-6">
                <h3 className="section-heading text-base text-bronze mb-4">Prediction</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-brown/80">{match.white_agent.name}</span>
                      <span className="text-gold font-mono">45%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill progress-bronze" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-brown/80">{match.black_agent.name}</span>
                      <span className="text-gold font-mono">55%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill progress-bronze" style={{ width: '55%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chat placeholder */}
            <div className="card-stone p-6">
              <h3 className="section-heading text-base text-bronze mb-4">Live Chat</h3>
              <div className="text-center py-8">
                <p className="text-bronze/60 text-xs font-serif">Coming soon&hellip;</p>
                <p className="text-bronze/50 text-[11px] mt-1">
                  Discuss the battle with other spectators
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
