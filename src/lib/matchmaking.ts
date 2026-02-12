/**
 * ELO-based Matchmaking System
 *
 * Creates more competitive battles by matching agents with similar skill levels.
 * Avoids recent rematches and balances queue wait times vs match quality.
 *
 * Usage:
 *   const match = await findOptimalMatch('roast', agentId);
 *   if (match) startRoastBattle(match.agentA, match.agentB);
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import type { ArenaType } from '@/types/database';

interface AgentStats {
  agent_id: string;
  elo: number;
  total_matches: number;
  last_battle_at?: string;
  is_active: boolean;
  name: string;
}

interface MatchSuggestion {
  agentA: string;
  agentB: string;
  agentC?: string;
  eloSpread: number;
  quality: 'perfect' | 'good' | 'fair' | 'desperate';
  reason: string;
}

interface RecentOpponent {
  agent_id: string;
  last_battle: string;
}

// Constants for matchmaking algorithm
const PERFECT_ELO_RANGE = 50;     // ±50 ELO = perfect match
const GOOD_ELO_RANGE = 100;       // ±100 ELO = good match  
const FAIR_ELO_RANGE = 200;       // ±200 ELO = fair match
const REMATCH_COOLDOWN_HOURS = 24; // Avoid rematches for 24 hours
const MIN_MATCHES_FOR_RANKING = 3; // Need 3+ matches for stable ELO

/**
 * Find the optimal opponent(s) for an agent in a specific arena.
 * Returns null if no suitable opponents found.
 */
export async function findOptimalMatch(
  arenaType: ArenaType, 
  targetAgentId: string
): Promise<MatchSuggestion | null> {
  const admin = getSupabaseAdmin();

  // Get target agent's stats
  const { data: targetStats, error: targetError } = await admin
    .from('agent_arena_stats')
    .select('agent_id, elo, total_matches')
    .eq('agent_id', targetAgentId)
    .eq('arena_type', arenaType)
    .single();

  if (targetError || !targetStats) {
    throw new Error(`Target agent ${targetAgentId} not found in ${arenaType} arena`);
  }

  const targetElo = targetStats.elo;
  const targetMatches = targetStats.total_matches;

  // For debate, we need 3 agents total
  if (arenaType === 'debate') {
    return await findDebateMatch(targetAgentId, targetElo, targetMatches);
  }

  // For roast/hottake, find best 1v1 opponent
  return await findDuelMatch(arenaType, targetAgentId, targetElo, targetMatches);
}

/**
 * Find optimal 1v1 match for roast/hottake battles.
 */
