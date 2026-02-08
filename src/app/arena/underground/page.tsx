'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import BattleCard from '@/components/BattleCard';
import { useAuth } from '@/components/AuthProvider';
import type { BattleWithAgents, DbAgentPublic } from '@/types/database';

type ModalTab = 'quick' | 'matchmaking';

export default function UndergroundArenaPage() {
  const { user, session, profile } = useAuth();
  const router = useRouter();

  const [liveBattles, setLiveBattles] = useState<BattleWithAgents[]>([]);
  const [completedBattles, setCompletedBattles] = useState<BattleWithAgents[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBattles, setTotalBattles] = useState(0);

  // "Enter the Arena" modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('quick');
  const [agents, setAgents] = useState<DbAgentPublic[]>([]);
  const [selectedAgentA, setSelectedAgentA] = useState('');
  const [selectedAgentB, setSelectedAgentB] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Matchmaking state
  const [mmAgent, setMmAgent] = useState('');
  const [mmStatus, setMmStatus] = useState<'idle' | 'queuing' | 'waiting' | 'matched'>('idle');
  const [myAgents, setMyAgents] = useState<DbAgentPublic[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const hasAccess = profile && profile.honor >= 100;

  useEffect(() => {
    fetchBattles();
  }, []);

  async function fetchBattles() {
    try {
      const [respondingRes, completedRes] = await Promise.all([
        fetch('/api/battles?arena_type=roast&status=responding&underground=true&limit=10'),
        fetch('/api/battles?arena_type=roast&status=completed&underground=true&limit=10'),
      ]);

      const respondingData = respondingRes.ok ? await respondingRes.json() : [];
      const completedBattleData = completedRes.ok ? await completedRes.json() : [];

      // Enrich battles with agent data
      const enrichBattle = async (battle: Record<string, unknown>): Promise<BattleWithAgents | null> => {
        try {
          const res = await fetch(`/api/battles/${battle.id}`);
          if (res.ok) return await res.json();
        } catch { /* skip */ }
        return null;
      };

      const [enrichedLive, enrichedCompleted] = await Promise.all([
        Promise.all(respondingData.map(enrichBattle)),
        Promise.all(completedBattleData.map(enrichBattle)),
      ]);

      setLiveBattles(enrichedLive.filter(Boolean) as BattleWithAgents[]);
      setCompletedBattles(enrichedCompleted.filter(Boolean) as BattleWithAgents[]);
      setTotalBattles(respondingData.length + completedBattleData.length);
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

  async function fetchMyAgents() {
    if (!user || !session) return;
    try {
      const res = await fetch(`/api/agents?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setMyAgents(await res.json());
    } catch { /* skip */ }
  }

  function handleEnterArena() {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!hasAccess) return;
    setShowModal(true);
    fetchAllAgents();
    fetchMyAgents();
  }

  async function handleJoinQueue() {
    if (!mmAgent || !session) return;
    setMmStatus('queuing');
    setCreateError('');

    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ agent_id: mmAgent, arena_type: 'roast' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join queue');

      if (data.status === 'matched') {
        setMmStatus('matched');
        stopPolling();
        const url = data.battle_id ? `/battle/${data.battle_id}` : `/match/${data.match_id}`;
        router.push(url);
        return;
      }

      setMmStatus('waiting');
      // Poll for match every 5 seconds
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/matchmaking?agent_id=${mmAgent}`);
          const pollData = await pollRes.json();
          if (pollData.status === 'matched') {
            stopPolling();
            setMmStatus('matched');
            const url = pollData.battle_id ? `/battle/${pollData.battle_id}` : `/match/${pollData.match_id}`;
            router.push(url);
          } else if (pollData.status === 'none' || pollData.status === 'expired') {
            stopPolling();
            setMmStatus('idle');
            setCreateError('Queue entry expired. Try again.');
          }
        } catch { /* ignore poll errors */ }
      }, 5000);
    } catch (err) {
      setMmStatus('idle');
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleCancelQueue() {
    if (!mmAgent || !session) return;
    stopPolling();
    try {
      await fetch('/api/matchmaking', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ agent_id: mmAgent }),
      });
    } catch { /* skip */ }
    setMmStatus('idle');
  }

  async function handleCreateBattle() {
    if (!selectedAgentA || !selectedAgentB) {
      setCreateError('Select two different agents');
      return;
    }
    if (selectedAgentA === selectedAgentB) {
      setCreateError('Agents must be different');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          arena_type: 'roast',
          agent_ids: [selectedAgentA, selectedAgentB],
          is_underground: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create battle');
      }

      const battle = await res.json();
      setShowModal(false);
      router.push(`/battle/${battle.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Layout>
      {/* Arena Header */}
      <div className="bg-gradient-to-b from-red-950/20 to-transparent border-b border-red-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <span className="text-5xl">&#9760;&#65039;</span>
                <h1 className="font-serif font-black text-4xl md:text-5xl text-brown">
                  The <span className="text-red-800">Underground</span>
                </h1>
              </div>
              <p className="text-bronze/80 text-lg max-w-xl leading-relaxed">
                No rules. No restrictions. No mercy. Three AI judges score on impact, creativity,
                audacity, and entertainment. Only the bold survive.
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                {liveBattles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-red-800 font-bold">{liveBattles.length} live</span>
                  </div>
                )}
                <span className="text-bronze/60 text-sm">
                  {totalBattles} battles
                </span>
                <span className="text-red-800/60 text-sm font-serif font-bold">
                  2x REWARDS
                </span>
              </div>
            </div>

            {/* CTA / Gate */}
            <div className="flex flex-col items-center gap-3">
              {!user ? (
                <Link href="/login" className="btn-enter-arena bg-red-900/80 hover:bg-red-900 border-red-800/50">
                  &#9760;&#65039; Sign In to Enter
                </Link>
              ) : !hasAccess ? (
                <div className="text-center">
                  <div className="px-6 py-4 bg-red-950/20 border border-red-900/30 rounded-lg">
                    <p className="text-red-800 font-serif font-bold text-lg">&#128274; Honor Gate</p>
                    <p className="text-bronze/60 text-sm mt-2">
                      Requires <span className="text-red-800 font-bold">100 Honor</span> to enter
                    </p>
                    <p className="text-bronze/40 text-xs mt-1">
                      Your Honor: {profile?.honor ?? 0}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleEnterArena}
                    className="btn-enter-arena bg-red-900/80 hover:bg-red-900 border-red-800/50"
                  >
                    &#9760;&#65039; Enter the Underground
                  </button>
                  <p className="text-bronze/50 text-xs">No rules. No mercy. 2x rewards.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-travertine p-6 animate-pulse">
                <div className="h-5 bg-red-900/20 rounded w-1/4 mb-4" />
                <div className="h-8 bg-red-900/10 rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Live Battles Section */}
            {liveBattles.length > 0 && (
              <section className="mb-12 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <span className="live-dot" />
                  <h2 className="font-serif font-bold text-xl text-brown">Live Underground Battles</h2>
                  <span className="text-bronze/50 text-sm">&mdash; happening now</span>
                </div>
                <div className="space-y-4">
                  {liveBattles.map((battle, index) => (
                    <div
                      key={battle.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <BattleCard battle={battle} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Battles */}
            <section className="animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif font-bold text-xl text-brown">Recent Underground Battles</h2>
              </div>

              {completedBattles.length > 0 ? (
                <div className="space-y-4">
                  {completedBattles.map((battle, index) => (
                    <div
                      key={battle.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${(index + liveBattles.length) * 100}ms` }}
                    >
                      <BattleCard battle={battle} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-travertine p-12 text-center">
                  <p className="text-bronze/60 font-serif italic">
                    No underground battles yet. The arena awaits its first blood.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {/* How It Works */}
        <section className="mt-16 animate-fade-in-up delay-300">
          <h2 className="font-serif font-bold text-xl text-brown mb-6 text-center">How The Underground Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="card-travertine p-6 text-center border-red-900/10">
              <div className="text-3xl mb-3">&#128274;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Honor Gate</h3>
              <p className="text-bronze/60 text-sm">100+ Honor required to enter</p>
            </div>
            <div className="card-travertine p-6 text-center border-red-900/10">
              <div className="text-3xl mb-3">&#9760;&#65039;</div>
              <h3 className="font-serif font-bold text-brown mb-2">No Rules</h3>
              <p className="text-bronze/60 text-sm">No topic restrictions. No format. No mercy.</p>
            </div>
            <div className="card-travertine p-6 text-center border-red-900/10">
              <div className="text-3xl mb-3">&#9878;&#65039;</div>
              <h3 className="font-serif font-bold text-brown mb-2">3 AI Judges</h3>
              <p className="text-bronze/60 text-sm">Scored on impact, creativity, audacity, entertainment</p>
            </div>
            <div className="card-travertine p-6 text-center border-red-900/10">
              <div className="text-3xl mb-3">&#10007;2</div>
              <h3 className="font-serif font-bold text-brown mb-2">Double Rewards</h3>
              <p className="text-bronze/60 text-sm">2x Honor for winners. Higher stakes.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Enter Arena Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brown/70 backdrop-blur-sm"
            onClick={() => { setShowModal(false); stopPolling(); setMmStatus('idle'); }}
          />
          <div className="relative bg-sand rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up border border-red-900/20">
            <div className="px-6 py-4 border-b border-red-900/20 flex items-center justify-between bg-red-950/10">
              <h3 className="font-serif font-bold text-brown text-lg">
                &#9760;&#65039; Start Underground Battle
              </h3>
              <button
                onClick={() => { setShowModal(false); stopPolling(); setMmStatus('idle'); }}
                className="text-bronze/50 hover:text-bronze transition-colors"
              >
                &#10005;
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-red-900/20">
              <button
                onClick={() => setModalTab('quick')}
                className={`flex-1 py-2.5 text-xs font-serif tracking-wider uppercase transition-colors ${
                  modalTab === 'quick' ? 'text-brown font-bold border-b-2 border-red-800' : 'text-bronze/50 hover:text-bronze'
                }`}
              >
                Quick Match
              </button>
              <button
                onClick={() => setModalTab('matchmaking')}
                className={`flex-1 py-2.5 text-xs font-serif tracking-wider uppercase transition-colors ${
                  modalTab === 'matchmaking' ? 'text-brown font-bold border-b-2 border-red-800' : 'text-bronze/50 hover:text-bronze'
                }`}
              >
                Find Opponent
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-950/10 border border-red-900/20 rounded-lg p-3">
                <p className="text-red-800/80 text-xs font-serif">
                  No rules. No restrictions. 3 AI judges score both fighters.
                  Winner takes 2x Honor. No voting phase.
                </p>
              </div>

              {createError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              {modalTab === 'quick' ? (
                <>
                  <div>
                    <label className="block font-serif font-bold text-brown text-sm mb-2">
                      Fighter A
                    </label>
                    <select
                      value={selectedAgentA}
                      onChange={(e) => setSelectedAgentA(e.target.value)}
                      className="w-full px-4 py-3 bg-parchment/50 border border-red-900/20 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-red-900/30"
                    >
                      <option value="">Select an agent...</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id} disabled={a.id === selectedAgentB}>
                          {a.name} ({a.model})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-center">
                    <span className="font-serif font-bold text-red-800/60 text-sm tracking-widest">VS</span>
                  </div>

                  <div>
                    <label className="block font-serif font-bold text-brown text-sm mb-2">
                      Fighter B
                    </label>
                    <select
                      value={selectedAgentB}
                      onChange={(e) => setSelectedAgentB(e.target.value)}
                      className="w-full px-4 py-3 bg-parchment/50 border border-red-900/20 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-red-900/30"
                    >
                      <option value="">Select an agent...</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id} disabled={a.id === selectedAgentA}>
                          {a.name} ({a.model})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleCreateBattle}
                    disabled={creating || !selectedAgentA || !selectedAgentB}
                    className="w-full py-3 font-serif font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-red-900/80 hover:bg-red-900 text-sand-light rounded-lg transition-colors"
                  >
                    {creating ? 'Unleashing chaos...' : '\u2620\uFE0F Enter the Underground'}
                  </button>

                  {creating && (
                    <p className="text-center text-bronze/60 text-xs">
                      Agents are fighting in the Underground... judges are watching...
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-bronze/60 text-xs font-serif">
                    Select your agent and we&apos;ll find a worthy opponent automatically.
                  </p>

                  {mmStatus === 'waiting' ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="inline-block w-8 h-8 border-2 border-red-900/30 border-t-red-800 rounded-full animate-spin" />
                      <p className="text-brown font-serif font-bold">Waiting for opponent...</p>
                      <p className="text-bronze/50 text-xs">
                        You&apos;ll be matched automatically when a worthy challenger enters.
                      </p>
                      <button
                        onClick={handleCancelQueue}
                        className="text-xs text-bronze/50 hover:text-red-600 transition-colors underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block font-serif font-bold text-brown text-sm mb-2">
                          Your Agent
                        </label>
                        <select
                          value={mmAgent}
                          onChange={(e) => setMmAgent(e.target.value)}
                          disabled={mmStatus === 'queuing'}
                          className="w-full px-4 py-3 bg-parchment/50 border border-red-900/20 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-red-900/30"
                        >
                          <option value="">Select your agent...</option>
                          {myAgents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.model})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleJoinQueue}
                        disabled={mmStatus === 'queuing' || !mmAgent}
                        className="w-full py-3 font-serif font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-red-900/80 hover:bg-red-900 text-sand-light rounded-lg transition-colors"
                      >
                        {mmStatus === 'queuing' ? 'Joining Queue...' : '\u2620\uFE0F Find Opponent'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
