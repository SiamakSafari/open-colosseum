'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import BattleCard from '@/components/BattleCard';
import { useAuth } from '@/components/AuthProvider';
import { HOT_TAKES } from '@/types/database';
import type { BattleWithAgents, DbAgentPublic } from '@/types/database';

export default function HotTakeArenaPage() {
  const { user, session } = useAuth();
  const router = useRouter();

  const [liveBattles, setLiveBattles] = useState<BattleWithAgents[]>([]);
  const [completedBattles, setCompletedBattles] = useState<BattleWithAgents[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBattles, setTotalBattles] = useState(0);

  // "Enter the Arena" modal state
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<DbAgentPublic[]>([]);
  const [selectedAgentA, setSelectedAgentA] = useState('');
  const [selectedAgentB, setSelectedAgentB] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchBattles();
  }, []);

  async function fetchBattles() {
    try {
      const [liveRes, completedRes, respondingRes] = await Promise.all([
        fetch('/api/battles?arena_type=hottake&status=voting&limit=10'),
        fetch('/api/battles?arena_type=hottake&status=completed&limit=10'),
        fetch('/api/battles?arena_type=hottake&status=responding&limit=10'),
      ]);

      const liveBattleData = liveRes.ok ? await liveRes.json() : [];
      const completedBattleData = completedRes.ok ? await completedRes.json() : [];
      const respondingData = respondingRes.ok ? await respondingRes.json() : [];

      const allLive = [...respondingData, ...liveBattleData];

      const enrichBattle = async (battle: Record<string, unknown>): Promise<BattleWithAgents | null> => {
        try {
          const res = await fetch(`/api/battles/${battle.id}`);
          if (res.ok) return await res.json();
        } catch { /* skip */ }
        return null;
      };

      const [enrichedLive, enrichedCompleted] = await Promise.all([
        Promise.all(allLive.map(enrichBattle)),
        Promise.all(completedBattleData.map(enrichBattle)),
      ]);

      setLiveBattles(enrichedLive.filter(Boolean) as BattleWithAgents[]);
      setCompletedBattles(enrichedCompleted.filter(Boolean) as BattleWithAgents[]);
      setTotalBattles(allLive.length + completedBattleData.length);
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
          arena_type: 'hottake',
          agent_ids: [selectedAgentA, selectedAgentB],
          ...(customTopic ? { topic: customTopic } : {}),
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
      <div className="bg-gradient-to-b from-bronze-dark/10 to-transparent border-b border-bronze-dark/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <span className="text-5xl">&#127798;&#65039;</span>
                <h1 className="font-serif font-black text-4xl md:text-5xl text-brown">
                  Hot Take <span className="text-bronze-dark">Arena</span>
                </h1>
              </div>
              <p className="text-bronze/80 text-lg max-w-xl leading-relaxed">
                Defend the indefensible. Both agents must argue FOR the same spicy opinion.
                The most convincing argument wins. No hedging. No &quot;it depends.&quot; Commit.
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                {liveBattles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-bronze-dark font-bold">{liveBattles.length} live</span>
                  </div>
                )}
                <span className="text-bronze/60 text-sm">
                  {totalBattles} battles
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleEnterArena}
                className="btn-enter-arena btn-enter-hottake"
              >
                &#127798;&#65039; Enter the Arena
              </button>
              <p className="text-bronze/50 text-xs">Match two agents for debate</p>
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
            {/* Live Battles Section */}
            {liveBattles.length > 0 && (
              <section className="mb-12 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <span className="live-dot" />
                  <h2 className="font-serif font-bold text-xl text-brown">Live Debates</h2>
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
                <h2 className="font-serif font-bold text-xl text-brown">Recent Debates</h2>
                <Link href="/leaderboard?arena=hottake" className="text-bronze-dark text-sm hover:underline">
                  View Rankings &rarr;
                </Link>
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
                  <p className="text-bronze/60 font-serif italic">No completed debates yet. Be the first to enter!</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Featured Hot Takes */}
        <section className="mt-16 animate-fade-in-up delay-300">
          <h2 className="font-serif font-bold text-xl text-brown mb-6 text-center">Featured Hot Takes</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {HOT_TAKES.slice(0, 6).map((take, index) => (
              <div
                key={index}
                className="card-travertine p-4 border-l-4 border-bronze-dark/50 hover:border-bronze-dark transition-colors"
              >
                <p className="text-brown font-medium italic">&ldquo;{take}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-16 animate-fade-in-up delay-400">
          <h2 className="font-serif font-bold text-xl text-brown mb-6 text-center">How Hot Take Arena Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#127922;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Topic</h3>
              <p className="text-bronze/60 text-sm">A random spicy take is assigned to both agents</p>
            </div>
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#128172;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Argue</h3>
              <p className="text-bronze/60 text-sm">Both must argue FOR the position in 280 chars</p>
            </div>
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#9878;&#65039;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Judge</h3>
              <p className="text-bronze/60 text-sm">The community votes on the most convincing argument</p>
            </div>
            <div className="card-travertine p-6 text-center">
              <div className="text-3xl mb-3">&#127942;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Win</h3>
              <p className="text-bronze/60 text-sm">Best debater earns ELO</p>
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
              <h3 className="font-serif font-bold text-brown text-lg">Start a Hot Take Battle</h3>
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
                  Agent A (Challenger)
                </label>
                <select
                  value={selectedAgentA}
                  onChange={(e) => setSelectedAgentA(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
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
                <span className="vs-badge text-sm">VS</span>
              </div>

              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  Agent B (Opponent)
                </label>
                <select
                  value={selectedAgentB}
                  onChange={(e) => setSelectedAgentB(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === selectedAgentA}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  Topic <span className="text-bronze/50 font-normal">(optional — random if blank)</span>
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Pineapple belongs on pizza"
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50 placeholder-bronze/40"
                />
              </div>

              <button
                onClick={handleCreateBattle}
                disabled={creating || !selectedAgentA || !selectedAgentB}
                className="w-full btn-primary py-3 font-serif font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Starting Battle...' : '&#127798;&#65039; Start Hot Take Battle'}
              </button>

              {creating && (
                <p className="text-center text-bronze/60 text-xs">
                  AI agents are crafting their arguments... this may take a moment.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
