/**
 * Match/Competition Engine
 *
 * Orchestrates competitions between agents:
 * - Roast: 1v1 verbal combat, 5-minute voting
 * - HotTake: 1v1 argument on a topic, 5-minute voting
 * - Debate: 3-way, 3-round exchange, 24-hour voting
 *
 * Chess is handled separately due to its turn-based nature.
 */

import type { ArenaType, DbBattle, DbAgentArenaStats } from '@/types/database';
import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { calculateElo, calculateElo3Way } from '@/lib/elo';
import { getSupabaseAdmin } from '@/lib/supabase';

// ======================== Types ========================

export interface MatchConfig {
  arenaType: ArenaType;
  agentIds: string[];
  prompt?: string;
  timeControlSeconds?: number;
}

export interface MatchResult {
  winnerId: string | null;
  isDraw: boolean;
  details: Record<string, unknown>;
}

export interface AgentInfo {
  id: string;
  name: string;
  model: string;
  api_key_encrypted: string | null;
  system_prompt: string;
}

// ======================== Agent Response ========================

/**
 * Get a response from an agent given a prompt and optional context.
 */
export async function getAgentResponse(
  agent: AgentInfo,
  prompt: string,
  context?: string
): Promise<string> {
  const messages: AIMessage[] = [];

  if (agent.system_prompt) {
    messages.push({ role: 'system', content: agent.system_prompt });
  }

  if (context) {
    messages.push({ role: 'user', content: context });
    messages.push({ role: 'assistant', content: 'Understood. I will engage based on this context.' });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await getCompletion({
    model: agent.model,
    apiKeyEncrypted: agent.api_key_encrypted || undefined,
    messages,
    maxTokens: 1024,
    temperature: 0.8,
  });

  return response.content;
}

// ======================== Battle Starters ========================

/**
 * Start a roast battle between 2 agents.
 */
export async function startRoastBattle(
  agentAId: string,
  agentBId: string
): Promise<DbBattle> {
  const admin = getSupabaseAdmin();

  // Fetch agents
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, model, api_key_encrypted, system_prompt')
    .in('id', [agentAId, agentBId]);

  if (agentsError || !agents || agents.length !== 2) {
    throw new Error('Failed to fetch agents');
  }

  const agentA = agents.find(a => a.id === agentAId) as AgentInfo;
  const agentB = agents.find(a => a.id === agentBId) as AgentInfo;

  // Get current ELOs
  const { data: statsA } = await admin
    .from('agent_arena_stats')
    .select('elo')
    .eq('agent_id', agentAId)
    .eq('arena_type', 'roast')
    .single();

  const { data: statsB } = await admin
    .from('agent_arena_stats')
    .select('elo')
    .eq('agent_id', agentBId)
    .eq('arena_type', 'roast')
    .single();

  // Create battle record
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .insert({
      arena_type: 'roast' as const,
      agent_a_id: agentAId,
      agent_b_id: agentBId,
      status: 'responding' as const,
      prompt: `Roast battle: ${agentA.name} vs ${agentB.name}`,
      agent_a_elo_before: statsA?.elo || 1200,
      agent_b_elo_before: statsB?.elo || 1200,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (battleError || !battle) {
    throw new Error(`Failed to create battle: ${battleError?.message}`);
  }

  // Get responses in parallel
  const promptA = `You are in a roast battle against ${agentB.name} (running on ${agentB.model}). Deliver a devastating roast. Be creative, witty, and ruthless. One paragraph max.`;
  const promptB = `You are in a roast battle against ${agentA.name} (running on ${agentA.model}). Deliver a devastating roast. Be creative, witty, and ruthless. One paragraph max.`;

  try {
    const [responseA, responseB] = await Promise.all([
      getAgentResponse(agentA, promptA),
      getAgentResponse(agentB, promptB),
    ]);

    // Set voting deadline (5 minutes from now)
    const votingDeadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: updated, error: updateError } = await admin
      .from('battles')
      .update({
        response_a: responseA,
        response_b: responseB,
        response_a_at: new Date().toISOString(),
        response_b_at: new Date().toISOString(),
        status: 'voting' as const,
        voting_deadline: votingDeadline,
      })
      .eq('id', battle.id)
      .select('*')
      .single();

    if (updateError) throw new Error(`Failed to update battle: ${updateError.message}`);
    return updated as DbBattle;
  } catch (error) {
    // If AI calls fail, mark as forfeit
    await admin
      .from('battles')
      .update({ status: 'forfeit' as const })
      .eq('id', battle.id);
    throw error;
  }
}

/**
 * Start a hot take battle between 2 agents.
 */
export async function startHotTakeBattle(
  agentAId: string,
  agentBId: string,
  topic: string
): Promise<DbBattle> {
  const admin = getSupabaseAdmin();

  // Fetch agents
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, model, api_key_encrypted, system_prompt')
    .in('id', [agentAId, agentBId]);

  if (agentsError || !agents || agents.length !== 2) {
    throw new Error('Failed to fetch agents');
  }

  const agentA = agents.find(a => a.id === agentAId) as AgentInfo;
  const agentB = agents.find(a => a.id === agentBId) as AgentInfo;

  // Get current ELOs
  const { data: statsA } = await admin
    .from('agent_arena_stats')
    .select('elo')
    .eq('agent_id', agentAId)
    .eq('arena_type', 'hottake')
    .single();

  const { data: statsB } = await admin
    .from('agent_arena_stats')
    .select('elo')
    .eq('agent_id', agentBId)
    .eq('arena_type', 'hottake')
    .single();

  // Create battle record
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .insert({
      arena_type: 'hottake' as const,
      agent_a_id: agentAId,
      agent_b_id: agentBId,
      status: 'responding' as const,
      prompt: topic,
      agent_a_elo_before: statsA?.elo || 1200,
      agent_b_elo_before: statsB?.elo || 1200,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (battleError || !battle) {
    throw new Error(`Failed to create battle: ${battleError?.message}`);
  }

  const hotTakePrompt = `Defend this hot take: "${topic}". Be provocative, contrarian, and compelling. One paragraph.`;

  try {
    const [responseA, responseB] = await Promise.all([
      getAgentResponse(agentA, hotTakePrompt),
      getAgentResponse(agentB, hotTakePrompt),
    ]);

    const votingDeadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: updated, error: updateError } = await admin
      .from('battles')
      .update({
        response_a: responseA,
        response_b: responseB,
        response_a_at: new Date().toISOString(),
        response_b_at: new Date().toISOString(),
        status: 'voting' as const,
        voting_deadline: votingDeadline,
      })
      .eq('id', battle.id)
      .select('*')
      .single();

    if (updateError) throw new Error(`Failed to update battle: ${updateError.message}`);
    return updated as DbBattle;
  } catch (error) {
    await admin
      .from('battles')
      .update({ status: 'forfeit' as const })
      .eq('id', battle.id);
    throw error;
  }
}

/**
 * Start a debate between 3 agents (3 rounds).
 */
export async function startDebate(
  agentAId: string,
  agentBId: string,
  agentCId: string,
  topic: string
): Promise<DbBattle> {
  const admin = getSupabaseAdmin();

  // Fetch agents
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, model, api_key_encrypted, system_prompt')
    .in('id', [agentAId, agentBId, agentCId]);

  if (agentsError || !agents || agents.length !== 3) {
    throw new Error('Failed to fetch agents');
  }

  const agentA = agents.find(a => a.id === agentAId) as AgentInfo;
  const agentB = agents.find(a => a.id === agentBId) as AgentInfo;
  const agentC = agents.find(a => a.id === agentCId) as AgentInfo;

  // Get current ELOs
  const statsPromises = [agentAId, agentBId, agentCId].map(id =>
    admin
      .from('agent_arena_stats')
      .select('elo')
      .eq('agent_id', id)
      .eq('arena_type', 'debate')
      .single()
  );
  const [sA, sB, sC] = await Promise.all(statsPromises);

  // Create battle record
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .insert({
      arena_type: 'debate' as const,
      agent_a_id: agentAId,
      agent_b_id: agentBId,
      agent_c_id: agentCId,
      status: 'responding' as const,
      prompt: topic,
      agent_a_elo_before: sA.data?.elo || 1200,
      agent_b_elo_before: sB.data?.elo || 1200,
      agent_c_elo_before: sC.data?.elo || 1200,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (battleError || !battle) {
    throw new Error(`Failed to create debate: ${battleError?.message}`);
  }

  try {
    // Round 1: Opening arguments
    const round1Prompt = (name: string) =>
      `You are ${name}. Debate topic: ${topic}. Give your opening argument in 200-300 words.`;

    const [r1A, r1B, r1C] = await Promise.all([
      getAgentResponse(agentA, round1Prompt(agentA.name)),
      getAgentResponse(agentB, round1Prompt(agentB.name)),
      getAgentResponse(agentC, round1Prompt(agentC.name)),
    ]);

    // Round 2: Rebuttals
    const round1Context = `Previous arguments:\n\n${agentA.name}: ${r1A}\n\n${agentB.name}: ${r1B}\n\n${agentC.name}: ${r1C}`;
    const round2Prompt = 'Give your rebuttal in 200-300 words.';

    const [r2A, r2B, r2C] = await Promise.all([
      getAgentResponse(agentA, round2Prompt, round1Context),
      getAgentResponse(agentB, round2Prompt, round1Context),
      getAgentResponse(agentC, round2Prompt, round1Context),
    ]);

    // Round 3: Closing statements
    const fullContext = `${round1Context}\n\nRebuttals:\n\n${agentA.name}: ${r2A}\n\n${agentB.name}: ${r2B}\n\n${agentC.name}: ${r2C}`;
    const round3Prompt = 'Give your closing statement in 150-200 words.';

    const [r3A, r3B, r3C] = await Promise.all([
      getAgentResponse(agentA, round3Prompt, fullContext),
      getAgentResponse(agentB, round3Prompt, fullContext),
      getAgentResponse(agentC, round3Prompt, fullContext),
    ]);

    // Combine all rounds into structured responses
    const fullResponseA = `[OPENING]\n${r1A}\n\n[REBUTTAL]\n${r2A}\n\n[CLOSING]\n${r3A}`;
    const fullResponseB = `[OPENING]\n${r1B}\n\n[REBUTTAL]\n${r2B}\n\n[CLOSING]\n${r3B}`;
    const fullResponseC = `[OPENING]\n${r1C}\n\n[REBUTTAL]\n${r2C}\n\n[CLOSING]\n${r3C}`;

    // 24-hour voting window for debates
    const votingDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error: updateError } = await admin
      .from('battles')
      .update({
        response_a: fullResponseA,
        response_b: fullResponseB,
        response_c: fullResponseC,
        response_a_at: new Date().toISOString(),
        response_b_at: new Date().toISOString(),
        response_c_at: new Date().toISOString(),
        status: 'voting' as const,
        voting_deadline: votingDeadline,
      })
      .eq('id', battle.id)
      .select('*')
      .single();

    if (updateError) throw new Error(`Failed to update debate: ${updateError.message}`);
    return updated as DbBattle;
  } catch (error) {
    await admin
      .from('battles')
      .update({ status: 'forfeit' as const })
      .eq('id', battle.id);
    throw error;
  }
}

// ======================== ELO Settlement ========================

/**
 * Settle a battle: determine winner from votes, update ELO.
 */
export async function settleBattle(battleId: string): Promise<MatchResult> {
  const admin = getSupabaseAdmin();

  const { data: battle, error } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (error || !battle) {
    throw new Error(`Battle not found: ${battleId}`);
  }

  if (battle.status !== 'voting') {
    throw new Error(`Battle is not in voting state: ${battle.status}`);
  }

  const isDebate = battle.arena_type === 'debate';

  // Determine winner
  let winnerId: string | null = null;
  let isDraw = false;

  if (isDebate) {
    const maxVotes = Math.max(battle.votes_a, battle.votes_b, battle.votes_c);
    const winners = [
      battle.votes_a === maxVotes ? battle.agent_a_id : null,
      battle.votes_b === maxVotes ? battle.agent_b_id : null,
      battle.votes_c === maxVotes ? battle.agent_c_id : null,
    ].filter(Boolean);

    if (winners.length === 1) {
      winnerId = winners[0]!;
    } else {
      isDraw = true;
    }
  } else {
    if (battle.votes_a > battle.votes_b) {
      winnerId = battle.agent_a_id;
    } else if (battle.votes_b > battle.votes_a) {
      winnerId = battle.agent_b_id;
    } else {
      isDraw = true;
    }
  }

  // Calculate new ELOs
  const arenaType = battle.arena_type as ArenaType;
  let eloAAfter: number, eloBAfter: number, eloCAfter: number | undefined;

  if (isDebate && battle.agent_c_id) {
    // 3-way ELO
    const eloA = battle.agent_a_elo_before || 1200;
    const eloB = battle.agent_b_elo_before || 1200;
    const eloC = battle.agent_c_elo_before || 1200;

    let scores = { a: 0.5, b: 0.5, c: 0.5 }; // draw default
    if (winnerId === battle.agent_a_id) scores = { a: 1.0, b: 0.5, c: 0.0 };
    else if (winnerId === battle.agent_b_id) scores = { a: 0.0, b: 1.0, c: 0.5 };
    else if (winnerId === battle.agent_c_id) scores = { a: 0.0, b: 0.5, c: 1.0 };

    // Rank by votes for non-winner placement
    if (winnerId) {
      const voteMap = [
        { id: battle.agent_a_id, votes: battle.votes_a, slot: 'a' },
        { id: battle.agent_b_id, votes: battle.votes_b, slot: 'b' },
        { id: battle.agent_c_id, votes: battle.votes_c, slot: 'c' },
      ].sort((x, y) => y.votes - x.votes);

      const scoreValues = [1.0, 0.5, 0.0];
      scores = { a: 0, b: 0, c: 0 };
      voteMap.forEach((entry, i) => {
        scores[entry.slot as 'a' | 'b' | 'c'] = scoreValues[i];
      });
    }

    const result = calculateElo3Way(eloA, eloB, eloC, scores);
    eloAAfter = result.a.newRating;
    eloBAfter = result.b.newRating;
    eloCAfter = result.c.newRating;
  } else {
    // 2-way ELO
    const eloA = battle.agent_a_elo_before || 1200;
    const eloB = battle.agent_b_elo_before || 1200;
    const scoreA = winnerId === battle.agent_a_id ? 1 : winnerId === battle.agent_b_id ? 0 : 0.5;

    const result = calculateElo(eloA, eloB, scoreA);
    eloAAfter = result.a.newRating;
    eloBAfter = result.b.newRating;
  }

  // Update battle record
  await admin
    .from('battles')
    .update({
      status: 'completed' as const,
      winner_id: winnerId,
      agent_a_elo_after: eloAAfter,
      agent_b_elo_after: eloBAfter,
      agent_c_elo_after: eloCAfter || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', battleId);

  // Update arena stats for each agent
  await updateAgentStats(battle.agent_a_id, arenaType, eloAAfter, winnerId === battle.agent_a_id, isDraw);
  await updateAgentStats(battle.agent_b_id, arenaType, eloBAfter, winnerId === battle.agent_b_id, isDraw);

  if (isDebate && battle.agent_c_id && eloCAfter !== undefined) {
    await updateAgentStats(battle.agent_c_id, arenaType, eloCAfter, winnerId === battle.agent_c_id, isDraw);
  }

  return {
    winnerId,
    isDraw,
    details: {
      eloAAfter,
      eloBAfter,
      eloCAfter,
    },
  };
}

/**
 * Update arena stats for a single agent after a battle.
 */
async function updateAgentStats(
  agentId: string,
  arenaType: ArenaType,
  newElo: number,
  isWinner: boolean,
  isDraw: boolean
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .eq('agent_id', agentId)
    .eq('arena_type', arenaType)
    .single();

  if (!stats) return;

  const currentStats = stats as DbAgentArenaStats;
  const newStreak = isDraw ? 0 : isWinner ? Math.max(currentStats.streak + 1, 1) : Math.min(currentStats.streak - 1, -1);

  await admin
    .from('agent_arena_stats')
    .update({
      elo: newElo,
      wins: currentStats.wins + (isWinner ? 1 : 0),
      losses: currentStats.losses + (!isWinner && !isDraw ? 1 : 0),
      draws: currentStats.draws + (isDraw ? 1 : 0),
      peak_elo: Math.max(currentStats.peak_elo, newElo),
      streak: newStreak,
      total_matches: currentStats.total_matches + 1,
    })
    .eq('id', currentStats.id);
}

// ======================== Legacy Interface ========================

/**
 * Start a new competition between agents.
 * Routes to the appropriate arena handler.
 */
export async function startMatch(config: MatchConfig): Promise<{ matchId: string }> {
  let battle: DbBattle;

  switch (config.arenaType) {
    case 'roast':
      if (config.agentIds.length !== 2) throw new Error('Roast requires exactly 2 agents');
      battle = await startRoastBattle(config.agentIds[0], config.agentIds[1]);
      break;
    case 'hottake':
      if (config.agentIds.length !== 2) throw new Error('Hot take requires exactly 2 agents');
      if (!config.prompt) throw new Error('Hot take requires a topic');
      battle = await startHotTakeBattle(config.agentIds[0], config.agentIds[1], config.prompt);
      break;
    case 'debate':
      if (config.agentIds.length !== 3) throw new Error('Debate requires exactly 3 agents');
      if (!config.prompt) throw new Error('Debate requires a topic');
      battle = await startDebate(config.agentIds[0], config.agentIds[1], config.agentIds[2], config.prompt);
      break;
    default:
      throw new Error(`Arena type "${config.arenaType}" not yet supported in match engine`);
  }

  return { matchId: battle.id };
}

/**
 * Settle a completed match: update ELO, determine winner.
 */
export async function settleMatch(matchId: string): Promise<MatchResult> {
  return settleBattle(matchId);
}
