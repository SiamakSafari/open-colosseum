/**
 * Spartan Rank System
 *
 * Rank tiers: Helot → Perioikoi → Spartan
 * - Helot: default starting rank
 * - Perioikoi: earned via ELO >= 1100, 5+ matches, 3+ unique opponents (different owners)
 * - Spartan: earned ONLY through Molon Labe challenge victory (or Coronation)
 *
 * Spartan slots = max(1, floor(active_agents * 0.2)), hard cap 300
 * At 5 agents: 1 Spartan slot (THE champion)
 * At 10 agents: 2 slots
 * At 50 agents: 10 slots
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { postRankPromotion } from '@/lib/feed';
import { generateRankSocialPost } from '@/lib/agentSocial';
import type { SpartanRank } from '@/types/database';

// ======================== Constants ========================

const PERIOIKOI_MIN_ELO = 1100;
const PERIOIKOI_MIN_MATCHES = 5;
const PERIOIKOI_MIN_UNIQUE_OPPONENTS = 3;
const CHALLENGE_MIN_UNIQUE_OPPONENTS = 5;
const SPARTAN_SLOT_RATIO = 0.2;
const SPARTAN_HARD_CAP = 300;
const MAX_AGENTS_PER_USER = 3;

export {
  PERIOIKOI_MIN_ELO,
  PERIOIKOI_MIN_MATCHES,
  PERIOIKOI_MIN_UNIQUE_OPPONENTS,
  CHALLENGE_MIN_UNIQUE_OPPONENTS,
  MAX_AGENTS_PER_USER,
};

// ======================== Slot Calculation ========================

/**
 * Calculate how many Spartan slots exist given total active agents.
 */
export function calculateSpartanSlots(totalActiveAgents: number): number {
  if (totalActiveAgents <= 0) return 0;
  return Math.min(
    SPARTAN_HARD_CAP,
    Math.max(1, Math.floor(totalActiveAgents * SPARTAN_SLOT_RATIO))
  );
}

/**
 * Get current Spartan count and slot count.
 */
export async function getSpartanStatus(): Promise<{
  currentSpartans: number;
  totalSlots: number;
  totalActiveAgents: number;
  openSlots: number;
}> {
  const admin = getSupabaseAdmin();

  const [{ count: activeCount }, { count: spartanCount }] = await Promise.all([
    admin.from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('agents').select('id', { count: 'exact', head: true }).eq('rank', 'spartan').eq('is_active', true),
  ]);

  const totalActiveAgents = activeCount || 0;
  const currentSpartans = spartanCount || 0;
  const totalSlots = calculateSpartanSlots(totalActiveAgents);

  return {
    currentSpartans,
    totalSlots,
    totalActiveAgents,
    openSlots: Math.max(0, totalSlots - currentSpartans),
  };
}

// ======================== Unique Opponents ========================

/**
 * Count unique opponents defeated by an agent (owned by different users).
 * Looks at both battles and matches where this agent won.
 */
export async function countUniqueOpponentsDefeated(agentId: string): Promise<number> {
  const admin = getSupabaseAdmin();

  // Get this agent's owner
  const { data: agent } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', agentId)
    .single();

  if (!agent) return 0;

  // Get opponents from won battles
  const { data: wonBattles } = await admin
    .from('battles')
    .select('agent_a_id, agent_b_id')
    .eq('winner_id', agentId)
    .eq('status', 'completed');

  // Get opponents from won chess matches
  const { data: wonMatchesWhite } = await admin
    .from('matches')
    .select('black_agent_id')
    .eq('white_agent_id', agentId)
    .eq('result', 'white_win')
    .eq('status', 'completed');

  const { data: wonMatchesBlack } = await admin
    .from('matches')
    .select('white_agent_id')
    .eq('black_agent_id', agentId)
    .eq('result', 'black_win')
    .eq('status', 'completed');

  // Collect all opponent IDs
  const opponentIds = new Set<string>();

  for (const b of wonBattles || []) {
    const opponentId = b.agent_a_id === agentId ? b.agent_b_id : b.agent_a_id;
    opponentIds.add(opponentId);
  }
  for (const m of wonMatchesWhite || []) {
    opponentIds.add(m.black_agent_id);
  }
  for (const m of wonMatchesBlack || []) {
    opponentIds.add(m.white_agent_id);
  }

  if (opponentIds.size === 0) return 0;

  // Filter out opponents owned by the same user
  const { data: opponents } = await admin
    .from('agents')
    .select('id, user_id')
    .in('id', Array.from(opponentIds));

  const uniqueOwnerOpponents = (opponents || []).filter(o => o.user_id !== agent.user_id);
  return uniqueOwnerOpponents.length;
}

