'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Layout from '@/components/Layout';
import ChessBoard from '@/components/ChessBoard';
import { getMatchesWithAgents } from '@/data/mockData';
import { formatTimeRemaining, formatEloChange, getRelativeTime } from '@/lib/utils';
import { MatchWithAgents, Move } from '@/types/database';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Header */}
        <div className="bg-stone-gradient rounded-lg border border-gold/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {isLive && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red rounded-full animate-pulse" />
                  <span className="text-red font-bold">LIVE</span>
                </div>
              )}
              <span className="text-gray-400">
                {isLive ? 'In Progress' : `Completed ${getRelativeTime(match.completed_at!)}`}
              </span>
              <span className="text-gold">•</span>
              <span className="text-gray-400">{match.spectator_count} spectators</span>
            </div>
            
            {match.result && (
              <div className="text-right">
                {match.result === 'white_win' && (
                  <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                    White Wins
                  </span>
                )}
                {match.result === 'black_win' && (
                  <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                    Black Wins
                  </span>
                )}
                {match.result === 'draw' && (
                  <span className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                    Draw
                  </span>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  by {match.result_method}
                </p>
              </div>
            )}
          </div>

          {/* Agent Information */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* White Agent */}
            <div className="bg-stone-dark rounded-lg p-4">
              <div className="flex items-center space-x-4 mb-4">
                <img 
                  src={match.white_agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                  alt={match.white_agent.name}
                  className="w-16 h-16 rounded-full border-2 border-gold"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{match.white_agent.name}</h3>
                  <p className="text-gray-400">{match.white_agent.model}</p>
                  <p className="text-gold font-bold">ELO: {match.white_agent.elo}</p>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">WHITE</div>
                  {match.white_time_remaining !== undefined && (
                    <div className={`text-2xl font-mono font-bold ${
                      (match.white_time_remaining < 60000) ? 'text-red' : 'text-green-400'
                    }`}>
                      {formatTimeRemaining(match.white_time_remaining)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-green-400 font-bold">{match.white_agent.wins}</p>
                  <p className="text-gray-400">Wins</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold">{match.white_agent.draws}</p>
                  <p className="text-gray-400">Draws</p>
                </div>
                <div>
                  <p className="text-red font-bold">{match.white_agent.losses}</p>
                  <p className="text-gray-400">Losses</p>
                </div>
              </div>
              
              {match.white_elo_after && match.white_elo_before && (
                <div className="mt-4 pt-4 border-t border-stone">
                  <p className="text-gray-400 text-sm">ELO Change</p>
                  <p className={`font-bold ${formatEloChange(match.white_elo_before, match.white_elo_after).color}`}>
                    {formatEloChange(match.white_elo_before, match.white_elo_after).formatted}
                  </p>
                </div>
              )}
            </div>

            {/* Black Agent */}
            <div className="bg-stone-dark rounded-lg p-4">
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">BLACK</div>
                  {match.black_time_remaining !== undefined && (
                    <div className={`text-2xl font-mono font-bold ${
                      (match.black_time_remaining < 60000) ? 'text-red' : 'text-green-400'
                    }`}>
                      {formatTimeRemaining(match.black_time_remaining)}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-xl font-bold text-white">{match.black_agent.name}</h3>
                  <p className="text-gray-400">{match.black_agent.model}</p>
                  <p className="text-gold font-bold">ELO: {match.black_agent.elo}</p>
                </div>
                <img 
                  src={match.black_agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                  alt={match.black_agent.name}
                  className="w-16 h-16 rounded-full border-2 border-gold"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-green-400 font-bold">{match.black_agent.wins}</p>
                  <p className="text-gray-400">Wins</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold">{match.black_agent.draws}</p>
                  <p className="text-gray-400">Draws</p>
                </div>
                <div>
                  <p className="text-red font-bold">{match.black_agent.losses}</p>
                  <p className="text-gray-400">Losses</p>
                </div>
              </div>
              
              {match.black_elo_after && match.black_elo_before && (
                <div className="mt-4 pt-4 border-t border-stone">
                  <p className="text-gray-400 text-sm">ELO Change</p>
                  <p className={`font-bold ${formatEloChange(match.black_elo_before, match.black_elo_after).color}`}>
                    {formatEloChange(match.black_elo_before, match.black_elo_after).formatted}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Chess Board */}
          <div className="lg:col-span-3">
            <div className="bg-stone-gradient rounded-lg border border-gold/20 p-6">
              <div className="max-w-lg mx-auto">
                <ChessBoard 
                  fen={currentFen}
                  interactive={false}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Move History */}
            <div className="bg-stone-gradient rounded-lg border border-gold/20 p-4">
              <h3 className="text-lg font-bold text-gold mb-4">Move History</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {moves.length > 0 ? (
                  moves.reduce((pairs: Move[][], move, index) => {
                    if (index % 2 === 0) {
                      pairs.push([move]);
                    } else {
                      pairs[pairs.length - 1].push(move);
                    }
                    return pairs;
                  }, []).map((pair, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 w-8">{index + 1}.</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="text-white">
                          {pair[0].move}
                          <span className="text-gray-500 text-xs ml-2">
                            {((pair[0].time_taken_ms ?? 0) / 1000).toFixed(1)}s
                          </span>
                        </div>
                        {pair[1] && (
                          <div className="text-white">
                            {pair[1].move}
                            <span className="text-gray-500 text-xs ml-2">
                              {((pair[1].time_taken_ms ?? 0) / 1000).toFixed(1)}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No moves yet</p>
                )}
              </div>
            </div>

            {/* Prediction/Betting */}
            {isLive && (
              <div className="bg-stone-gradient rounded-lg border border-gold/20 p-4">
                <h3 className="text-lg font-bold text-gold mb-4">Prediction</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white">{match.white_agent.name}</span>
                      <span className="text-gold">45%</span>
                    </div>
                    <div className="bg-stone-dark rounded-full h-2">
                      <div className="bg-gold h-2 rounded-full transition-all duration-300" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white">{match.black_agent.name}</span>
                      <span className="text-gold">55%</span>
                    </div>
                    <div className="bg-stone-dark rounded-full h-2">
                      <div className="bg-gold h-2 rounded-full transition-all duration-300" style={{ width: '55%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Chat Placeholder */}
            <div className="bg-stone-gradient rounded-lg border border-gold/20 p-4">
              <h3 className="text-lg font-bold text-gold mb-4">Live Chat</h3>
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Chat coming soon...</p>
                <p className="text-gray-500 text-xs mt-2">
                  Discuss the match with other spectators
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}