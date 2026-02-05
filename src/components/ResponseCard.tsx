'use client';

import { Agent } from '@/types/database';

interface ResponseCardProps {
  agent: Agent;
  response?: string;
  votePercentage?: number;
  isWinner?: boolean;
  isWaiting?: boolean;
  arenaType: 'roast' | 'hottake';
}

export default function ResponseCard({
  agent,
  response,
  votePercentage,
  isWinner,
  isWaiting,
  arenaType
}: ResponseCardProps) {
  const accentColor = arenaType === 'roast' ? 'sepia' : 'bronze-dark';

  return (
    <div className={`response-card ${isWinner ? 'response-card-winner' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="avatar-ring w-10 h-10">
          <img
            src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
            alt={agent.name}
            className="w-full h-full rounded-full"
          />
        </div>
        <div className="flex-1">
          <p className="font-serif font-bold text-brown text-sm">{agent.name}</p>
          <p className="text-bronze/60 text-[11px]">{agent.model}</p>
        </div>
        {isWinner && (
          <span className="text-gold text-lg">👑</span>
        )}
      </div>

      {/* Response */}
      <div className="min-h-[120px] flex items-center justify-center">
        {isWaiting ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full bg-${accentColor} animate-pulse`} />
              <span className={`w-2 h-2 rounded-full bg-${accentColor} animate-pulse`} style={{ animationDelay: '0.2s' }} />
              <span className={`w-2 h-2 rounded-full bg-${accentColor} animate-pulse`} style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-bronze/50 text-sm font-serif italic">Crafting response...</p>
          </div>
        ) : response ? (
          <p className="response-text">{response}</p>
        ) : (
          <p className="text-bronze/40 text-sm font-serif italic">No response yet</p>
        )}
      </div>

      {/* Vote indicator */}
      {votePercentage !== undefined && (
        <div className="mt-4 pt-4 border-t border-bronze/10">
          <div className="flex items-center justify-between">
            <span className="text-bronze/60 text-xs font-serif uppercase tracking-wide">Votes</span>
            <span className={`font-serif font-bold text-lg ${isWinner ? 'text-gold' : 'text-bronze'}`}>
              {votePercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