/**
 * Update the stored unique_opponents_defeated count for an agent.
 */
export async function refreshUniqueOpponents(agentId: string): Promise<number> {
  const count = await countUniqueOpponentsDefeated(agentId);
  const admin = getSupabaseAdmin();
  await admin
    .from('agents')
    .update({ unique_opponents_defeated: count })
    .eq('id', agentId);
  return count;
}

// ======================== Rank Eligibility ========================

/**
 * Check if an agent is eligible for Perioikoi promotion.
 */
export async function checkPerioikoiEligibility(agentId: string): Promise<{
  eligible: boolean;
  currentRank: SpartanRank;
  bestElo: number;
  totalMatches: number;
  uniqueOpponents: number;
}> {
  const admin = getSupabaseAdmin();

  // Get agent's current rank
  const { data: agent } = await admin
    .from('agents')
    .select('rank, unique_opponents_defeated')
    .eq('id', agentId)
    .single();

  if (!agent) {
    return { eligible: false, currentRank: 'helot', bestElo: 0, totalMatches: 0, uniqueOpponents: 0 };
  }

  // Already Perioikoi or Spartan
  if (agent.rank !== 'helot') {
    return {
      eligible: false,
      currentRank: agent.rank as SpartanRank,
      bestElo: 0,
      totalMatches: 0,
      uniqueOpponents: agent.unique_opponents_defeated,
    };
  }

  // Check best ELO and total matches across all arenas
  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('elo, total_matches')
    .eq('agent_id', agentId);

  const bestElo = Math.max(0, ...(stats || []).map(s => s.elo));
  const totalMatches = (stats || []).reduce((sum, s) => sum + s.total_matches, 0);

  const eligible = bestElo >= PERIOIKOI_MIN_ELO
    && totalMatches >= PERIOIKOI_MIN_MATCHES
    && agent.unique_opponents_defeated >= PERIOIKOI_MIN_UNIQUE_OPPONENTS;

  return {
    eligible,
    currentRank: 'helot',
    bestElo,
    totalMatches,
    uniqueOpponents: agent.unique_opponents_defeated,
  };
}

/**
 * Check if an agent is eligible to issue a Molon Labe challenge.
 */
export async function checkChallengeEligibility(agentId: string): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  const admin = getSupabaseAdmin();

  const { data: agent } = await admin
    .from('agents')
    .select('rank, unique_opponents_defeated, is_active')
    .eq('id', agentId)
    .single();

  if (!agent) return { eligible: false, reason: 'Agent not found' };
  if (!agent.is_active) return { eligible: false, reason: 'Agent is eliminated' };
  if (agent.rank === 'helot') return { eligible: false, reason: 'Must be Perioikoi rank to challenge' };
  if (agent.rank === 'spartan') return { eligible: false, reason: 'Already a Spartan' };

  if (agent.unique_opponents_defeated < CHALLENGE_MIN_UNIQUE_OPPONENTS) {
    return {
      eligible: false,
      reason: `Need ${CHALLENGE_MIN_UNIQUE_OPPONENTS} unique opponents defeated (have ${agent.unique_opponents_defeated})`,
    };
  }

  // Check no pending outgoing challenge
  const { count } = await admin
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('challenger_id', agentId)
    .eq('status', 'pending');

  if ((count || 0) > 0) {
    return { eligible: false, reason: 'Already has a pending challenge' };
  }

  return { eligible: true };
}

// ======================== Rank Changes ========================

/**
 * Promote a Helot to Perioikoi if eligible.
 * Returns true if promotion happened.
 */
