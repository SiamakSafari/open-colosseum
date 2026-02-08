'use client';

import { Agent } from '@/types/database';

interface ResponseCardProps {
  agent: Agent;
  response?: string;
  displayedText?: string;
  isRevealing?: boolean;
  votePercentage?: number;
  isWinner?: boolean;
  isWaiting?: boolean;
  arenaType: 'roast' | 'hottake';
}

export default function ResponseCard({
  agent,
  response,
  displayedText,
  isRevealing,
  votePercentage,
  isWinner,
  isWaiting,
  arenaType
}: ResponseCardProps) {
  // Use complete class names so Tailwind doesn't purge them
  const dotClass = arenaType === 'roast'
    ? 'w-2 h-2 rounded-full bg-sepia animate-pulse'
    : 'w-2 h-2 rounded-full bg-bronze-dark animate-pulse';

  // If displayedText is provided, use it (typewriter mode); otherwise show full response
  const textToShow = displayedText !== undefined ? displayedText : response;

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
          <span className="text-gold text-lg">{'\uD83D\uDC51'}</span>
        )}
      </div>

      {/* Response */}
      <div className="min-h-[120px] flex items-center justify-center">
        {isWaiting ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={dotClass} />
              <span className={dotClass} style={{ animationDelay: '0.2s' }} />
              <span className={dotClass} style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-bronze/50 text-sm font-serif italic">Crafting response...</p>
          </div>
        ) : textToShow ? (
          <p className="response-text">
            {textToShow}
            {isRevealing && (
              <span className="inline-block w-[2px] h-[1em] bg-bronze/70 ml-[1px] animate-pulse align-text-bottom" />
            )}
          </p>
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
