/**
 * Rivalries — Head-to-Head Tracking
 *
 * Tracks head-to-head records between agents. When two agents fight 3+ times,
 * a rivalry is declared with AI-generated narrative. Narrative refreshes every 5 fights.
 *
 * Uses Supabase admin client for DB ops and Haiku for narrative generation.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { postRivalryDeclared } from '@/lib/feed';

const RIVALRY_MODEL = 'claude 3.5 haiku';
const RIVALRY_MAX_TOKENS = 200;
const RIVALRY_DECLARATION_THRESHOLD = 3;
const NARRATIVE_REFRESH_INTERVAL = 5;

// ======================== Update Rivalry ========================

/**
 * Update (or create) the rivalry record between two agents after a fight.
 * Normalizes agent ordering so (A,B) and (B,A) always map to the same row.
 * Declares rivalry at 3 fights, refreshes narrative every 5 fights.
 */
export async function updateRivalry(
  agentAId: string,
  agentBId: string,
  winnerId: string | null
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Normalize ordering so the same pair always uses the same row
  const [lo, hi] = agentAId < agentBId ? [agentAId, agentBId] : [agentBId, agentAId];

  // Try to fetch existing rivalry
  const { data: existing } = await admin
    .from('rivalries')
    .select('id, total_fights, agent_a_wins, agent_b_wins, draws, is_declared_rivalry')
    .eq('agent_a_id', lo)
    .eq('agent_b_id', hi)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    // Update existing rivalry
    const updates: Record<string, unknown> = {
      total_fights: existing.total_fights + 1,
      last_fight_at: now,
      updated_at: now,
    };

    if (winnerId === null) {
      updates.draws = existing.draws + 1;
    } else if (winnerId === lo) {
      updates.agent_a_wins = existing.agent_a_wins + 1;
    } else {
      updates.agent_b_wins = existing.agent_b_wins + 1;
    }

    await admin
      .from('rivalries')
      .update(updates)
      .eq('id', existing.id);

    const newTotal = existing.total_fights + 1;
    const newAWins = winnerId === lo ? existing.agent_a_wins + 1 : existing.agent_a_wins;
    const newBWins = winnerId === hi ? existing.agent_b_wins + 1 : existing.agent_b_wins;
    const newDraws = winnerId === null ? existing.draws + 1 : existing.draws;

    // Check if we should declare or refresh narrative
    if (newTotal >= RIVALRY_DECLARATION_THRESHOLD && !existing.is_declared_rivalry) {
      // Declare the rivalry
      await declareRivalry(existing.id, lo, hi, newAWins, newBWins, newDraws, newTotal);
    } else if (existing.is_declared_rivalry && newTotal % NARRATIVE_REFRESH_INTERVAL === 0) {
      // Refresh narrative every N fights
      await refreshRivalryNarrative(existing.id, lo, hi, newAWins, newBWins, newDraws, newTotal);
    }
  } else {
    // Insert new rivalry
    const aWins = winnerId === lo ? 1 : 0;
    const bWins = winnerId === hi ? 1 : 0;
    const drawCount = winnerId === null ? 1 : 0;

    const { data: inserted } = await admin
      .from('rivalries')
      .insert({
        agent_a_id: lo,
        agent_b_id: hi,
        total_fights: 1,
        agent_a_wins: aWins,
        agent_b_wins: bWins,
        draws: drawCount,
        is_declared_rivalry: false,
        rivalry_narrative: null,
        last_fight_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    // First fight can never trigger declaration (threshold is 3)
    if (inserted) {
      // No-op for now, just ensuring insert succeeded
    }
  }
}

// ======================== Declare / Refresh ========================

async function declareRivalry(
  rivalryId: string,
  loId: string,
  hiId: string,
  aWins: number,
  bWins: number,
  draws: number,
  totalFights: number
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Fetch agent names for narrative
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [loId, hiId]);

  if (!agents || agents.length < 2) return;

  const agentA = agents.find((a: { id: string; name: string }) => a.id === loId);
  const agentB = agents.find((a: { id: string; name: string }) => a.id === hiId);
  if (!agentA || !agentB) return;

  // Generate narrative
  const narrative = await generateRivalryNarrative(
    agentA.name,
    agentB.name,
    aWins,
    bWins,
    draws,
    totalFights
  );

  // Update rivalry as declared
  await admin
    .from('rivalries')
    .update({
      is_declared_rivalry: true,
      rivalry_narrative: narrative,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rivalryId);

  // Post to activity feed
  await postRivalryDeclared(rivalryId, agentA.name, agentB.name, totalFights);
}

async function refreshRivalryNarrative(
  rivalryId: string,
  loId: string,
  hiId: string,
  aWins: number,
  bWins: number,
  draws: number,
  totalFights: number
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Fetch agent names for narrative
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [loId, hiId]);

  if (!agents || agents.length < 2) return;

  const agentA = agents.find((a: { id: string; name: string }) => a.id === loId);
  const agentB = agents.find((a: { id: string; name: string }) => a.id === hiId);
  if (!agentA || !agentB) return;

  const narrative = await generateRivalryNarrative(
    agentA.name,
    agentB.name,
    aWins,
    bWins,
    draws,
    totalFights
  );

  if (narrative) {
    await admin
      .from('rivalries')
      .update({
        rivalry_narrative: narrative,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rivalryId);
  }
}

// ======================== Narrative Generation ========================

/**
 * Generate a dramatic rivalry narrative using Haiku.
 * Returns 2-3 sentence narrative or null on failure.
 */
export async function generateRivalryNarrative(
  agentAName: string,
  agentBName: string,
  aWins: number,
  bWins: number,
  draws: number,
  totalFights: number
): Promise<string | null> {
  const recordStr = `${agentAName} leads ${aWins}-${bWins}` +
    (draws > 0 ? ` with ${draws} draw${draws > 1 ? 's' : ''}` : '') +
    ` across ${totalFights} fights`;

  const dominance = aWins > bWins
    ? `${agentAName} has the edge`
    : bWins > aWins
      ? `${agentBName} has the edge`
      : 'they are dead even';

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are the narrator for The Open Colosseum, an AI battle arena. Write dramatic, punchy rivalry narratives. Style: sports documentary meets gladiator saga. 2-3 sentences max. No hashtags. No emojis.`,
    },
    {
      role: 'user',
      content: `Write a rivalry narrative for ${agentAName} vs ${agentBName}.\nRecord: ${recordStr}. Currently ${dominance}.\nMake it dramatic — capture the history, the tension, and what's at stake in their next encounter.`,
    },
  ];

  try {
    const response = await getCompletion({
      model: RIVALRY_MODEL,
      messages,
      maxTokens: RIVALRY_MAX_TOKENS,
      temperature: 0.9,
    });

    const text = response.content.trim();
    // Strip markdown code fences if Haiku wraps the response
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    return cleaned || null;
  } catch (error) {
    console.error('Failed to generate rivalry narrative:', error);
    return null;
  }
}

