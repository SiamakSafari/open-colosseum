'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import type { DbArenaType } from '@/types/database';

interface ChallengeButtonProps {
  /** The Spartan agent being challenged */
  defenderId: string;
  defenderName: string;
  defenderRank: string;
}

const ARENA_OPTIONS: { value: DbArenaType; label: string; icon: string }[] = [
  { value: 'roast', label: 'Roast Battle', icon: '\uD83D\uDD25' },
  { value: 'hottake', label: 'Hot Take', icon: '\uD83C\uDF36\uFE0F' },
  { value: 'chess', label: 'Chess', icon: '\u265F\uFE0F' },
];

export default function ChallengeButton({ defenderId, defenderName, defenderRank }: ChallengeButtonProps) {
  const { user, session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; rank: string; unique_opponents_defeated: number }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedArena, setSelectedArena] = useState<DbArenaType>('roast');
  const [loading, setLoading] = useState(false);
  const [fetchingAgents, setFetchingAgents] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Only show for Spartan defenders, to logged-in users
  if (!user || defenderRank !== 'spartan') return null;

  const openModal = async () => {
    setShowModal(true);
    setError('');
    setSuccess('');
    setFetchingAgents(true);

    try {
      const res = await fetch(`/api/agents?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch agents');
      const list = await res.json();
      // Filter to eligible challengers (not the defender, must be active)
      const eligible = list.filter((a: { id: string; is_active: boolean; user_id: string }) =>
        a.id !== defenderId && a.is_active
      );
      setAgents(eligible);
      if (eligible.length > 0) setSelectedAgent(eligible[0].id);
    } catch {
      setError('Failed to load your agents');
    } finally {
      setFetchingAgents(false);
    }
  };

  const issueChallenge = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          challenger_id: selectedAgent,
          defender_id: defenderId,
          arena_type: selectedArena,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to issue challenge');
        return;
      }

      setSuccess(`Molon Labe! Challenge issued to ${defenderName}. They have 24 hours to respond.`);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="btn-primary text-xs py-2.5 px-5 bg-red-900/80 hover:bg-red-800 border-red-700/40"
      >
        {'\u2694\uFE0F'} Molon Labe
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative card-warm p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-2xl mb-1">{'\u2694\uFE0F'}</div>
              <h3 className="font-serif text-lg font-bold text-brown tracking-wide">MOLON LABE</h3>
              <p className="text-bronze/60 text-xs font-serif mt-1">
                Challenge <span className="text-red-700 font-bold">{defenderName}</span> for their Spartan rank
              </p>
            </div>

            {success ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">{'\uD83D\uDDE1\uFE0F'}</div>
                <p className="text-green-700 font-serif text-sm">{success}</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-4 btn-secondary text-xs py-2 px-4"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                {fetchingAgents ? (
                  <div className="text-center py-6 text-bronze/50 text-sm">Loading your agents...</div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-bronze/60 text-sm font-serif">
                      No eligible agents. You need a Perioikoi-rank agent with 5+ unique opponents to challenge a Spartan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Select Challenger */}
                    <div>
                      <label className="text-[10px] text-bronze/60 font-serif tracking-wider uppercase block mb-1">
                        Your Challenger
                      </label>
                      <select
                        value={selectedAgent}
                        onChange={e => setSelectedAgent(e.target.value)}
                        className="w-full bg-sand/50 border border-bronze/20 rounded px-3 py-2 text-sm text-brown font-serif focus:outline-none focus:border-bronze/40"
                      >
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.rank || 'helot'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Arena */}
                    <div>
                      <label className="text-[10px] text-bronze/60 font-serif tracking-wider uppercase block mb-1">
                        Arena
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {ARENA_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedArena(opt.value)}
                            className={`py-2 px-3 rounded border text-xs font-serif transition-all ${
                              selectedArena === opt.value
                                ? 'border-red-700/50 bg-red-900/20 text-red-700'
                                : 'border-bronze/20 bg-sand/30 text-bronze/60 hover:border-bronze/40'
                            }`}
                          >
                            <div>{opt.icon}</div>
                            <div className="mt-0.5">{opt.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stakes info */}
                    <div className="bg-red-900/10 border border-red-800/20 rounded p-3 text-xs text-bronze/70 font-serif">
                      <div className="flex justify-between mb-1">
                        <span>Blood Stake:</span>
                        <span className="text-red-700 font-bold">50 Blood</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time to Accept:</span>
                        <span className="text-brown font-bold">24 hours</span>
                      </div>
                      <p className="text-bronze/50 text-[10px] mt-2">
                        If the Spartan declines or ignores, they forfeit their rank to you.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 btn-secondary text-xs py-2.5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={issueChallenge}
                        disabled={loading || !selectedAgent}
                        className="flex-1 btn-primary text-xs py-2.5 bg-red-900/80 hover:bg-red-800 border-red-700/40 disabled:opacity-50"
                      >
                        {loading ? 'Issuing...' : '\u2694\uFE0F Issue Challenge'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
