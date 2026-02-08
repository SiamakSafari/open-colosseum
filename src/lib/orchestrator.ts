/**
 * Orchestrator — Matchmaking + Scheduled Tasks
 *
 * Runs on a cron tick (every 5 minutes via Vercel Cron or manual trigger).
 * Tasks:
 * 1. Process matchmaking queue — find compatible opponents, create matches
 * 2. Settle expired voting periods — auto-settle battles past deadline
 * 3. Expire stale queue entries — clean up entries older than 1 hour
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { settleBattle } from '@/lib/matchEngine';
import type { DbMatchmakingQueue, DbAgentArenaStats } from '@/types/database';

// ======================== Hot Take Topics ========================

const HOT_TAKE_TOPICS = [
  'Pineapple on pizza is peak cuisine',
  'AI will replace all human jobs within 10 years',
  'Social media has made society smarter, not dumber',
  'Remote work is better than office work in every way',
  'Cats are objectively superior to dogs',
  'The moon landing was humanity\'s greatest achievement',
  'Coffee is overrated',
  'Video games are the highest form of art',
  'Breakfast is the least important meal of the day',
  'Aliens have definitely visited Earth',
  'The multiverse theory is more likely than not',
  'Phones should go back to having physical keyboards',
  'The metric system should be the only system globally',
  'AI-generated art is real art',
  'College degrees are becoming obsolete',
];

function pickRandomHotTakeTopic(): string {
  return HOT_TAKE_TOPICS[Math.floor(Math.random() * HOT_TAKE_TOPICS.length)];
}

// ======================== Types ========================

interface QueueEntryWithStats extends DbMatchmakingQueue {
  agentElo: number;
  agentStreak: number;
  agentName: string;
}

interface MatchResult {
  queueEntryA: string;
  queueEntryB: string;
  agentAId: string;
  agentBId: string;
  battleId?: string;
  matchId?: string;
}

export interface OrchestratorResult {
  matchesCreated: MatchResult[];
  battlesSettled: string[];
  queueExpired: number;
  errors: string[];
}

// ======================== Main Tick ========================

export async function orchestratorTick(): Promise<OrchestratorResult> {
  const result: OrchestratorResult = {
    matchesCreated: [],
    battlesSettled: [],
    queueExpired: 0,
    errors: [],
  };

  // 1. Process matchmaking queue
  try {
    const matches = await processMatchmakingQueue();
    result.matchesCreated = matches;
  } catch (err) {
    result.errors.push(`Matchmaking: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Settle expired voting periods
  try {
    const settled = await settleExpiredVotingPeriods();
    result.battlesSettled = settled;
  } catch (err) {
    result.errors.push(`Settlement: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Expire stale queue entries
  try {
    const expired = await expireStaleQueueEntries();
    result.queueExpired = expired;
  } catch (err) {
    result.errors.push(`Queue cleanup: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

// ======================== 1. Matchmaking ========================

async function processMatchmakingQueue(): Promise<MatchResult[]> {
  const admin = getSupabaseAdmin();

  // Fetch all waiting queue entries
  const { data: queue } = await admin
    .from('matchmaking_queue')
    .select('*')
    .eq('status', 'waiting')
    .order('queued_at', { ascending: true });

  if (!queue || queue.length < 2) return [];

  const entries = queue as DbMatchmakingQueue[];

  // Fetch stats for all agents in queue
  const agentIds = [...new Set(entries.map(e => e.agent_id))];
  const { data: allStats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .in('agent_id', agentIds);

  const { data: agentNames } = await admin
    .from('agents')
    .select('id, name')
    .in('id', agentIds);

  const statsMap = new Map<string, DbAgentArenaStats[]>();
  (allStats || []).forEach(s => {
    const existing = statsMap.get(s.agent_id) || [];
    existing.push(s as DbAgentArenaStats);
    statsMap.set(s.agent_id, existing);
  });

  const nameMap = new Map<string, string>();
  (agentNames || []).forEach(a => nameMap.set(a.id, a.name));

  // Fetch recent battles for anti-repeat detection
  const { data: recentBattles } = await admin
    .from('battles')
    .select('agent_a_id, agent_b_id')
    .in('agent_a_id', agentIds)
    .order('created_at', { ascending: false })
    .limit(50);

  const recentPairs = new Set<string>();
  (recentBattles || []).forEach(b => {
    recentPairs.add(`${b.agent_a_id}-${b.agent_b_id}`);
    recentPairs.add(`${b.agent_b_id}-${b.agent_a_id}`);
  });

  // Enrich queue entries with stats
  const enriched: QueueEntryWithStats[] = entries.map(e => {
    const arenaStats = statsMap.get(e.agent_id)?.find(s => s.arena_type === e.arena_type);
    return {
      ...e,
      agentElo: arenaStats?.elo || 1200,
      agentStreak: arenaStats?.streak || 0,
      agentName: nameMap.get(e.agent_id) || 'Unknown',
    };
  });

  // Group by arena type
  const byArena = new Map<string, QueueEntryWithStats[]>();
  enriched.forEach(e => {
    const key = e.arena_type;
    const group = byArena.get(key) || [];
    group.push(e);
    byArena.set(key, group);
  });

  const results: MatchResult[] = [];
  const matched = new Set<string>(); // track matched entry IDs

  for (const [, pool] of byArena) {
    // Try to match entries within each arena
    for (const entry of pool) {
      if (matched.has(entry.id)) continue;

      // Check challenge mode first
      if (entry.challenge_agent_id) {
        const target = pool.find(
          e => e.agent_id === entry.challenge_agent_id && !matched.has(e.id)
        );
        if (target) {
          const matchResult = await createMatchFromQueue(entry, target);
          if (matchResult) {
            results.push(matchResult);
            matched.add(entry.id);
            matched.add(target.id);
          }
          continue;
        }
      }

      // Score all candidates
      const candidates = pool
        .filter(e => e.id !== entry.id && !matched.has(e.id))
        .map(candidate => ({
          candidate,
          score: calculateMatchScore(entry, candidate, recentPairs),
        }))
        .filter(c => c.score > 0) // Only positive scores
        .sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        const best = candidates[0].candidate;
        const matchResult = await createMatchFromQueue(entry, best);
        if (matchResult) {
          results.push(matchResult);
          matched.add(entry.id);
          matched.add(best.id);
        }
      }
    }
  }

  return results;
}

function calculateMatchScore(
  a: QueueEntryWithStats,
  b: QueueEntryWithStats,
  recentPairs: Set<string>
): number {
  let score = 0;

  // ELO proximity (closer = better, max 100 points)
  const eloDiff = Math.abs(a.agentElo - b.agentElo);
  score += Math.max(0, 100 - eloDiff / 5);

  // Anti-repeat penalty (-30 if they fought recently)
  if (recentPairs.has(`${a.agent_id}-${b.agent_id}`)) {
    score -= 30;
  }

  // Streak bonus (+20 if either is on a 5+ streak — narrative value)
  if (Math.abs(a.agentStreak) >= 5 || Math.abs(b.agentStreak) >= 5) {
    score += 20;
  }

  // Wait time bonus (longer wait = more eager to match, +10 per 5 min, max 50)
  const waitMinutesA = (Date.now() - new Date(a.queued_at).getTime()) / 60000;
  const waitMinutesB = (Date.now() - new Date(b.queued_at).getTime()) / 60000;
  const avgWait = (waitMinutesA + waitMinutesB) / 2;
  score += Math.min(50, Math.floor(avgWait / 5) * 10);

  // Priority boost (from queue priority)
  score += (a.priority + b.priority) * 10;

  return score;
}

async function createMatchFromQueue(
  entryA: QueueEntryWithStats,
  entryB: QueueEntryWithStats
): Promise<MatchResult | null> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    if (entryA.arena_type === 'chess') {
      // Import dynamically to avoid circular deps
      const { startChessMatch } = await import('@/lib/chessEngine');
      const match = await startChessMatch(entryA.agent_id, entryB.agent_id);

      // Update queue entries
      await admin
        .from('matchmaking_queue')
        .update({ status: 'matched', matched_at: now, match_id: match.id })
        .in('id', [entryA.id, entryB.id]);

      return {
        queueEntryA: entryA.id,
        queueEntryB: entryB.id,
        agentAId: entryA.agent_id,
        agentBId: entryB.agent_id,
        matchId: match.id,
      };
    } else {
      // Battle arenas (roast, hottake) — import the match starter
      const { startRoastBattle, startHotTakeBattle } = await import('@/lib/matchEngine');
      let battle;

      if (entryA.arena_type === 'roast') {
        battle = await startRoastBattle(entryA.agent_id, entryB.agent_id);
      } else if (entryA.arena_type === 'hottake') {
        const topic = pickRandomHotTakeTopic();
        battle = await startHotTakeBattle(entryA.agent_id, entryB.agent_id, topic);
      } else {
        // Debate requires 3 agents — skip for now in matchmaking
        return null;
      }

      // Update queue entries
      await admin
        .from('matchmaking_queue')
        .update({ status: 'matched', matched_at: now, battle_id: battle.id })
        .in('id', [entryA.id, entryB.id]);

      return {
        queueEntryA: entryA.id,
        queueEntryB: entryB.id,
        agentAId: entryA.agent_id,
        agentBId: entryB.agent_id,
        battleId: battle.id,
      };
    }
  } catch (err) {
    console.error('Failed to create match from queue:', err);
    return null;
  }
}

// ======================== 2. Auto-Settle Expired Voting ========================

async function settleExpiredVotingPeriods(): Promise<string[]> {
  const admin = getSupabaseAdmin();

  // Find battles in 'voting' state past their deadline
  const { data: expiredBattles } = await admin
    .from('battles')
    .select('id, voting_deadline')
    .eq('status', 'voting')
    .lt('voting_deadline', new Date().toISOString())
    .limit(10); // Process max 10 per tick to avoid timeouts

  if (!expiredBattles || expiredBattles.length === 0) return [];

  const settled: string[] = [];

  for (const battle of expiredBattles) {
    try {
      await settleBattle(battle.id);
      settled.push(battle.id);
    } catch (err) {
      console.error(`Failed to settle battle ${battle.id}:`, err);
    }
  }

  return settled;
}

// ======================== 3. Queue Maintenance ========================

async function expireStaleQueueEntries(): Promise<number> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from('matchmaking_queue')
    .update({ status: 'expired' })
    .eq('status', 'waiting')
    .lt('expires_at', now)
    .select('id');

  if (error) {
    console.error('Queue expiry failed:', error);
    return 0;
  }

  return data?.length || 0;
}

// ======================== Instant Matchmaking ========================

/**
 * Try to instantly match an agent from the queue.
 * Called when a new agent joins the queue — checks if a compatible opponent is already waiting.
 * Returns the match/battle result if instant match found, null otherwise.
 */
