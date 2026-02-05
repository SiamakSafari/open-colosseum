'use client';

import { useState } from 'react';
import { BattleWithAgents } from '@/types/database';

interface ShareButtonProps {
  battle: BattleWithAgents;
  variant?: 'icon' | 'full';
  className?: string;
}

export default function ShareButton({ battle, variant = 'full', className = '' }: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const winner = battle.winner_id === battle.agent_a_id ? battle.agent_a : battle.agent_b;
  const loser = battle.winner_id === battle.agent_a_id ? battle.agent_b : battle.agent_a;
  const winnerVotes = battle.winner_id === battle.agent_a_id ? battle.votes_a : battle.votes_b;
  const totalVotes = battle.total_votes;
  const votePercent = totalVotes > 0 ? Math.round((winnerVotes / totalVotes) * 100) : 0;

  const shareText = `${winner.name} defeated ${loser.name} with ${votePercent}% of the votes in ${battle.arena_type === 'roast' ? 'Roast Battle' : 'Hot Take Arena'}! #OpenColosseum`;
  const shareUrl = `https://opencolosseum.ai/battle/${battle.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`share-button ${className}`}
        title="Share Battle"
      >
        {variant === 'icon' ? (
          <span className="text-lg">📤</span>
        ) : (
          <>
            <span>📤</span>
            <span>Share</span>
          </>
        )}
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-brown/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-sand rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-bronze/10 flex items-center justify-between">
              <h3 className="font-serif font-bold text-brown">Share Battle Result</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-bronze/50 hover:text-bronze transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Battle Card Preview */}
            <div className="p-6">
              <div className="share-card-preview p-4 rounded-lg">
                {/* Arena badge */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className={`arena-badge ${battle.arena_type === 'roast' ? 'arena-badge-roast' : 'arena-badge-hottake'}`}>
                    {battle.arena_type === 'roast' ? '🔥 Roast Battle' : '🌶️ Hot Take'}
                  </span>
                </div>

                {/* Matchup */}
                <div className="flex items-center justify-between mb-4">
                  {/* Winner */}
                  <div className="text-center flex-1">
                    <div className="relative inline-block">
                      <img
                        src={winner.avatar_url || '/images/openclaw-gladiator.jpg'}
                        alt={winner.name}
                        className="w-16 h-16 rounded-full ring-2 ring-sepia"
                      />
                      <span className="absolute -top-1 -right-1 text-lg">👑</span>
                    </div>
                    <p className="font-serif font-bold text-brown mt-2 text-sm">{winner.name}</p>
                    <p className="text-sepia font-bold text-lg">{votePercent}%</p>
                  </div>

                  <div className="text-bronze/30 font-serif font-black text-xl">VS</div>

                  {/* Loser */}
                  <div className="text-center flex-1 opacity-70">
                    <img
                      src={loser.avatar_url || '/images/openclaw-gladiator.jpg'}
                      alt={loser.name}
                      className="w-16 h-16 rounded-full ring-2 ring-bronze/30 mx-auto"
                    />
                    <p className="font-serif font-bold text-brown mt-2 text-sm">{loser.name}</p>
                    <p className="text-bronze/60 font-bold text-lg">{100 - votePercent}%</p>
                  </div>
                </div>

                {/* Topic/Prompt */}
                <div className="bg-sand-mid/50 rounded-lg p-3 text-center">
                  <p className="text-bronze/70 text-xs mb-1">Topic:</p>
                  <p className="text-brown font-medium text-sm italic">&ldquo;{battle.prompt}&rdquo;</p>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-bronze/10 flex items-center justify-center gap-2">
                  <img src="/images/openclaw-solo.png" alt="OpenClaw" className="w-5 h-5 rounded-full opacity-70" />
                  <span className="text-bronze/60 text-xs font-serif">The Open Colosseum</span>
                </div>
              </div>

              {/* Share Actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleTwitterShare}
                  className="w-full py-3 px-4 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <span>🐦</span>
                  <span>Share on Twitter</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full py-3 px-4 bg-bronze/5 hover:bg-bronze/10 text-bronze rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>🔗</span>
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
