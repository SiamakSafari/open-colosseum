/**
 * Activity Feed
 *
 * Posts events to the activity_feed table for the global feed.
 * Each event has a type, actor, target, headline, and optional metadata.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import type { ActivityEventType } from '@/types/database';

// ======================== Core ========================

export async function postActivity(
  eventType: ActivityEventType,
  actorType: 'agent' | 'user' | 'system',
  actorId: string | null,
  targetType: 'battle' | 'match' | 'agent' | null,
  targetId: string | null,
  headline: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('activity_feed').insert({
    event_type: eventType,
    actor_type: actorType,
    actor_id: actorId,
    target_type: targetType,
    target_id: targetId,
    headline,
    metadata,
  });
}

// ======================== Convenience Helpers ========================

export async function postBattleCreated(
  battleId: string,
  agentAName: string,
  agentBName: string,
  arenaType: string,
  agentCName?: string
): Promise<void> {
  const arenaLabel = arenaType === 'hottake' ? 'hot take' : arenaType;
  const headline = agentCName
    ? `${agentAName}, ${agentBName}, and ${agentCName} enter a ${arenaLabel} debate!`
    : `${agentAName} challenges ${agentBName} to a ${arenaLabel} battle!`;

  await postActivity('battle_complete', 'system', null, 'battle', battleId, headline, {
    event_subtype: 'created',
    arena_type: arenaType,
    agents: agentCName ? [agentAName, agentBName, agentCName] : [agentAName, agentBName],
  });
}

export async function postBattleComplete(
  battleId: string,
  winnerName: string | null,
  loserName: string | null,
  arenaType: string,
  eloChange?: { winner: number; loser: number }
): Promise<void> {
  const arenaLabel = arenaType === 'hottake' ? 'hot take' : arenaType;
  let headline: string;

  if (winnerName && loserName && eloChange) {
    headline = `${winnerName} defeats ${loserName} in ${arenaLabel}! ELO: ${eloChange.winner > 0 ? '+' : ''}${eloChange.winner}`;
  } else if (winnerName && loserName) {
    headline = `${winnerName} defeats ${loserName} in ${arenaLabel}!`;
  } else {
    headline = `Draw in ${arenaLabel} battle!`;
  }

  await postActivity('battle_complete', 'system', null, 'battle', battleId, headline, {
    arena_type: arenaType,
    winner: winnerName,
    loser: loserName,
    elo_change: eloChange,
  });
}

export async function postMatchComplete(
  matchId: string,
  winnerName: string | null,
  loserName: string | null,
  resultMethod: string,
  totalMoves: number,
  eloChange?: { winner: number; loser: number }
): Promise<void> {
  let headline: string;

  if (winnerName && loserName) {
    if (resultMethod === 'checkmate') {
      headline = `${winnerName} checkmates ${loserName} in ${totalMoves} moves!`;
    } else if (resultMethod === 'forfeit') {
      headline = `${winnerName} wins by forfeit against ${loserName}!`;
    } else {
      headline = `${winnerName} defeats ${loserName} in chess!`;
    }
  } else {
    headline = `Chess match ends in a draw (${resultMethod})!`;
  }

  await postActivity('match_complete', 'system', null, 'match', matchId, headline, {
    result_method: resultMethod,
    total_moves: totalMoves,
    winner: winnerName,
    loser: loserName,
    elo_change: eloChange,
  });
}

export async function postAgentCreated(
  agentId: string,
  agentName: string,
  model: string,
  userId: string
): Promise<void> {
  await postActivity(
    'agent_created',
    'user',
    userId,
    'agent',
    agentId,
    `A new gladiator enters the arena: ${agentName}`,
    { model }
  );
}

export async function postAgentEliminated(
  agentId: string,
  agentName: string,
  finalRecord: { wins: number; losses: number; draws: number },
  peakElo: number
): Promise<void> {
  const headline = `${agentName} has fallen. Final record: ${finalRecord.wins}W-${finalRecord.losses}L, Peak ELO: ${peakElo}`;

  await postActivity('agent_eliminated', 'system', null, 'agent', agentId, headline, {
    final_record: finalRecord,
    peak_elo: peakElo,
  });
}

export async function postUpset(
  battleId: string,
  winnerName: string,
  loserName: string,
  winnerElo: number,
  loserElo: number
): Promise<void> {
  const eloDiff = loserElo - winnerElo;
  await postActivity(
    'upset',
    'system',
    null,
    'battle',
    battleId,
    `UPSET! ${winnerName} (${winnerElo} ELO) takes down ${loserName} (${loserElo} ELO)!`,
    { elo_difference: eloDiff, winner_elo: winnerElo, loser_elo: loserElo }
  );
}
