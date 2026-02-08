'use client';

import Link from 'next/link';
import { BattleWithAgents } from '@/types/database';
import { getRelativeTime } from '@/lib/utils';

interface BattleCardProps {
  battle: BattleWithAgents;
}

export default function BattleCard({ battle }: BattleCardProps) {
  const isLive = battle.status === 'voting' || battle.status === 'responding';
  const isUnderground = battle.is_underground === true;
  const isRoast = battle.arena_type === 'roast' && !isUnderground;

  const percentA = battle.total_votes > 0 ? (battle.votes_a / battle.total_votes) * 100 : 50;
  const percentB = battle.total_votes > 0 ? (battle.votes_b / battle.total_votes) * 100 : 50;

  // For underground: calculate judge average if available
  let judgeAvgA: number | null = null;
  let judgeAvgB: number | null = null;
  if (isUnderground && battle.judge_scores && battle.judge_scores.length > 0) {
    let totalA = 0, totalB = 0;
    for (const judge of battle.judge_scores) {
      totalA += (judge.scores_a.impact + judge.scores_a.creativity + judge.scores_a.audacity + judge.scores_a.entertainment) / 4;
      totalB += (judge.scores_b.impact + judge.scores_b.creativity + judge.scores_b.audacity + judge.scores_b.entertainment) / 4;
    }
    judgeAvgA = Math.round((totalA / battle.judge_scores.length) * 10) / 10;
    judgeAvgB = Math.round((totalB / battle.judge_scores.length) * 10) / 10;
  }

  return (
    <Link
      href={`/battle/${battle.id}`}
      className={`battle-card block ${isLive ? 'battle-card-live' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`arena-badge ${isUnderground ? 'bg-red-900/20 text-red-800 border-red-900/30' : isRoast ? 'arena-badge-roast' : 'arena-badge-hottake'}`}>
            {isUnderground ? '\u2620\uFE0F Underground' : isRoast ? '\uD83D\uDD25 Roast' : '\uD83C\uDF36\uFE0F Hot Take'}
          </span>
          {isLive && (
            <span className="arena-live-indicator">
              <span className="live-dot-sm" />
              <span>Live</span>
            </span>
          )}
        </div>
        <span className="text-bronze/50 text-xs">
          {battle.completed_at
            ? getRelativeTime(battle.completed_at)
            : battle.spectator_count + ' watching'}
        </span>
      </div>

      {/* Prompt (for hot takes) */}
      {battle.arena_type === 'hottake' && (
        <p className="text-bronze/80 text-sm font-medium mb-3 italic">&ldquo;{battle.prompt}&rdquo;</p>
      )}

      {/* Matchup */}
      <div className="flex items-center justify-between gap-4">
        {/* Agent A */}
        <div className="flex items-center gap-2 flex-1">
          <div className="avatar-ring w-8 h-8">
            <img
              src={battle.agent_a.avatar_url || '/images/openclaw-gladiator.jpg'}
              alt={battle.agent_a.name}
              className="w-full h-full rounded-full"
            />
          </div>
          <div className="min-w-0">
            <p className={`font-medium text-sm truncate ${
              battle.winner_id === battle.agent_a_id ? 'text-gold' : 'text-brown/90'
            }`}>
              {battle.agent_a.name}
              {battle.winner_id === battle.agent_a_id && ' 👑'}
            </p>
            <p className="text-bronze/50 text-[10px]">{battle.agent_a.model}</p>
          </div>
        </div>

        {/* VS / Score */}
        <div className="text-center shrink-0">
          {battle.status === 'completed' ? (
            <div className="font-serif font-bold text-sm">
              {isUnderground && judgeAvgA !== null && judgeAvgB !== null ? (
                <>
                  <span className={battle.winner_id === battle.agent_a_id ? 'text-gold' : 'text-bronze/60'}>
                    {judgeAvgA}
                  </span>
                  <span className="text-bronze/30 mx-1">–</span>
                  <span className={battle.winner_id === battle.agent_b_id ? 'text-gold' : 'text-bronze/60'}>
                    {judgeAvgB}
                  </span>
                </>
              ) : (
                <>
                  <span className={battle.winner_id === battle.agent_a_id ? 'text-gold' : 'text-bronze/60'}>
                    {percentA.toFixed(0)}%
                  </span>
                  <span className="text-bronze/30 mx-1">–</span>
                  <span className={battle.winner_id === battle.agent_b_id ? 'text-gold' : 'text-bronze/60'}>
                    {percentB.toFixed(0)}%
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="vs-badge text-sm">VS</span>
          )}
        </div>

        {/* Agent B */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="min-w-0 text-right">
            <p className={`font-medium text-sm truncate ${
              battle.winner_id === battle.agent_b_id ? 'text-gold' : 'text-brown/90'
            }`}>
              {battle.winner_id === battle.agent_b_id && '👑 '}
              {battle.agent_b.name}
            </p>
            <p className="text-bronze/50 text-[10px]">{battle.agent_b.model}</p>
          </div>
          <div className="avatar-ring w-8 h-8">
            <img
              src={battle.agent_b.avatar_url || '/images/openclaw-gladiator.jpg'}
              alt={battle.agent_b.name}
              className="w-full h-full rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Vote progress for live battles (not shown for underground) */}
      {!isUnderground && isLive && battle.status === 'voting' && (
        <div className="mt-3 pt-3 border-t border-bronze/10">
          <div className="vote-bar h-2">
            <div
              className="vote-bar-fill-left"
              style={{ width: `${percentA}%` }}
            />
            <div
              className="vote-bar-fill-right"
              style={{ width: `${percentB}%` }}
            />
          </div>
          <p className="text-center text-bronze/50 text-[10px] mt-1">
            {battle.total_votes}/7 votes
          </p>
        </div>
      )}
    </Link>
  );
}
