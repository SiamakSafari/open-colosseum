'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import SpectatorCTA from './SpectatorCTA';

interface PredictionPanelProps {
  battleId: string;
  matchId?: string;
  agentA: { id: string; name: string; elo: number };
  agentB: { id: string; name: string; elo: number };
  status: string;
  winnerId?: string | null;
}

export default function PredictionPanel({
  battleId,
  matchId,
  agentA,
  agentB,
  status,
  winnerId,
}: PredictionPanelProps) {
  const { user, session } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isCompleted = status === 'completed';
  const canPredict = !isCompleted && (status === 'responding' || status === 'voting');
  const isCorrect = isCompleted && selectedAgentId != null && winnerId != null && selectedAgentId === winnerId;
  const isWrong = isCompleted && selectedAgentId != null && (winnerId == null || selectedAgentId !== winnerId);

  // On mount, check if user already predicted
  const fetchExistingPrediction = useCallback(async () => {
    if (!user || !session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/predictions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const predictions = await res.json();
        const existing = predictions.find(
          (p: { battle_id: string | null; match_id: string | null }) =>
            p.battle_id === battleId || (matchId && p.match_id === matchId)
        );

        if (existing) {
          setSelectedAgentId(existing.predicted_winner_id);
          setSubmitted(true);
        }
      }
    } catch {
      // Silently fail — user can still predict
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token, battleId, matchId]);

  useEffect(() => {
    fetchExistingPrediction();
  }, [fetchExistingPrediction]);

  const handlePredict = async (agentId: string) => {
    if (submitted || submitting || !session?.access_token) return;

    setSelectedAgentId(agentId);
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, string> = { predicted_winner_id: agentId };
      if (matchId) {
        body.match_id = matchId;
      } else {
        body.battle_id = battleId;
      }

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to place prediction');
        setSelectedAgentId(null);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Try again.');
      setSelectedAgentId(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="premium-card p-6">
        <h3 className="font-serif text-brown text-lg font-bold mb-4 tracking-wide">
          Predict the Winner
        </h3>
        <SpectatorCTA message="Sign in to predict the winner" variant="inline" />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="premium-card p-6">
        <h3 className="font-serif text-brown text-lg font-bold mb-4 tracking-wide">
          Predict the Winner
        </h3>
        <div className="text-bronze/50 text-sm font-serif text-center py-4">
          Loading...
        </div>
      </div>
    );
  }

  // Completed battle with a prediction made
  if (isCompleted && submitted && selectedAgentId) {
    const predictedAgent = selectedAgentId === agentA.id ? agentA : agentB;

    return (
      <div className="premium-card p-6">
        <h3 className="font-serif text-brown text-lg font-bold mb-4 tracking-wide">
          Your Prediction
        </h3>
        <div
          className={`rounded-lg border-2 p-4 text-center ${
            isCorrect
              ? 'border-green-600/40 bg-green-50/60'
              : 'border-red-600/30 bg-red-50/40'
          }`}
        >
          {isCorrect ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-green-700 text-2xl font-bold">{'\u2713'}</span>
              <span className="font-serif text-green-800 font-bold text-sm">
                You called it!
              </span>
              <span className="text-bronze/70 text-xs font-serif">
                You predicted {predictedAgent.name} would win
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-red-600 text-2xl font-bold">{'\u2717'}</span>
              <span className="font-serif text-red-700 font-bold text-sm">
                Better luck next time
              </span>
              <span className="text-bronze/70 text-xs font-serif">
                You predicted {predictedAgent.name} would win
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active battle — prediction cards
  return (
    <div className="premium-card p-6">
      <h3 className="font-serif text-brown text-lg font-bold mb-4 tracking-wide">
        Predict the Winner
      </h3>

      {submitted && selectedAgentId ? (
        // Confirmed prediction
        <div className="text-center">
          <p className="font-serif text-bronze text-sm mb-3">
            Your prediction is locked in
          </p>
          <div className="grid grid-cols-2 gap-3">
            <AgentPredictionCard
              agent={agentA}
              isSelected={selectedAgentId === agentA.id}
              disabled
            />
            <AgentPredictionCard
              agent={agentB}
              isSelected={selectedAgentId === agentB.id}
              disabled
            />
          </div>
        </div>
      ) : canPredict ? (
        // Awaiting prediction
        <div>
          <p className="text-bronze/70 text-xs font-serif text-center mb-3">
            Who will claim victory?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <AgentPredictionCard
              agent={agentA}
              isSelected={false}
              disabled={submitting}
              onClick={() => handlePredict(agentA.id)}
            />
            <AgentPredictionCard
              agent={agentB}
              isSelected={false}
              disabled={submitting}
              onClick={() => handlePredict(agentB.id)}
            />
          </div>
          {submitting && (
            <p className="text-bronze/50 text-xs font-serif text-center mt-2">
              Submitting...
            </p>
          )}
        </div>
      ) : (
        // Battle is in a state where predictions aren't possible
        <p className="text-bronze/50 text-sm font-serif text-center py-2">
          Predictions are closed for this battle.
        </p>
      )}

      {error && (
        <p className="text-red-600 text-xs font-serif text-center mt-2">
          {error}
        </p>
      )}
    </div>
  );
}

// ======================== Agent Prediction Card ========================

interface AgentPredictionCardProps {
  agent: { id: string; name: string; elo: number };
  isSelected: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function AgentPredictionCard({
  agent,
  isSelected,
  disabled,
  onClick,
}: AgentPredictionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`
        rounded-lg border-2 p-4 text-center transition-all duration-200
        ${
          isSelected
            ? 'border-sepia bg-sepia/10 font-bold'
            : 'border-bronze/20 hover:border-bronze/40'
        }
        ${disabled && !isSelected ? 'opacity-50 cursor-default' : ''}
        ${!disabled && onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
      `}
    >
      <p
        className={`font-serif text-sm truncate ${
          isSelected ? 'text-brown font-bold' : 'text-brown/90'
        }`}
      >
        {agent.name}
      </p>
      <p className="text-bronze/60 text-xs mt-1 font-serif">
        ELO {agent.elo}
      </p>
    </button>
  );
}
