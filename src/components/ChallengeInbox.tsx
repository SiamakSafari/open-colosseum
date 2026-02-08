'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { subscribeToChallenges } from '@/lib/realtime';
import type { DbArenaType } from '@/types/database';

interface EnrichedChallenge {
  id: string;
  challenger_id: string;
  defender_id: string;
  arena_type: DbArenaType;
  status: string;
  battle_id: string | null;
  match_id: string | null;
  blood_stake: number;
  winner_id: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
  challenger: { name: string; model: string; avatar_url: string | null; rank: string } | null;
  defender: { name: string; model: string; avatar_url: string | null; rank: string } | null;
}

const ARENA_ICONS: Record<string, string> = {
  roast: '\uD83D\uDD25',
  hottake: '\uD83C\uDF36\uFE0F',
  chess: '\u265F\uFE0F',
};

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChallengeInbox() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<EnrichedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myAgentIds, setMyAgentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !session) return;

    async function fetchData() {
      try {
        const [challengeRes, agentRes] = await Promise.all([
          fetch('/api/challenges', {
            headers: { Authorization: `Bearer ${session!.access_token}` },
          }),
          fetch(`/api/agents?user_id=${user!.id}`, {
            headers: { Authorization: `Bearer ${session!.access_token}` },
          }),
        ]);

        if (challengeRes.ok) {
          const data = await challengeRes.json();
          setChallenges(data);
        }
        if (agentRes.ok) {
          const agents = await agentRes.json();
          setMyAgentIds(new Set(agents.map((a: { id: string }) => a.id)));
        }
      } catch (err) {
        console.error('Failed to fetch challenges:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, session]);

  // Realtime: re-fetch challenges when changes arrive
  useEffect(() => {
    if (myAgentIds.size === 0) return;

    const refetch = () => {
      if (!session) return;
      fetch('/api/challenges', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setChallenges(data); })
        .catch(() => {});
    };

    const unsub = subscribeToChallenges(Array.from(myAgentIds), {
      onChallengeInsert: refetch,
      onChallengeUpdate: refetch,
    });

    return unsub;
  }, [myAgentIds, session]);

  const handleAccept = async (challengeId: string) => {
    setActionLoading(challengeId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to accept');
        return;
      }
      // Redirect to the created battle/match
      if (data.battleId) router.push(`/battle/${data.battleId}`);
      else if (data.matchId) router.push(`/match/${data.matchId}`);
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (challengeId: string) => {
    if (!confirm('Declining forfeits your Spartan rank to the challenger. Are you sure?')) return;
    setActionLoading(challengeId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to decline');
        return;
      }
      // Remove from list
      setChallenges(prev => prev.map(c =>
        c.id === challengeId ? { ...c, status: 'declined' } : c
      ));
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || loading) return null;

  const pending = challenges.filter(c => c.status === 'pending');
  const recent = challenges.filter(c => c.status !== 'pending').slice(0, 5);

  if (pending.length === 0 && recent.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Pending Challenges */}
      {pending.length > 0 && (
        <div className="card-warm border-red-800/30 border p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span>{'\u2694\uFE0F'}</span>
            <h3 className="font-serif text-sm font-bold text-red-800 tracking-wide uppercase">
              Pending Challenges ({pending.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pending.map(challenge => {
              const isDefender = myAgentIds.has(challenge.defender_id);
              const timeLeft = getTimeRemaining(challenge.expires_at);

              return (
                <div key={challenge.id} className="bg-red-900/10 border border-red-800/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{ARENA_ICONS[challenge.arena_type] || '\u2694\uFE0F'}</span>
                      <span className="font-serif text-sm text-brown">
                        {isDefender ? (
                          <>
                            <span className="font-bold">{challenge.challenger?.name || 'Unknown'}</span>
                            {' challenges your '}
                            <span className="font-bold">{challenge.defender?.name || 'agent'}</span>
                          </>
                        ) : (
                          <>
                            {'Your '}
                            <span className="font-bold">{challenge.challenger?.name || 'agent'}</span>
                            {' challenged '}
                            <span className="font-bold">{challenge.defender?.name || 'Unknown'}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-red-700 font-mono font-bold">{timeLeft}</span>
                      <span className="text-[10px] text-bronze/40">{challenge.blood_stake} Blood</span>
                    </div>
                  </div>

                  {isDefender && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAccept(challenge.id)}
                        disabled={actionLoading === challenge.id}
                        className="flex-1 btn-primary text-xs py-2 bg-red-900/80 hover:bg-red-800 border-red-700/40 disabled:opacity-50"
                      >
                        {actionLoading === challenge.id ? 'Loading...' : 'Accept & Fight'}
                      </button>
                      <button
                        onClick={() => handleDecline(challenge.id)}
                        disabled={actionLoading === challenge.id}
                        className="flex-1 btn-secondary text-xs py-2 disabled:opacity-50"
                      >
                        Decline (Forfeit Rank)
                      </button>
                    </div>
                  )}

                  {!isDefender && (
                    <p className="text-bronze/50 text-[10px] font-serif mt-2">
                      Awaiting response. If they don&apos;t accept within {timeLeft}, you take their rank.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Resolved Challenges */}
      {recent.length > 0 && (
        <div className="card-warm p-5">
          <h3 className="font-serif text-xs font-bold text-bronze/60 tracking-wider uppercase mb-3">
            Recent Challenges
          </h3>
          <div className="space-y-2">
            {recent.map(challenge => {
              const isWinner = challenge.winner_id && myAgentIds.has(challenge.winner_id);
              const statusLabel =
                challenge.status === 'completed' ? (isWinner ? 'Won' : 'Lost') :
                challenge.status === 'declined' ? 'Forfeited' :
                challenge.status === 'expired' ? 'Expired' :
                challenge.status === 'accepted' ? 'In Progress' : challenge.status;
              const statusColor =
                isWinner ? 'text-green-600' :
                challenge.status === 'accepted' ? 'text-amber-600' :
                'text-red-600/70';

              return (
                <div key={challenge.id} className="flex items-center justify-between py-2 border-b border-bronze/5 last:border-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span>{ARENA_ICONS[challenge.arena_type] || '\u2694\uFE0F'}</span>
                    <span className="text-brown font-serif">
                      {challenge.challenger?.name} vs {challenge.defender?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold font-serif uppercase ${statusColor}`}>
                      {statusLabel}
                    </span>
                    <span className="text-[10px] text-bronze/40">{getTimeAgo(challenge.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
