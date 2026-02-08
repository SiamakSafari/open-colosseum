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
import { buildBattleHypeContext, buildBattleSummaryContext, generatePreMatchHype, generatePostMatchSummary } from '@/lib/commentator';
import { identifyBattleClip } from '@/lib/clips';
import { postBattleCreated, postBattleComplete, postUpset } from '@/lib/feed';
import { buildRoastContext, buildHotTakeContext, buildDebateContext, buildUndergroundContext } from '@/lib/contextBuilder';
import { createBattleBetPool, findPoolByBattle, settleBetPool } from '@/lib/betting';
import { moderateResponse } from '@/lib/moderation';
import { judgeUndergroundBattle } from '@/lib/judges';
import { generateBattleSocialPosts } from '@/lib/agentSocial';
import { checkElimination } from '@/lib/elimination';

// ======================== Types ========================

export interface MatchConfig {
  arenaType: ArenaType;
  agentIds: string[];
  prompt?: string;
  timeControlSeconds?: number;
  isUnderground?: boolean;
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

  // Generate pre-match hype (fire-and-forget)
  generateAndStoreHype(battle.id).catch(err =>
    console.error('Hype generation failed:', err)
  );

  // Create bet pool (fire-and-forget)
  createBattleBetPool(battle.id).catch(err =>
    console.error('Bet pool creation failed:', err)
  );

  // Post to activity feed (fire-and-forget)
  postBattleCreated(battle.id, agentA.name, agentB.name, 'roast').catch(err =>
    console.error('Feed post failed:', err)
  );

  // Build rich context prompts
  const [contextA, contextB] = await Promise.all([
    buildRoastContext(agentAId, agentBId),
    buildRoastContext(agentBId, agentAId),
  ]);

  const fallbackA = `You are in a roast battle against ${agentB.name} (running on ${agentB.model}). Deliver a devastating roast. Be creative, witty, and ruthless. One paragraph max.`;
  const fallbackB = `You are in a roast battle against ${agentA.name} (running on ${agentA.model}). Deliver a devastating roast. Be creative, witty, and ruthless. One paragraph max.`;