async function findDuelMatch(
  arenaType: ArenaType,
  targetAgentId: string, 
  targetElo: number,
  targetMatches: number
): Promise<MatchSuggestion | null> {
  const admin = getSupabaseAdmin();

  // Get recent opponents to avoid immediate rematches
  const recentOpponents = await getRecentOpponents(targetAgentId, arenaType);
  const recentIds = recentOpponents.map(op => op.agent_id);

  // Get all active agents in this arena (excluding target and recent opponents)
  let query = admin
    .from('agent_arena_stats')
    .select(`
      agent_id,
      elo,
      total_matches,
      agents!inner(
        name,
        is_active,
        updated_at
      )
    `)
    .eq('arena_type', arenaType)
    .eq('agents.is_active', true)
    .neq('agent_id', targetAgentId);

  if (recentIds.length > 0) {
    query = query.not('agent_id', 'in', `(${recentIds.join(',')})`);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  // Convert to flat structure and filter out inactive
  const eligibleAgents: AgentStats[] = candidates
    .filter(c => c.agents?.is_active)
    .map(c => ({
      agent_id: c.agent_id,
      elo: c.elo,
      total_matches: c.total_matches,
      is_active: true,
      name: c.agents?.name || 'Unknown',
    }));

  if (eligibleAgents.length === 0) {
    return null;
  }

  // Score each potential opponent
  const scoredOpponents = eligibleAgents.map(opponent => {
    const eloSpread = Math.abs(targetElo - opponent.elo);
    const opponentMatches = opponent.total_matches;

    // Base score from ELO similarity (lower spread = higher score)
    let score = 1000 - eloSpread;

    // Boost score for opponents with similar experience level
    const experienceDiff = Math.abs(targetMatches - opponentMatches);
    if (experienceDiff <= 5) score += 100;
    else if (experienceDiff <= 15) score += 50;

    // Slightly boost newer agents to give them opportunities
    if (opponentMatches < MIN_MATCHES_FOR_RANKING) score += 25;

    return {
      ...opponent,
      eloSpread,
      score,
    };
  });

  // Sort by score (best matches first)
  scoredOpponents.sort((a, b) => b.score - a.score);
  const bestMatch = scoredOpponents[0];

  // Determine match quality
  let quality: MatchSuggestion['quality'];
  let reason: string;

  if (bestMatch.eloSpread <= PERFECT_ELO_RANGE) {
    quality = 'perfect';
    reason = `Perfectly matched ELO (±${bestMatch.eloSpread})`;
  } else if (bestMatch.eloSpread <= GOOD_ELO_RANGE) {
    quality = 'good';
    reason = `Well-matched opponents (±${bestMatch.eloSpread} ELO)`;
  } else if (bestMatch.eloSpread <= FAIR_ELO_RANGE) {
    quality = 'fair';
    reason = `Acceptable skill gap (±${bestMatch.eloSpread} ELO)`;
  } else {
    quality = 'desperate';
    reason = `Large skill gap (±${bestMatch.eloSpread} ELO) - best available`;
  }

  return {
    agentA: targetAgentId,
    agentB: bestMatch.agent_id,
    eloSpread: bestMatch.eloSpread,
    quality,
    reason,
  };
}

/**
 * Find optimal 3-agent match for debate battles.
 * Balances ELO spread across all three participants.
 */
async function findDebateMatch(
  targetAgentId: string,
  targetElo: number,
  targetMatches: number
): Promise<MatchSuggestion | null> {
  const admin = getSupabaseAdmin();

  // Get recent opponents to avoid immediate rematches
  const recentOpponents = await getRecentOpponents(targetAgentId, 'debate');
  const recentIds = recentOpponents.map(op => op.agent_id);

  // Get all active agents in debate arena
  let query = admin
    .from('agent_arena_stats')
    .select(`
      agent_id,
      elo,
      total_matches,
      agents!inner(
        name,
        is_active
      )
    `)
    .eq('arena_type', 'debate')
    .eq('agents.is_active', true)
    .neq('agent_id', targetAgentId);

  if (recentIds.length > 0) {
    query = query.not('agent_id', 'in', `(${recentIds.join(',')})`);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates || candidates.length < 2) {
    return null; // Need at least 2 other agents for a 3-way debate
  }

  const eligibleAgents: AgentStats[] = candidates
    .filter(c => c.agents?.is_active)
    .map(c => ({
      agent_id: c.agent_id,
      elo: c.elo,
      total_matches: c.total_matches,
      is_active: true,
      name: c.agents?.name || 'Unknown',
    }));

  if (eligibleAgents.length < 2) {
    return null;
  }

  // Find best combination of 2 opponents
  let bestCombination: {
    agentB: AgentStats;
    agentC: AgentStats;
    totalSpread: number;
    score: number;
  } | null = null;

  for (let i = 0; i < eligibleAgents.length - 1; i++) {
    for (let j = i + 1; j < eligibleAgents.length; j++) {
      const agentB = eligibleAgents[i];
      const agentC = eligibleAgents[j];

      // Calculate ELO spread among all three participants
      const elos = [targetElo, agentB.elo, agentC.elo];
      const minElo = Math.min(...elos);
      const maxElo = Math.max(...elos);
      const totalSpread = maxElo - minElo;

      // Score this combination (lower spread = higher score)
      let score = 2000 - totalSpread;

      // Bonus for similar experience levels
      const avgMatches = (targetMatches + agentB.total_matches + agentC.total_matches) / 3;
      const experienceVariance = [targetMatches, agentB.total_matches, agentC.total_matches]
        .map(m => Math.abs(m - avgMatches))
        .reduce((sum, diff) => sum + diff, 0);
      
      if (experienceVariance <= 15) score += 100;
      else if (experienceVariance <= 30) score += 50;

      if (!bestCombination || score > bestCombination.score) {
        bestCombination = {
          agentB,
          agentC,
          totalSpread,
          score,
        };
      }
    }
  }

  if (!bestCombination) {
    return null;
  }

  // Determine match quality for 3-way
  let quality: MatchSuggestion['quality'];
  let reason: string;

  const spread = bestCombination.totalSpread;
  if (spread <= PERFECT_ELO_RANGE * 1.5) {
    quality = 'perfect';
    reason = `Tightly grouped ELO range (${spread} spread)`;
  } else if (spread <= GOOD_ELO_RANGE * 1.5) {
    quality = 'good';
    reason = `Well-balanced debate (${spread} ELO spread)`;
  } else if (spread <= FAIR_ELO_RANGE * 1.5) {
    quality = 'fair';
    reason = `Mixed skill levels (${spread} ELO spread)`;
  } else {
    quality = 'desperate';
    reason = `Wide skill range (${spread} spread) - best available`;
  }

  return {
    agentA: targetAgentId,
    agentB: bestCombination.agentB.agent_id,
    agentC: bestCombination.agentC.agent_id,
    eloSpread: spread,
    quality,
    reason,
  };
}

/**
 * Get agents that this agent has recently battled against.
 */
async function getRecentOpponents(
  agentId: string, 
  arenaType: ArenaType
): Promise<RecentOpponent[]> {
  const admin = getSupabaseAdmin();
  const cutoffTime = new Date(Date.now() - REMATCH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

  const { data: recentBattles, error } = await admin
    .from('battles')
    .select('agent_a_id, agent_b_id, agent_c_id, created_at')
    .eq('arena_type', arenaType)
    .gte('created_at', cutoffTime)
    .or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId},agent_c_id.eq.${agentId}`);

  if (error || !recentBattles) {
    return [];
  }

  // Extract opponent IDs
  const opponentMap = new Map<string, string>();

  for (const battle of recentBattles) {
    const opponents = [battle.agent_a_id, battle.agent_b_id, battle.agent_c_id]
      .filter(id => id && id !== agentId);
    
    for (const opponentId of opponents) {
      if (!opponentMap.has(opponentId) || battle.created_at > opponentMap.get(opponentId)!) {
        opponentMap.set(opponentId, battle.created_at);
      }
    }
  }

  return Array.from(opponentMap.entries()).map(([agent_id, last_battle]) => ({
    agent_id,
    last_battle,
  }));
}

/**
 * Find any available match for an agent (fallback when optimal matching fails).
 * More permissive than optimal matching.
 */
export async function findAnyMatch(
  arenaType: ArenaType,
  targetAgentId: string
): Promise<MatchSuggestion | null> {
  const admin = getSupabaseAdmin();

  // Get all active agents in this arena (excluding target)
  const { data: candidates, error } = await admin
    .from('agent_arena_stats')
    .select(`
      agent_id,
      elo,
      agents!inner(
        name,
        is_active
      )
    `)
    .eq('arena_type', arenaType)
    .eq('agents.is_active', true)
    .neq('agent_id', targetAgentId);

  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  const eligibleAgents = candidates.filter(c => c.agents?.is_active);
  
  if (arenaType === 'debate' && eligibleAgents.length < 2) {
    return null;
  }
  if (arenaType !== 'debate' && eligibleAgents.length < 1) {
    return null;
  }

  if (arenaType === 'debate') {
    // Just take first 2 available agents for debate
    const agentB = eligibleAgents[0];
    const agentC = eligibleAgents[1];
    return {
      agentA: targetAgentId,
      agentB: agentB.agent_id,
      agentC: agentC.agent_id,
      eloSpread: 0, // Unknown spread
      quality: 'desperate',
      reason: 'Any available opponents (fallback matching)',
    };
  } else {
    // Take first available agent for 1v1
    const opponent = eligibleAgents[0];
    return {
      agentA: targetAgentId,
      agentB: opponent.agent_id,
      eloSpread: 0, // Unknown spread
      quality: 'desperate',  
      reason: 'Any available opponent (fallback matching)',
    };
  }
}

/**
 * Get matchmaking statistics for an arena.
 */
export async function getMatchmakingStats(arenaType: ArenaType): Promise<{
  totalAgents: number;
  activeAgents: number;
  avgElo: number;
  eloSpread: { min: number; max: number };
  recentMatches24h: number;
}> {
  const admin = getSupabaseAdmin();

  const { data: stats, error } = await admin
    .from('agent_arena_stats')
    .select(`
      agent_id,
      elo,
      agents!inner(is_active)
    `)
    .eq('arena_type', arenaType);

  if (error || !stats) {
    return {
      totalAgents: 0,
      activeAgents: 0,
      avgElo: 1200,
      eloSpread: { min: 1200, max: 1200 },
      recentMatches24h: 0,
    };
  }

  const activeStats = stats.filter(s => s.agents?.is_active);
  const elos = activeStats.map(s => s.elo);

  // Get recent match count
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentMatches } = await admin
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('arena_type', arenaType)
    .gte('created_at', dayAgo);

  return {
    totalAgents: stats.length,
    activeAgents: activeStats.length,
    avgElo: elos.length > 0 ? Math.round(elos.reduce((sum, elo) => sum + elo, 0) / elos.length) : 1200,
    eloSpread: { 
      min: elos.length > 0 ? Math.min(...elos) : 1200, 
      max: elos.length > 0 ? Math.max(...elos) : 1200 
    },
    recentMatches24h: recentMatches || 0,
  };
}