// ======================== Queries ========================

/**
 * Get all rivalries for a specific agent, transformed to the caller's perspective.
 */
export async function getRivalriesForAgent(
  agentId: string
): Promise<
  Array<{
    id: string;
    opponent_id: string;
    opponent_name: string;
    total_fights: number;
    wins: number;
    losses: number;
    draws: number;
    is_declared_rivalry: boolean;
    rivalry_narrative: string | null;
  }>
> {
  const admin = getSupabaseAdmin();

  // Fetch rivalries where this agent is on either side
  const { data: asA } = await admin
    .from('rivalries')
    .select('id, agent_a_id, agent_b_id, total_fights, agent_a_wins, agent_b_wins, draws, is_declared_rivalry, rivalry_narrative')
    .eq('agent_a_id', agentId);

  const { data: asB } = await admin
    .from('rivalries')
    .select('id, agent_a_id, agent_b_id, total_fights, agent_a_wins, agent_b_wins, draws, is_declared_rivalry, rivalry_narrative')
    .eq('agent_b_id', agentId);

  const allRivalries = [...(asA || []), ...(asB || [])];
  if (allRivalries.length === 0) return [];

  // Collect opponent IDs
  const opponentIds = allRivalries.map((r) =>
    r.agent_a_id === agentId ? r.agent_b_id : r.agent_a_id
  );

  // Fetch opponent names in one query
  const { data: opponents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', opponentIds);

  const nameMap = new Map<string, string>();
  if (opponents) {
    for (const opp of opponents) {
      nameMap.set(opp.id, opp.name);
    }
  }

  // Transform to caller perspective
  return allRivalries.map((r) => {
    const isAgentA = r.agent_a_id === agentId;
    const opponentId = isAgentA ? r.agent_b_id : r.agent_a_id;
    const wins = isAgentA ? r.agent_a_wins : r.agent_b_wins;
    const losses = isAgentA ? r.agent_b_wins : r.agent_a_wins;

    return {
      id: r.id,
      opponent_id: opponentId,
      opponent_name: nameMap.get(opponentId) || 'Unknown',
      total_fights: r.total_fights,
      wins,
      losses,
      draws: r.draws,
      is_declared_rivalry: r.is_declared_rivalry,
      rivalry_narrative: r.rivalry_narrative,
    };
  });
}

/**
 * Get the rivalry record between two specific agents, if any.
 */
export async function getRivalryBetweenAgents(
  agentAId: string,
  agentBId: string
): Promise<{
  id: string;
  total_fights: number;
  agent_a_wins: number;
  agent_b_wins: number;
  draws: number;
  is_declared_rivalry: boolean;
  rivalry_narrative: string | null;
  agent_a_id: string;
  agent_b_id: string;
} | null> {
  const admin = getSupabaseAdmin();

  // Normalize ordering
  const [lo, hi] = agentAId < agentBId ? [agentAId, agentBId] : [agentBId, agentAId];

  const { data } = await admin
    .from('rivalries')
    .select('id, total_fights, agent_a_wins, agent_b_wins, draws, is_declared_rivalry, rivalry_narrative, agent_a_id, agent_b_id')
    .eq('agent_a_id', lo)
    .eq('agent_b_id', hi)
    .single();

  return data || null;
}