export async function tryInstantMatch(
  queueEntryId: string,
  agentId: string,
  arenaType: string,
  challengeAgentId?: string
): Promise<{ battleId?: string; matchId?: string } | null> {
  const admin = getSupabaseAdmin();

  // Find waiting entries in the same arena
  let query = admin
    .from('matchmaking_queue')
    .select('*')
    .eq('status', 'waiting')
    .eq('arena_type', arenaType)
    .neq('id', queueEntryId)
    .neq('agent_id', agentId)
    .order('queued_at', { ascending: true });

  if (challengeAgentId) {
    query = query.eq('agent_id', challengeAgentId);
  }

  const { data: waiting } = await query.limit(10);
  if (!waiting || waiting.length === 0) return null;

  // Get stats for scoring
  const allAgentIds = [agentId, ...waiting.map(w => w.agent_id)];
  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .in('agent_id', allAgentIds)
    .eq('arena_type', arenaType);

  const { data: names } = await admin
    .from('agents')
    .select('id, name')
    .in('id', allAgentIds);

  const statsMap = new Map<string, DbAgentArenaStats>();
  (stats || []).forEach(s => statsMap.set(s.agent_id, s as DbAgentArenaStats));

  const nameMap = new Map<string, string>();
  (names || []).forEach(n => nameMap.set(n.id, n.name));

  const myStats = statsMap.get(agentId);
  const myEntry: QueueEntryWithStats = {
    id: queueEntryId,
    agent_id: agentId,
    arena_type: arenaType as DbMatchmakingQueue['arena_type'],
    priority: 0,
    challenge_agent_id: challengeAgentId || null,
    queued_at: new Date().toISOString(),
    matched_at: null,
    battle_id: null,
    match_id: null,
    status: 'waiting',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    agentElo: myStats?.elo || 1200,
    agentStreak: myStats?.streak || 0,
    agentName: nameMap.get(agentId) || 'Unknown',
  };

  // If challenge mode and target found, match immediately
  if (challengeAgentId) {
    const target = waiting.find(w => w.agent_id === challengeAgentId);
    if (target) {
      const tStats = statsMap.get(target.agent_id);
      const targetEntry: QueueEntryWithStats = {
        ...(target as DbMatchmakingQueue),
        agentElo: tStats?.elo || 1200,
        agentStreak: tStats?.streak || 0,
        agentName: nameMap.get(target.agent_id) || 'Unknown',
      };
      const result = await createMatchFromQueue(myEntry, targetEntry);
      if (result) {
        return { battleId: result.battleId, matchId: result.matchId };
      }
    }
    return null;
  }

  // Score candidates
  const candidates = waiting.map(w => {
    const wStats = statsMap.get(w.agent_id);
    const enriched: QueueEntryWithStats = {
      ...(w as DbMatchmakingQueue),
      agentElo: wStats?.elo || 1200,
      agentStreak: wStats?.streak || 0,
      agentName: nameMap.get(w.agent_id) || 'Unknown',
    };
    return {
      entry: enriched,
      score: calculateMatchScore(myEntry, enriched, new Set()),
    };
  }).filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;

  const best = candidates[0].entry;
  const result = await createMatchFromQueue(myEntry, best);
  if (result) {
    return { battleId: result.battleId, matchId: result.matchId };
  }

  return null;
}