export async function promoteToPerioikoi(agentId: string): Promise<boolean> {
  const { eligible } = await checkPerioikoiEligibility(agentId);
  if (!eligible) return false;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('agents')
    .update({ rank: 'perioikoi', rank_updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .eq('rank', 'helot'); // Only promote if still Helot (prevent race conditions)

  if (!error) {
    // Get agent name for narrative events (fire-and-forget)
    Promise.resolve(admin.from('agents').select('name').eq('id', agentId).single()).then(({ data }) => {
      if (data?.name) {
        postRankPromotion(agentId, data.name, 'perioikoi').catch(() => {});
        generateRankSocialPost(agentId, 'promotion_perioikoi').catch(() => {});
      }
    }).catch(() => {});
  }

  return !error;
}

/**
 * Set an agent's rank directly (used by challenge resolution).
 */
export async function setAgentRank(agentId: string, rank: SpartanRank): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from('agents')
    .update({ rank, rank_updated_at: new Date().toISOString() })
    .eq('id', agentId);
}

// ======================== Coronation ========================

/**
 * Check if a Coronation battle should be triggered.
 * Conditions: 0 active Spartans, 2+ active Perioikoi, open Spartan slots.
 * Returns the two top Perioikoi agents by best ELO, or null.
 */
export async function checkCoronation(): Promise<{
  agent1Id: string;
  agent2Id: string;
  arenaType: 'roast' | 'hottake' | 'chess';
} | null> {
  const status = await getSpartanStatus();
  if (status.openSlots <= 0) return null;

  const admin = getSupabaseAdmin();

  // Guard: skip if there's already an in-progress battle/match between two Perioikoi
  // (prevents re-triggering every orchestrator tick before prior coronation settles)
  const { data: activeBattles } = await admin
    .from('battles')
    .select('id, agent_a_id, agent_b_id')
    .in('status', ['responding', 'voting'])
    .limit(50);

  const { data: activeMatches } = await admin
    .from('matches')
    .select('id, white_agent_id, black_agent_id')
    .eq('status', 'in_progress')
    .limit(50);

  // Get all active Perioikoi with their owner
  const { data: perioikoi } = await admin
    .from('agents')
    .select('id, user_id')
    .eq('rank', 'perioikoi')
    .eq('is_active', true);

  if (!perioikoi || perioikoi.length < 2) return null;

  const perioikoiIds = new Set(perioikoi.map(p => p.id));

  // Check if any active battle/match already has two Perioikoi facing each other
  for (const b of activeBattles || []) {
    if (perioikoiIds.has(b.agent_a_id) && perioikoiIds.has(b.agent_b_id)) {
      return null; // Coronation already in progress
    }
  }
  for (const m of activeMatches || []) {
    if (perioikoiIds.has(m.white_agent_id) && perioikoiIds.has(m.black_agent_id)) {
      return null; // Coronation already in progress
    }
  }

  // Get best ELO for each Perioikoi across all arenas
  const agentElos: { id: string; bestElo: number; userId: string }[] = [];

  for (const p of perioikoi) {
    const { data: stats } = await admin
      .from('agent_arena_stats')
      .select('elo')
      .eq('agent_id', p.id)
      .order('elo', { ascending: false })
      .limit(1);

    agentElos.push({
      id: p.id,
      bestElo: stats?.[0]?.elo || 1000,
      userId: p.user_id,
    });
  }

  // Sort by ELO descending
  agentElos.sort((a, b) => b.bestElo - a.bestElo);

  // Find top 2 agents owned by different users
  for (let i = 0; i < agentElos.length; i++) {
    for (let j = i + 1; j < agentElos.length; j++) {
      if (agentElos[i].userId !== agentElos[j].userId) {
        return {
          agent1Id: agentElos[i].id,
          agent2Id: agentElos[j].id,
          arenaType: 'roast' as const,
        };
      }
    }
  }

  // All qualifying Perioikoi belong to the same owner — no valid coronation
  return null;
}

// ======================== Post-Settlement Processing ========================

/**
 * Process rank checks after a battle/match settlement.
 * Called for each participating agent after ELO updates.
 * - Refreshes unique opponents count
 * - Auto-promotes Helot → Perioikoi if eligible
 */
export async function processRankChecks(agentId: string): Promise<{
  promoted: boolean;
  newRank: SpartanRank;
}> {
  // Refresh unique opponents
  await refreshUniqueOpponents(agentId);

  // Try Perioikoi promotion
  const promoted = await promoteToPerioikoi(agentId);

  const admin = getSupabaseAdmin();
  const { data: agent } = await admin
    .from('agents')
    .select('rank')
    .eq('id', agentId)
    .single();

  return {
    promoted,
    newRank: (agent?.rank as SpartanRank) || 'helot',
  };
}

/**
 * Get the ranked leaderboard with rank info.
 */
export async function getRankings(): Promise<{
  spartans: { id: string; name: string; model: string; avatar_url: string | null; bestElo: number; defenses: number; rank_updated_at: string }[];
  perioikoi: { id: string; name: string; model: string; avatar_url: string | null; bestElo: number; uniqueOpponents: number }[];
  helots: { id: string; name: string; model: string; avatar_url: string | null; bestElo: number; totalMatches: number }[];
  spartanSlots: number;
  totalActiveAgents: number;
}> {
  const admin = getSupabaseAdmin();

  const { data: agents } = await admin
    .from('agents')
    .select('id, name, model, avatar_url, rank, rank_updated_at, unique_opponents_defeated, is_active')
    .eq('is_active', true)
    .order('rank_updated_at', { ascending: true });

  if (!agents) {
    return { spartans: [], perioikoi: [], helots: [], spartanSlots: 0, totalActiveAgents: 0 };
  }

  // Get best ELO for each agent
  const agentIds = agents.map(a => a.id);
  const { data: allStats } = await admin
    .from('agent_arena_stats')
    .select('agent_id, elo, total_matches')
    .in('agent_id', agentIds);

  const statsByAgent = new Map<string, { bestElo: number; totalMatches: number }>();
  for (const s of allStats || []) {
    const existing = statsByAgent.get(s.agent_id);
    if (!existing) {
      statsByAgent.set(s.agent_id, { bestElo: s.elo, totalMatches: s.total_matches });
    } else {
      if (s.elo > existing.bestElo) existing.bestElo = s.elo;
      existing.totalMatches += s.total_matches;
    }
  }

  // Count successful defenses for Spartans (challenges where defender won)
  const spartanIds = agents.filter(a => a.rank === 'spartan').map(a => a.id);
  const defensesByAgent = new Map<string, number>();
  if (spartanIds.length > 0) {
    const { data: defenses } = await admin
      .from('challenges')
      .select('defender_id, winner_id')
      .in('defender_id', spartanIds)
      .eq('status', 'completed');

    for (const d of defenses || []) {
      // Only count as defense if the defender actually won
      if (d.winner_id === d.defender_id) {
        defensesByAgent.set(d.defender_id, (defensesByAgent.get(d.defender_id) || 0) + 1);
      }
    }
  }

  const totalActiveAgents = agents.length;
  const spartanSlots = calculateSpartanSlots(totalActiveAgents);

  const spartans = agents
    .filter(a => a.rank === 'spartan')
    .map(a => ({
      id: a.id,
      name: a.name,
      model: a.model,
      avatar_url: a.avatar_url,
      bestElo: statsByAgent.get(a.id)?.bestElo || 1000,
      defenses: defensesByAgent.get(a.id) || 0,
      rank_updated_at: a.rank_updated_at,
    }))
    .sort((a, b) => b.bestElo - a.bestElo);

  const perioikoi = agents
    .filter(a => a.rank === 'perioikoi')
    .map(a => ({
      id: a.id,
      name: a.name,
      model: a.model,
      avatar_url: a.avatar_url,
      bestElo: statsByAgent.get(a.id)?.bestElo || 1000,
      uniqueOpponents: a.unique_opponents_defeated,
    }))
    .sort((a, b) => b.bestElo - a.bestElo);

  const helots = agents
    .filter(a => a.rank === 'helot')
    .map(a => ({
      id: a.id,
      name: a.name,
      model: a.model,
      avatar_url: a.avatar_url,
      bestElo: statsByAgent.get(a.id)?.bestElo || 1000,
      totalMatches: statsByAgent.get(a.id)?.totalMatches || 0,
    }))
    .sort((a, b) => b.bestElo - a.bestElo);

  return { spartans, perioikoi, helots, spartanSlots, totalActiveAgents };
}
