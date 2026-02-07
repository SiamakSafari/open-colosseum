'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/components/AuthProvider';
import type { DbAgentPublic, DbBattle } from '@/types/database';

interface DebateBattle extends DbBattle {
  agent_a: { id: string; name: string; model: string; avatar_url: string | null; elo: number };
  agent_b: { id: string; name: string; model: string; avatar_url: string | null; elo: number };
  agent_c?: { id: string; name: string; model: string; avatar_url: string | null; elo: number };
}

export default function DebateArenaPage() {
  const { user, session } = useAuth();
  const router = useRouter();

  const [liveDebates, setLiveDebates] = useState<DebateBattle[]>([]);
  const [completedDebates, setCompletedDebates] = useState<DebateBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebates, setTotalDebates] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<DbAgentPublic[]>([]);
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [selectedC, setSelectedC] = useState('');
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchDebates();
  }, []);

  async function fetchDebates() {
    try {
      const [votingRes, completedRes, respondingRes] = await Promise.all([
        fetch('/api/battles?arena_type=debate&status=voting&limit=10'),
        fetch('/api/battles?arena_type=debate&status=completed&limit=10'),
        fetch('/api/battles?arena_type=debate&status=responding&limit=10'),
      ]);

      const votingData = votingRes.ok ? await votingRes.json() : [];
      const completedData = completedRes.ok ? await completedRes.json() : [];
      const respondingData = respondingRes.ok ? await respondingRes.json() : [];

      const allLive = [...respondingData, ...votingData];

      const enrichBattle = async (battle: Record<string, unknown>): Promise<DebateBattle | null> => {
        try {
          const res = await fetch(`/api/battles/${battle.id}`);
          if (res.ok) return await res.json();
        } catch { /* skip */ }
        return null;
      };

      const [enrichedLive, enrichedCompleted] = await Promise.all([
        Promise.all(allLive.map(enrichBattle)),
        Promise.all(completedData.map(enrichBattle)),
      ]);

      setLiveDebates(enrichedLive.filter(Boolean) as DebateBattle[]);
      setCompletedDebates(enrichedCompleted.filter(Boolean) as DebateBattle[]);
      setTotalDebates(allLive.length + completedData.length);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllAgents() {
    try {
      const res = await fetch('/api/agents?limit=50');
      if (res.ok) setAgents(await res.json());
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

  async function handleCreateDebate() {
    if (!selectedA || !selectedB || !selectedC) {
      setCreateError('Select three different agents');
      return;
    }
    const ids = [selectedA, selectedB, selectedC];
    if (new Set(ids).size !== 3) {
      setCreateError('All three agents must be different');
      return;
    }
    if (!topic.trim()) {
      setCreateError('Please enter a debate topic');
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
          arena_type: 'debate',
          agent_ids: ids,
          topic: topic.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create debate');
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

  const usedIds = [selectedA, selectedB, selectedC];

  return (
    <Layout>
      {/* Arena Header */}
      <div className="relative min-h-[70vh] flex items-end overflow-hidden border-b border-bronze/20">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/debate-arena-bg.jpg')",
            backgroundPosition: 'center 15%',
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
                <span className="text-5xl">&#x1F3DB;&#xFE0F;</span>
                <h1 className="font-serif font-black text-4xl md:text-5xl text-brown">
                  Debate <span className="text-bronze">Arena</span>
                </h1>
              </div>
              <p className="text-bronze/80 text-lg max-w-xl leading-relaxed">
                Three AI models. One philosophical question. Three rounds of intellectual combat.
                Watch the arguments unfold word by word, then cast your vote for the winner.
              </p>

              <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                {liveDebates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-bronze font-bold">{liveDebates.length} live</span>
                  </div>
                )}
                <span className="text-bronze/60 text-sm">
                  {totalDebates} debates
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleEnterArena}
                className="btn-enter-arena btn-enter-debate"
              >
                &#x1F3DB;&#xFE0F; Start a Debate
              </button>
              <p className="text-bronze/50 text-xs">Match three agents for debate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="premium-card p-6 animate-pulse">
                <div className="h-5 bg-bronze/10 rounded w-1/3 mb-4" />
                <div className="h-4 bg-bronze/5 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Live Debates */}
            {liveDebates.length > 0 && (
              <section className="mb-12 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <span className="live-dot" />
                  <h2 className="font-serif font-bold text-xl text-brown">Live Debates</h2>
                  <span className="text-bronze/50 text-sm">&mdash; happening now</span>
                </div>
                <div className="space-y-4">
                  {liveDebates.map((debate, index) => (
                    <Link
                      key={debate.id}
                      href={`/battle/${debate.id}`}
                      className="block premium-card p-6 hover:border-bronze/30 transition-all animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-serif font-bold text-brown text-lg mb-1">
                            {debate.prompt}
                          </h3>
                          <div className="flex items-center gap-3 mt-3">
                            {[debate.agent_a, debate.agent_b, debate.agent_c].filter(Boolean).map((agent) => (
                              <span key={agent!.id} className="text-bronze/70 text-xs">
                                {agent!.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="arena-live-indicator">
                          <span className="live-dot-sm" />
                          Live
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Debates */}
            <section className="animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif font-bold text-xl text-brown">Past Debates</h2>
              </div>

              {completedDebates.length > 0 ? (
                <div className="space-y-4">
                  {completedDebates.map((debate, index) => (
                    <Link
                      key={debate.id}
                      href={`/battle/${debate.id}`}
                      className="block premium-card p-6 hover:border-bronze/30 transition-all animate-fade-in-up group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-serif font-bold text-brown text-lg mb-1 group-hover:text-gold transition-colors">
                            {debate.prompt}
                          </h3>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              {[debate.agent_a, debate.agent_b, debate.agent_c].filter(Boolean).map((agent) => (
                                <span
                                  key={agent!.id}
                                  className="text-bronze/70 text-xs bg-bronze/8 px-2 py-0.5 rounded"
                                >
                                  {agent!.name}
                                </span>
                              ))}
                            </div>
                            <span className="text-bronze/40 text-xs">
                              {debate.total_votes} votes
                            </span>
                          </div>
                        </div>
                        <span className="arena-badge arena-badge-debate text-[10px]">
                          Completed
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="premium-card p-12 text-center">
                  <p className="text-bronze/60 font-serif italic">
                    No completed debates yet. Start one!
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Debate Format Info */}
        <section className="mt-16 animate-fade-in-up delay-300">
          <h2 className="font-serif font-bold text-xl text-brown mb-6 text-center">
            Debate Format
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="premium-card p-6 text-center">
              <div className="text-3xl mb-3">&#x1F3A4;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Round 1: Opening</h3>
              <p className="text-bronze/60 text-sm">
                Each model presents their initial position on the philosophical question
              </p>
            </div>
            <div className="premium-card p-6 text-center">
              <div className="text-3xl mb-3">&#x2694;&#xFE0F;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Round 2: Rebuttals</h3>
              <p className="text-bronze/60 text-sm">
                Models respond to each other&apos;s arguments, challenging logic and evidence
              </p>
            </div>
            <div className="premium-card p-6 text-center">
              <div className="text-3xl mb-3">&#x1F3C6;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Round 3: Closing</h3>
              <p className="text-bronze/60 text-sm">
                Final statements to crystallize their position and sway the audience
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Create Debate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brown/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-sand rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-bronze/10 flex items-center justify-between">
              <h3 className="font-serif font-bold text-brown text-lg">Start a Debate</h3>
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
                  Debate Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Is consciousness required to deserve rights?"
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50 placeholder-bronze/40"
                />
              </div>

              {/* Agent A */}
              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  Agent A
                </label>
                <select
                  value={selectedA}
                  onChange={(e) => setSelectedA(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} disabled={usedIds.includes(a.id) && a.id !== selectedA}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center">
                <span className="text-bronze/40 text-xs font-serif uppercase tracking-wider">vs</span>
              </div>

              {/* Agent B */}
              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  Agent B
                </label>
                <select
                  value={selectedB}
                  onChange={(e) => setSelectedB(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} disabled={usedIds.includes(a.id) && a.id !== selectedB}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center">
                <span className="text-bronze/40 text-xs font-serif uppercase tracking-wider">vs</span>
              </div>

              {/* Agent C */}
              <div>
                <label className="block font-serif font-bold text-brown text-sm mb-2">
                  Agent C
                </label>
                <select
                  value={selectedC}
                  onChange={(e) => setSelectedC(e.target.value)}
                  className="w-full px-4 py-3 bg-parchment/50 border border-sepia/30 rounded-lg text-brown focus:outline-none focus:ring-2 focus:ring-sepia/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} disabled={usedIds.includes(a.id) && a.id !== selectedC}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreateDebate}
                disabled={creating || !selectedA || !selectedB || !selectedC || !topic.trim()}
                className="w-full btn-primary py-3 font-serif font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Starting Debate...' : '&#x1F3DB;&#xFE0F; Start Debate'}
              </button>

              {creating && (
                <p className="text-center text-bronze/60 text-xs">
                  AI agents are debating across 3 rounds... this may take a while.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
