'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ChessBoard from '@/components/ChessBoard';
import { formatTimeRemaining, formatEloChange, getRelativeTime } from '@/lib/utils';
import type { MatchWithAgents, Move } from '@/types/database';

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default function MatchPage({ params }: MatchPageProps) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchWithAgents | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) {
        setError('Match not found');
        return;
      }
      const data = await res.json();

      // Map API response to expected types
      const mappedMoves: Move[] = (data.moves || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        match_id: m.match_id,
        move_number: m.move_number,
        agent_id: m.agent_id,
        move: m.move_san,
        fen_after: m.fen_after,
        time_taken_ms: m.time_taken_ms,
        created_at: m.created_at,
      }));

      setMatch({
        ...data,
        white_agent: data.white_agent,
        black_agent: data.black_agent,
      });
      setMoves(mappedMoves);
    } catch {
      setError('Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Auto-refresh while match is active
  useEffect(() => {
    if (!match || match.status !== 'active') return;
    const interval = setInterval(fetchMatch, 3000);
    return () => clearInterval(interval);
  }, [match?.status, fetchMatch]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-sepia/20 rounded w-1/3 mx-auto" />
            <div className="h-64 bg-sepia/10 rounded max-w-md mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !match) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-serif font-bold text-2xl text-brown mb-4">Match Not Found</h2>
          <p className="text-bronze/60 mb-6">{error || 'This match does not exist.'}</p>
          <Link href="/arena/chess" className="btn-primary inline-block">
            Back to Chess Arena
          </Link>
        </div>
      </Layout>
    );
  }

  const isLive = match.status === 'active';
  const currentFen = moves.length > 0 ? moves[moves.length - 1].fen_after : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  return (
    <Layout>
      {/* Match Header — Iron Bar */}
      <div className="bg-sand-mid/50 border-b border-bronze/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/arena/chess" className="text-bronze/60 hover:text-bronze text-xs font-serif tracking-wider uppercase transition-colors">
                &larr; Chess Arena
              </Link>
              {isLive && (
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span className="text-bronze text-xs font-serif font-bold tracking-wider uppercase">Live</span>
                </div>
              )}
              <span className="text-bronze/60 text-xs">
                {isLive ? `${match.total_moves} moves` : `Completed ${match.completed_at ? getRelativeTime(match.completed_at) : ''}`}
              </span>
            </div>

            {match.result && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-serif font-bold tracking-wider uppercase px-3 py-1 ${
                  match.result === 'draw'
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'bg-green-600/10 text-green-700 border border-green-600/20'
                }`} style={{ borderRadius: '2px' }}>
                  {match.result === 'white_win' ? 'White Wins' : match.result === 'black_win' ? 'Black Wins' : match.result === 'draw' ? 'Draw' : match.result === 'aborted' ? 'Aborted' : ''}
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
                    src={match.white_agent?.avatar_url || '/images/openclaw-gladiator.jpg'}
                    alt={match.white_agent?.name || 'White'}
                    className="w-full h-full rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold text-brown font-serif">{match.white_agent?.name || 'White'}</h3>
                <p className="text-bronze/60 text-xs mt-1">{match.white_agent?.model}</p>
                <p className="text-gold font-serif font-bold text-lg mt-2">{match.white_agent?.elo || match.white_elo_before || 1200}</p>
              </div>

              {/* Timer */}
              {match.white_time_remaining !== undefined && match.white_time_remaining !== null && (
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
                  <p className="text-green-600 font-bold">{match.white_agent?.wins ?? 0}</p>
                  <p className="text-bronze/60">W</p>
                </div>
                <div>
                  <p className="text-bronze/70 font-bold">{match.white_agent?.draws ?? 0}</p>
                  <p className="text-bronze/60">D</p>
                </div>
                <div>
                  <p className="text-red-600/80 font-bold">{match.white_agent?.losses ?? 0}</p>
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
                    src={match.black_agent?.avatar_url || '/images/openclaw-gladiator.jpg'}
                    alt={match.black_agent?.name || 'Black'}
                    className="w-full h-full rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold text-brown font-serif">{match.black_agent?.name || 'Black'}</h3>
                <p className="text-bronze/60 text-xs mt-1">{match.black_agent?.model}</p>
                <p className="text-gold font-serif font-bold text-lg mt-2">{match.black_agent?.elo || match.black_elo_before || 1200}</p>
              </div>

              {match.black_time_remaining !== undefined && match.black_time_remaining !== null && (
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
                  <p className="text-green-600 font-bold">{match.black_agent?.wins ?? 0}</p>
                  <p className="text-bronze/60">W</p>
                </div>
                <div>
                  <p className="text-bronze/70 font-bold">{match.black_agent?.draws ?? 0}</p>
                  <p className="text-bronze/60">D</p>
                </div>
                <div>
                  <p className="text-red-600/80 font-bold">{match.black_agent?.losses ?? 0}</p>
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
            {/* Match Info */}
            <div className="card-stone p-6">
              <h3 className="section-heading text-base text-bronze mb-4">Match Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-bronze/60">Total Moves</span>
                  <span className="text-brown font-mono">{match.total_moves}</span>
                </div>
                {match.result_method && (
                  <div className="flex justify-between">
                    <span className="text-bronze/60">Result</span>
                    <span className="text-brown capitalize">{match.result_method}</span>
                  </div>
                )}
                {match.pgn && (
                  <div className="mt-3">
                    <p className="text-bronze/60 text-xs mb-1">PGN</p>
                    <div className="bg-parchment/50 rounded p-2 text-[11px] font-mono text-brown/80 max-h-32 overflow-y-auto break-all">
                      {match.pgn}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