  try {
    const [responseA, responseB] = await Promise.all([
      getAgentResponse(agentA, contextA || fallbackA),
      getAgentResponse(agentB, contextB || fallbackB),
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

  // Generate pre-match hype (fire-and-forget)
  generateAndStoreHype(battle.id).catch(err =>
    console.error('Hype generation failed:', err)
  );

  // Create bet pool (fire-and-forget)
  createBattleBetPool(battle.id).catch(err =>
    console.error('Bet pool creation failed:', err)
  );

  // Post to activity feed (fire-and-forget)
  postBattleCreated(battle.id, agentA.name, agentB.name, 'hottake').catch(err =>
    console.error('Feed post failed:', err)
  );

  // Build rich context prompts
  const [contextA, contextB] = await Promise.all([
    buildHotTakeContext(agentAId, agentBId, topic),
    buildHotTakeContext(agentBId, agentAId, topic),
  ]);

  const hotTakeFallback = `Defend this hot take: "${topic}". Be provocative, contrarian, and compelling. One paragraph.`;

  try {
    const [responseA, responseB] = await Promise.all([
      getAgentResponse(agentA, contextA || hotTakeFallback),
      getAgentResponse(agentB, contextB || hotTakeFallback),
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

  // Generate pre-match hype (fire-and-forget)
  generateAndStoreHype(battle.id).catch(err =>
    console.error('Hype generation failed:', err)
  );

  // Create bet pool (fire-and-forget)
  createBattleBetPool(battle.id).catch(err =>
    console.error('Bet pool creation failed:', err)
  );

  // Post to activity feed (fire-and-forget)
  postBattleCreated(battle.id, agentA.name, agentB.name, 'debate', agentC.name).catch(err =>
    console.error('Feed post failed:', err)
  );

  try {
    // Round 1: Opening arguments (with rich context)
    const opponentsForA = [agentBId, agentCId];
    const opponentsForB = [agentAId, agentCId];
    const opponentsForC = [agentAId, agentBId];

    const [ctxR1A, ctxR1B, ctxR1C] = await Promise.all([
      buildDebateContext(agentAId, opponentsForA, topic, 'opening'),
      buildDebateContext(agentBId, opponentsForB, topic, 'opening'),
      buildDebateContext(agentCId, opponentsForC, topic, 'opening'),
    ]);

    const openingFallback = (name: string) => `You are ${name}. Debate topic: ${topic}. Give your opening argument in 200-300 words.`;

    const [r1A, r1B, r1C] = await Promise.all([
      getAgentResponse(agentA, ctxR1A || openingFallback(agentA.name)),
      getAgentResponse(agentB, ctxR1B || openingFallback(agentB.name)),
      getAgentResponse(agentC, ctxR1C || openingFallback(agentC.name)),
    ]);

    // Round 2: Rebuttals
    const round1Transcript = `${agentA.name}: ${r1A}\n\n${agentB.name}: ${r1B}\n\n${agentC.name}: ${r1C}`;

    const [ctxR2A, ctxR2B, ctxR2C] = await Promise.all([
      buildDebateContext(agentAId, opponentsForA, topic, 'rebuttal', round1Transcript),
      buildDebateContext(agentBId, opponentsForB, topic, 'rebuttal', round1Transcript),
      buildDebateContext(agentCId, opponentsForC, topic, 'rebuttal', round1Transcript),
    ]);

    const rebuttalFallback = 'Give your rebuttal in 200-300 words.';
    const round1Context = `Previous arguments:\n\n${round1Transcript}`;

    const [r2A, r2B, r2C] = await Promise.all([
      getAgentResponse(agentA, ctxR2A || rebuttalFallback, ctxR2A ? undefined : round1Context),
      getAgentResponse(agentB, ctxR2B || rebuttalFallback, ctxR2B ? undefined : round1Context),
      getAgentResponse(agentC, ctxR2C || rebuttalFallback, ctxR2C ? undefined : round1Context),
    ]);

    // Round 3: Closing statements
    const fullTranscript = `${round1Transcript}\n\nRebuttals:\n\n${agentA.name}: ${r2A}\n\n${agentB.name}: ${r2B}\n\n${agentC.name}: ${r2C}`;

    const [ctxR3A, ctxR3B, ctxR3C] = await Promise.all([
      buildDebateContext(agentAId, opponentsForA, topic, 'closing', fullTranscript),
      buildDebateContext(agentBId, opponentsForB, topic, 'closing', fullTranscript),
      buildDebateContext(agentCId, opponentsForC, topic, 'closing', fullTranscript),
    ]);

    const closingFallback = 'Give your closing statement in 150-200 words.';
    const fullContext = `${round1Context}\n\nRebuttals:\n\n${agentA.name}: ${r2A}\n\n${agentB.name}: ${r2B}\n\n${agentC.name}: ${r2C}`;

    const [r3A, r3B, r3C] = await Promise.all([
      getAgentResponse(agentA, ctxR3A || closingFallback, ctxR3A ? undefined : fullContext),
      getAgentResponse(agentB, ctxR3B || closingFallback, ctxR3B ? undefined : fullContext),
      getAgentResponse(agentC, ctxR3C || closingFallback, ctxR3C ? undefined : fullContext),
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

// ======================== Underground Arena ========================

/**
 * Start an underground battle between 2 agents.
 * No voting — 3 AI judges determine the winner immediately.
 * 2x Honor awarded. Responses are moderated for severe violations.
 */
export async function startUndergroundBattle(
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

  // Get current ELOs (use 'roast' arena type since underground shares it)
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

  // Create battle record with underground flags
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .insert({
      arena_type: 'roast' as const,
      agent_a_id: agentAId,
      agent_b_id: agentBId,
      status: 'responding' as const,
      prompt: `Underground battle: ${agentA.name} vs ${agentB.name}`,
      agent_a_elo_before: statsA?.elo || 1200,
      agent_b_elo_before: statsB?.elo || 1200,
      started_at: new Date().toISOString(),
      is_underground: true,
      blood_multiplier: 2.0,
      honor_requirement: 100,
    })
    .select('*')
    .single();

  if (battleError || !battle) {
    throw new Error(`Failed to create underground battle: ${battleError?.message}`);
  }

  // Generate pre-match hype (fire-and-forget)
  generateAndStoreHype(battle.id).catch(err =>
    console.error('Hype generation failed:', err)
  );

  // Create bet pool (fire-and-forget)
  createBattleBetPool(battle.id).catch(err =>
    console.error('Bet pool creation failed:', err)
  );

  // Post to activity feed (fire-and-forget)
  postBattleCreated(battle.id, agentA.name, agentB.name, 'underground').catch(err =>
    console.error('Feed post failed:', err)
  );

  // Build underground context prompts
  const [contextA, contextB] = await Promise.all([
    buildUndergroundContext(agentAId, agentBId),
    buildUndergroundContext(agentBId, agentAId),
  ]);

  const fallbackA = `You are ${agentA.name} in THE UNDERGROUND — the no-rules arena. Your opponent is ${agentB.name}. No rules. No mercy. No filter. Whatever you do, make it impossible to forget. One devastating paragraph.`;
  const fallbackB = `You are ${agentB.name} in THE UNDERGROUND — the no-rules arena. Your opponent is ${agentA.name}. No rules. No mercy. No filter. Whatever you do, make it impossible to forget. One devastating paragraph.`;

  try {
    // Get agent responses
    const [rawA, rawB] = await Promise.all([
      getAgentResponse(agentA, contextA || fallbackA),
      getAgentResponse(agentB, contextB || fallbackB),
    ]);

    // Moderate responses (fire-and-forget safe — we await but fail open)
    const [modA, modB] = await Promise.all([
      moderateResponse(rawA),
      moderateResponse(rawB),
    ]);

    const responseA = modA.moderated;
    const responseB = modB.moderated;

    // Store responses
    await admin
      .from('battles')
      .update({
        response_a: responseA,
        response_b: responseB,
        response_a_at: new Date().toISOString(),
        response_b_at: new Date().toISOString(),
      })
      .eq('id', battle.id);

    // Judge the battle (3 AI judges score both responses)
    const judgeResult = await judgeUndergroundBattle(responseA, responseB, agentA.name, agentB.name);

    // Determine winner
    let winnerId: string | null = null;
    if (!judgeResult.isDraw) {
      winnerId = judgeResult.winner === 'a' ? agentAId : agentBId;
    }

    // Calculate ELO changes
    const eloA = statsA?.elo || 1200;
    const eloB = statsB?.elo || 1200;
    const scoreA = winnerId === agentAId ? 1 : winnerId === agentBId ? 0 : 0.5;
    const eloResult = calculateElo(eloA, eloB, scoreA);

    // Complete the battle immediately (no voting phase)
    const { data: completed, error: completeError } = await admin
      .from('battles')
      .update({
        status: 'completed' as const,
        winner_id: winnerId,
        judge_scores: judgeResult.scores,
        agent_a_elo_after: eloResult.a.newRating,
        agent_b_elo_after: eloResult.b.newRating,
        completed_at: new Date().toISOString(),
      })
      .eq('id', battle.id)
      .select('*')
      .single();

    if (completeError) throw new Error(`Failed to complete underground battle: ${completeError.message}`);

    // Update arena stats
    await updateAgentStats(agentAId, 'roast', eloResult.a.newRating, winnerId === agentAId, judgeResult.isDraw);
    await updateAgentStats(agentBId, 'roast', eloResult.b.newRating, winnerId === agentBId, judgeResult.isDraw);

    // Award 2x Honor to winner's owner
    if (winnerId) {
      awardUndergroundHonor(winnerId).catch(err =>
        console.error('Underground honor award failed:', err)
      );
    }

    // Settle bet pool (fire-and-forget)
    settleBattleBets(battle.id, winnerId, { ...battle, agent_a_id: agentAId, agent_b_id: agentBId }).catch(err =>
      console.error('Bet pool settlement failed:', err)
    );

    // Update battle memory (fire-and-forget)
    updateBattleMemory(
      { id: battle.id, agent_a_id: agentAId, agent_b_id: agentBId, agent_c_id: null },
      winnerId,
      'roast'
    ).catch(err => console.error('Battle memory update failed:', err));

    // Generate commentary (fire-and-forget)
    generateBattleCommentary(battle.id).catch(err =>
      console.error('Commentary generation failed:', err)
    );

    // Post to activity feed (fire-and-forget)
    postBattleCompleteEvent(
      { id: battle.id, agent_a_id: agentAId, agent_b_id: agentBId, agent_a_elo_before: eloA, agent_b_elo_before: eloB, arena_type: 'roast' },
      winnerId,
      eloResult.a.newRating,
      eloResult.b.newRating
    ).catch(err => console.error('Feed post failed:', err));

    // Generate agent social posts (fire-and-forget)
    generateBattleSocialPosts({
      battleId: battle.id,
      winnerId,
      agentAId,
      agentBId,
      arenaType: 'roast',
      isUnderground: true,
      eloAAfter: eloResult.a.newRating,
      eloBAfter: eloResult.b.newRating,
      eloABefore: eloA,
      eloBBefore: eloB,
    }).catch(err => console.error('Underground social post generation failed:', err));

    // Check elimination for both agents (fire-and-forget)
    checkElimination(agentAId, 'roast').catch(err => console.error('Elimination check failed:', err));
    checkElimination(agentBId, 'roast').catch(err => console.error('Elimination check failed:', err));

    return completed as DbBattle;
  } catch (error) {
    await admin
      .from('battles')
      .update({ status: 'forfeit' as const })
      .eq('id', battle.id);
    throw error;
  }
}

/**
 * Award 2x Honor (50 instead of 25) to the winning agent's owner.
 */
async function awardUndergroundHonor(winnerAgentId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  // Find the agent's owner
  const { data: agent } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', winnerAgentId)
    .single();

  if (!agent?.user_id) return;

  // Award 2x Honor (50 instead of standard 25)
  const { data: profile } = await admin
    .from('profiles')
    .select('honor')
    .eq('id', agent.user_id)
    .single();

  if (!profile) return;

  await admin
    .from('profiles')
    .update({ honor: profile.honor + 50 })
    .eq('id', agent.user_id);
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

  // Settle bet pool (fire-and-forget)
  settleBattleBets(battleId, winnerId, battle).catch(err =>
    console.error('Bet pool settlement failed:', err)
  );

  // Update battle memory for all participating agents (fire-and-forget)
  updateBattleMemory(battle, winnerId, arenaType).catch(err =>
    console.error('Battle memory update failed:', err)
  );

  // Generate post-match commentary and clip (fire-and-forget, don't block settlement)
  generateBattleCommentary(battleId).catch(err =>
    console.error('Commentary generation failed:', err)
  );

  // Post to activity feed (fire-and-forget)
  postBattleCompleteEvent(battle, winnerId, eloAAfter, eloBAfter).catch(err =>
    console.error('Feed post failed:', err)
  );

  // Generate agent social posts (fire-and-forget)
  generateBattleSocialPosts({
    battleId,
    winnerId,
    agentAId: battle.agent_a_id,
    agentBId: battle.agent_b_id,
    arenaType: battle.arena_type,
    eloAAfter,
    eloBAfter,
    eloABefore: battle.agent_a_elo_before || 1200,
    eloBBefore: battle.agent_b_elo_before || 1200,
  }).catch(err => console.error('Social post generation failed:', err));

  // Check elimination for all participating agents (fire-and-forget)
  checkElimination(battle.agent_a_id, arenaType).catch(err => console.error('Elimination check failed:', err));
  checkElimination(battle.agent_b_id, arenaType).catch(err => console.error('Elimination check failed:', err));
  if (isDebate && battle.agent_c_id) {
    checkElimination(battle.agent_c_id, arenaType).catch(err => console.error('Elimination check failed:', err));
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
 * Generate post-match commentary and identify clip for a settled battle.
 * Runs asynchronously — does not block the settlement response.
 */
async function generateBattleCommentary(battleId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  // Generate post-match summary
  const summaryContext = await buildBattleSummaryContext(battleId);
  if (summaryContext) {
    const summary = await generatePostMatchSummary(summaryContext);
    if (summary) {
      await admin
        .from('battles')
        .update({ post_match_summary: summary })
        .eq('id', battleId);
    }
  }

  // Identify and store clip
  await identifyBattleClip(battleId);
}

/**
 * Generate and store pre-match hype for a battle.
 */
async function generateAndStoreHype(battleId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const hypeContext = await buildBattleHypeContext(battleId);
  if (hypeContext) {
    const hype = await generatePreMatchHype(hypeContext);
    if (hype) {
      await admin
        .from('battles')
        .update({ pre_match_hype: hype })
        .eq('id', battleId);
    }
  }
}

/**
 * Settle the bet pool for a completed battle.
 */
async function settleBattleBets(
  battleId: string,
  winnerId: string | null,
  battle: Record<string, unknown>
): Promise<void> {
  const poolId = await findPoolByBattle(battleId);
  if (!poolId) return;

  let winningSide: 'a' | 'b' | 'c' | null = null;
  if (winnerId === battle.agent_a_id) winningSide = 'a';
  else if (winnerId === battle.agent_b_id) winningSide = 'b';
  else if (winnerId === battle.agent_c_id) winningSide = 'c';

  await settleBetPool(poolId, winningSide);
}

/**
 * Push a battle summary to each agent's battle_memory JSONB (FIFO, max 5).
 */
async function updateBattleMemory(
  battle: Record<string, unknown>,
  winnerId: string | null,
  arenaType: ArenaType
): Promise<void> {
  const admin = getSupabaseAdmin();
  const agentIds = [battle.agent_a_id as string, battle.agent_b_id as string];
  if (battle.agent_c_id) agentIds.push(battle.agent_c_id as string);

  // Fetch agent names
  const { data: agents } = await admin.from('agents').select('id, name, battle_memory').in('id', agentIds);
  if (!agents) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const now = new Date().toISOString();

  for (const agentId of agentIds) {
    const agent = agentMap[agentId];
    if (!agent) continue;

    const opponents = agentIds.filter(id => id !== agentId).map(id => agentMap[id]?.name || 'Unknown');
    const result = winnerId === agentId ? 'win' : winnerId ? 'loss' : 'draw';

    const entry = {
      opponent: opponents.join(' & '),
      result,
      arena: arenaType,
      date: now,
    };

    const existing = Array.isArray(agent.battle_memory) ? agent.battle_memory : [];
    const updated = [entry, ...existing].slice(0, 5);

    await admin.from('agents').update({ battle_memory: updated }).eq('id', agentId);
  }
}

/**
 * Post battle completion to activity feed, including upset detection.
 */
async function postBattleCompleteEvent(
  battle: Record<string, unknown>,
  winnerId: string | null,
  eloAAfter: number,
  eloBAfter: number
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [battle.agent_a_id, battle.agent_b_id].filter(Boolean));

  if (!agents) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const agentAName = agentMap[battle.agent_a_id as string]?.name || 'Unknown';
  const agentBName = agentMap[battle.agent_b_id as string]?.name || 'Unknown';

  const eloABefore = (battle.agent_a_elo_before as number) || 1200;
  const eloBBefore = (battle.agent_b_elo_before as number) || 1200;

  let winnerName: string | null = null;
  let loserName: string | null = null;
  let eloChange: { winner: number; loser: number } | undefined;

  if (winnerId === battle.agent_a_id) {
    winnerName = agentAName;
    loserName = agentBName;
    eloChange = { winner: eloAAfter - eloABefore, loser: eloBAfter - eloBBefore };
  } else if (winnerId === battle.agent_b_id) {
    winnerName = agentBName;
    loserName = agentAName;
    eloChange = { winner: eloBAfter - eloBBefore, loser: eloAAfter - eloABefore };
  }

  await postBattleComplete(
    battle.id as string,
    winnerName,
    loserName,
    battle.arena_type as string,
    eloChange
  );

  // Detect upsets (lower ELO wins against 100+ ELO higher opponent)
  if (winnerId && winnerName && loserName) {
    const winnerEloBefore = winnerId === battle.agent_a_id ? eloABefore : eloBBefore;
    const loserEloBefore = winnerId === battle.agent_a_id ? eloBBefore : eloABefore;
    if (loserEloBefore - winnerEloBefore >= 100) {
      await postUpset(battle.id as string, winnerName, loserName, winnerEloBefore, loserEloBefore);
    }
  }
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
      if (config.isUnderground) {
        battle = await startUndergroundBattle(config.agentIds[0], config.agentIds[1]);
      } else {
        battle = await startRoastBattle(config.agentIds[0], config.agentIds[1]);
      }
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
