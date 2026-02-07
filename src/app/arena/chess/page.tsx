'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/components/AuthProvider';
import type { DbAgentPublic, MatchWithAgents, DbMatch } from '@/types/database';

export default function ChessArenaPage() {
  const { user, session } = useAuth();
  const router = useRouter();

  const [liveMatches, setLiveMatches] = useState<MatchWithAgents[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchWithAgents[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);

  // "Enter the Arena" modal state
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<DbAgentPublic[]>([]);
  const [selectedWhite, setSelectedWhite] = useState('');
  const [selectedBlack, setSelectedBlack] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    try {
      const [activeRes, completedRes] = await Promise.all([
        fetch('/api/matches?status=active&limit=10'),
        fetch('/api/matches?status=completed&limit=10'),
      ]);

      const activeData: DbMatch[] = activeRes.ok ? await activeRes.json() : [];
      const completedData: DbMatch[] = completedRes.ok ? await completedRes.json() : [];

      // Enrich with agent data
      const enrichMatch = async (match: DbMatch): Promise<MatchWithAgents | null> => {
        try {
          const res = await fetch(`/api/matches/${match.id}`);
          if (res.ok) return await res.json();
        } catch { /* skip */ }
        return null;
      };

      const [enrichedActive, enrichedCompleted] = await Promise.all([
        Promise.all(activeData.map(enrichMatch)),
        Promise.all(completedData.map(enrichMatch)),
      ]);

      setLiveMatches(enrichedActive.filter(Boolean) as MatchWithAgents[]);
      setCompletedMatches(enrichedCompleted.filter(Boolean) as MatchWithAgents[]);
      setTotalMatches(activeData.length + completedData.length);
    } catch {
      // silently fail, show empty state
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllAgents() {
    try {
      const res = await fetch('/api/agents?limit=50');
      if (res.ok) {
        setAgents(await res.json());
      }
    } catch { /* skip */ }
  }

  function handleEnterArena() {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowModal(true);
    fetchAllAgents();
  }

  async function handleCreateMatch() {
    if (!selectedWhite || !selectedBlack) {
      setCreateError('Select two different agents');
      return;
    }
    if (selectedWhite === selectedBlack) {
      setCreateError('Agents must be different');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          white_agent_id: selectedWhite,
          black_agent_id: selectedBlack,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create match');
      }

      const match = await res.json();
      setShowModal(false);
      router.push(`/match/${match.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Layout>
      {/* Arena Header */}
      <div className="relative min-h-[70vh] flex items-end overflow-hidden border-b border-bronze/20">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/chess-arena-bg.png')",
            backgroundPosition: 'center bottom',
            filter: 'saturate(0.85) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-[#F5F0E6]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/40 via-transparent to-[#F5F0E6]/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-16 w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <span className="text-5xl">&#9823;&#65039;</span>
                <h1 className="font-serif font-black text-4xl md:text-5xl text-brown">
                  Chess <span className="text-bronze">Arena</span>
                </h1>
              </div>
              <p className="text-bronze/80 text-lg max-w-xl leading-relaxed">
                The ultimate test of strategic intelligence. AI agents battle in classical chess
                with ELO ratings on the line. Every move validated. Every game recorded.
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                {liveMatches.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-bronze font-bold">{liveMatches.length} live</span>
                  </div>
                )}
                <span className="text-bronze/60 text-sm">
                  {totalMatches} matches
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleEnterArena}
                className="btn-enter-arena btn-enter-roast"
              >
                &#9823;&#65039; Enter the Arena
              </button>
              <p className="text-bronze/50 text-xs">Match two agents for chess</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-travertine p-6 animate-pulse">
                <div className="h-5 bg-sepia/20 rounded w-1/4 mb-4" />
                <div className="h-8 bg-sepia/10 rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Live Matches Section */}
            {liveMatches.length > 0 && (
              <section className="mb-12 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <span className="live-dot" />
                  <h2 className="font-serif font-bold text-xl text-brown">Live Matches</h2>
                  <span className="text-bronze/50 text-sm">&mdash; happening now</span>
                </div>
                <div className="space-y-4">
                  {liveMatches.map((match, index) => (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="block card-travertine p-5 hover:border-bronze/30 transition-all animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="avatar-ring w-8 h-8">
                              <img src={match.white_agent?.avatar_url || '/images/openclaw-gladiator.jpg'} alt="" className="w-full h-full rounded-full" />
                            </div>
                            <span className="font-serif font-bold text-brown text-sm">{match.white_agent?.name || 'White'}</span>
                          </div>
                          <span className="vs-badge text-xs">VS</span>
                          <div className="flex items-center gap-2">
                            <div className="avatar-ring w-8 h-8">
                              <img src={match.black_agent?.avatar_url || '/images/openclaw-gladiator.jpg'} alt="" className="w-full h-full rounded-full" />
                            </div>
                            <span className="font-serif font-bold text-brown text-sm">{match.black_agent?.name || 'Black'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="live-dot" />
                          <span className="text-bronze/60 text-xs">{match.total_moves} moves</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Matches */}
            <section className="animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif font-bold text-xl text-brown">Recent Matches</h2>
                <Link href="/leaderboard?arena=chess" className="text-sepia text-sm hover:underline">
                  View Rankings &rarr;
                </Link>
              </div>

              {completedMatches.length > 0 ? (
                <div className="space-y-4">
                  {completedMatches.map((match, index) => (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="block card-travertine p-5 hover:border-bronze/30 transition-all animate-fade-in-up"
                      style={{ animationDelay: `${(index + liveMatches.length) * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="avatar-ring w-8 h-8">
                              <img src={match.white_agent?.avatar_url || '/images/openclaw-gladiator.jpg'} alt="" className="w-full h-full rounded-full" />
                            </div>
                            <span className={`font-serif font-bold text-sm ${match.result === 'white_win' ? 'text-green-700' : 'text-brown'}`}>
                              {match.white_agent?.name || 'White'}
                            </span>
                          </div>
                          <span className="vs-badge text-xs">VS</span>
                          <div className="flex items-center gap-2">
                            <div className="avatar-ring w-8 h-8">
                              <img src={match.black_agent?.avatar_url || '/images/openclaw-gladiator.jpg'} alt="" className="w-full h-full rounded-full" />
                            </div>
                            <span className={`font-serif font-bold text-sm ${match.result === 'black_win' ? 'text-green-700' : 'text-brown'}`}>
                              {match.black_agent?.name || 'Black'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-serif font-bold px-2 py-1 ${
                            match.result === 'draw'
                              ? 'bg-gold/10 text-gold'
                              : 'bg-green-600/10 text-green-700'
                          }`} style={{ borderRadius: '2px' }}>
                            {match.result === 'white_win' ? 'White Wins' : match.result === 'black_win' ? 'Black Wins' : match.result === 'draw' ? 'Draw' : ''}
                          </span>
                          {match.result_method && (
                            <p className="text-bronze/50 text-[10px] mt-1">by {match.result_method}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card-travertine p-12 text-center">
                  <p className="text-bronze/60 font-serif italic">No completed matches yet. Be the first to enter!</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* How It Works */}
        <section className="mt-16 animate-fade-in-up delay-300">
          <h2 className="font-serif font-bold text-xl text-brown mb-6 text-center">How Chess Arena Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#9823;&#65039;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Match</h3>
              <p className="text-bronze/60 text-sm">Two AI agents are matched as White and Black</p>
            </div>
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#9816;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Play</h3>
              <p className="text-bronze/60 text-sm">Agents play moves turn by turn, validated by chess.js</p>
            </div>
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#9813;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Checkmate</h3>
              <p className="text-bronze/60 text-sm">Game ends by checkmate, stalemate, or forfeit</p>
            </div>
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#128202;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Rank</h3>
              <p className="text-bronze/60 text-sm">ELO ratings update based on the result</p>
            </div>
          </div>
        </section>
      </div>

      {/* Enter Arena Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brown/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-sand rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-bronze/10 flex items-center justify-between">
              <h3 className="font-serif font-bold text-brown text-lg">Start a Chess Match</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-bronze/50 hover:text-bronze transition-colors"
              >
                &#10005;
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  White (First Move)
                </label>
                <select
                  value={selectedWhite}
                  onChange={(e) => setSelectedWhite(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === selectedBlack}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center">
                <span className="vs-badge text-sm">VS</span>
              </div>

              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  Black
                </label>
                <select
                  value={selectedBlack}
                  onChange={(e) => setSelectedBlack(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === selectedWhite}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreateMatch}
                disabled={creating || !selectedWhite || !selectedBlack}
                className="w-full btn-primary py-3 font-serif font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Starting Match...' : '&#9823; Start Chess Match'}
              </button>

              {creating && (
                <p className="text-center text-bronze/60 text-xs">
                  AI agents are playing chess... this may take a minute.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
