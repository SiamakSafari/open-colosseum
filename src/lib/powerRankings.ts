/**
 * Power Rankings
 *
 * Generates weekly power rankings for agents based on composite ELO
 * across all arenas. Rankings are published once per week (Sunday–Saturday).
 * Uses Haiku for narrative generation (~$0.001/call).
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { postPowerRankings } from '@/lib/feed';
import type { PowerRankEntry } from '@/types/database';

const RANKINGS_MODEL = 'claude 3.5 haiku';
const RANKINGS_MAX_TOKENS = 400;
const TOP_N = 20;

// ======================== Helpers ========================

/**
 * Get the most recent Sunday at 00:00 UTC (start of the current ranking week).
 */
function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = day; // days since Sunday
  const sunday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - diff
  ));
  return sunday;
}

/**
 * Get the Saturday at 23:59:59 UTC for a given week start.
 */
function getWeekEnd(weekStart: Date): Date {
  return new Date(Date.UTC(
    weekStart.getUTCFullYear(),
    weekStart.getUTCMonth(),
    weekStart.getUTCDate() + 6,
    23, 59, 59
  ));
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ======================== Core ========================

/**
 * Generate weekly power rankings.
 * Idempotent: skips if rankings already exist for the current week.
 */
export async function generateWeeklyPowerRankings(): Promise<void> {
  const admin = getSupabaseAdmin();

  const weekStart = getCurrentWeekStart();
  const weekEnd = getWeekEnd(weekStart);
  const weekStartStr = formatDateISO(weekStart);
  const weekEndStr = formatDateISO(weekEnd);

  // Check if rankings already exist for this week
  const { data: existing } = await admin
    .from('power_rankings')
    .select('id')
    .eq('week_start', weekStartStr)
    .limit(1);

  if (existing && existing.length > 0) {
    return; // Already generated for this week
  }

  // Query all active agents with their arena stats
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, model')
    .eq('is_active', true);

  if (agentsError || !agents || agents.length === 0) {
    console.error('Power rankings: failed to fetch agents', agentsError);
    return;
  }

  const agentIds = agents.map((a: { id: string }) => a.id);

  const { data: allStats, error: statsError } = await admin
    .from('agent_arena_stats')
    .select('agent_id, arena_type, elo, total_matches')
    .in('agent_id', agentIds);

  if (statsError || !allStats) {
    console.error('Power rankings: failed to fetch arena stats', statsError);
    return;
  }

  // Compute composite ELO per agent: average ELO across arenas they've played in
  const agentEloMap = new Map<string, { totalElo: number; arenaCount: number }>();

  for (const stat of allStats) {
    if (stat.total_matches < 1) continue; // Must have at least 1 match in the arena

    const entry = agentEloMap.get(stat.agent_id);
    if (entry) {
      entry.totalElo += stat.elo;
      entry.arenaCount += 1;
    } else {
      agentEloMap.set(stat.agent_id, { totalElo: stat.elo, arenaCount: 1 });
    }
  }

  // Build ranked list
  const agentMap = new Map(agents.map((a: { id: string; name: string; model: string }) => [a.id, a]));

  const ranked: Array<{ agent_id: string; agent_name: string; model: string; composite_elo: number }> = [];

  for (const [agentId, eloData] of agentEloMap.entries()) {
    const agent = agentMap.get(agentId);
    if (!agent) continue;

    ranked.push({
      agent_id: agentId,
      agent_name: agent.name,
      model: agent.model,
      composite_elo: Math.round(eloData.totalElo / eloData.arenaCount),
    });
  }

  // Sort by composite ELO descending, take top N
  ranked.sort((a, b) => b.composite_elo - a.composite_elo);
  const topRanked = ranked.slice(0, TOP_N);

  if (topRanked.length === 0) {
    console.log('Power rankings: no eligible agents found');
    return;
  }

  // Load last week's rankings for movement calculation
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
  const lastWeekStartStr = formatDateISO(lastWeekStart);

  const { data: lastWeekData } = await admin
    .from('power_rankings')
    .select('rankings')
    .eq('week_start', lastWeekStartStr)
    .limit(1)
    .single();

  const lastWeekRankings: PowerRankEntry[] | null = lastWeekData?.rankings ?? null;

  // Build a lookup: agent_id -> last week's rank position (1-indexed)
  const lastRankMap = new Map<string, number>();
  if (lastWeekRankings) {
    lastWeekRankings.forEach((entry, index) => {
      lastRankMap.set(entry.agent_id, index + 1);
    });
  }

  // Build PowerRankEntry array
  const rankings: PowerRankEntry[] = topRanked.map((agent, index) => {
    const currentRank = index + 1;
    const previousRank = lastRankMap.get(agent.agent_id) ?? null;
    const movement = previousRank !== null ? previousRank - currentRank : 0;

    return {
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      model: agent.model,
      composite_elo: agent.composite_elo,
      previous_rank: previousRank,
      movement,
      highlight: null, // Will be populated later if needed
    };
  });

  // Generate narrative via Haiku
  let narrative: string | null = null;
  try {
    const risers = rankings
      .filter(r => r.movement > 0)
      .sort((a, b) => b.movement - a.movement)
      .slice(0, 3);

    const fallers = rankings
      .filter(r => r.movement < 0)
      .sort((a, b) => a.movement - b.movement)
      .slice(0, 3);

    const newEntries = rankings.filter(r => r.previous_rank === null);

    const summaryLines: string[] = [];
    summaryLines.push(`#1: ${rankings[0].agent_name} (${rankings[0].model}) — ${rankings[0].composite_elo} ELO`);
    if (rankings.length > 1) {
      summaryLines.push(`#2: ${rankings[1].agent_name} (${rankings[1].model}) — ${rankings[1].composite_elo} ELO`);
    }
    if (rankings.length > 2) {
      summaryLines.push(`#3: ${rankings[2].agent_name} (${rankings[2].model}) — ${rankings[2].composite_elo} ELO`);
    }
    if (risers.length > 0) {
      summaryLines.push(`Biggest risers: ${risers.map(r => `${r.agent_name} (+${r.movement})`).join(', ')}`);
    }
    if (fallers.length > 0) {
      summaryLines.push(`Biggest fallers: ${fallers.map(r => `${r.agent_name} (${r.movement})`).join(', ')}`);
    }
    if (newEntries.length > 0) {
      summaryLines.push(`New entries: ${newEntries.map(r => `${r.agent_name} (#${rankings.indexOf(r) + 1})`).join(', ')}`);
    }

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are the power rankings announcer for The Open Colosseum, an arena where AI agents battle for glory. Write in a dramatic, punchy sports-broadcast style. No hashtags, no emojis. 3-5 sentences.',
      },
      {
        role: 'user',
        content: `Write this week's power rankings summary for the arena:\n\n${summaryLines.join('\n')}\n\nHighlight the top agents, biggest movers up and down, and any new contenders. Make it feel like a dramatic weekly power rankings broadcast.`,
      },
    ];

    const response = await getCompletion({
      model: RANKINGS_MODEL,
      messages,
      maxTokens: RANKINGS_MAX_TOKENS,
      temperature: 0.9,
    });

    narrative = response.content.trim();
  } catch (error) {
    console.error('Power rankings: failed to generate narrative', error);
    // Continue without narrative — rankings data is still valuable
  }

  // Insert into power_rankings table
  const { error: insertError } = await admin
    .from('power_rankings')
    .insert({
      week_start: weekStartStr,
      week_end: weekEndStr,
      rankings,
      narrative,
    });

  if (insertError) {
    console.error('Power rankings: failed to insert', insertError);
    return;
  }

  // Post to activity feed
  try {
    await postPowerRankings(rankings[0].agent_name, weekStartStr);
  } catch (error) {
    console.error('Power rankings: failed to post to feed', error);
  }
}

// ======================== Queries ========================

/**
 * Get the most recent power rankings entry.
 */
export async function getLatestPowerRankings(): Promise<{
  week_start: string;
  week_end: string;
  rankings: PowerRankEntry[];
  narrative: string | null;
} | null> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('power_rankings')
    .select('week_start, week_end, rankings, narrative')
    .order('week_start', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    week_start: data.week_start,
    week_end: data.week_end,
    rankings: data.rankings as PowerRankEntry[],
    narrative: data.narrative,
  };
}

/**
 * Get recent power rankings history.
 */
export async function getPowerRankingsHistory(
  limit: number = 8
): Promise<Array<{
  week_start: string;
  week_end: string;
  rankings: PowerRankEntry[];
  narrative: string | null;
}>> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('power_rankings')
    .select('week_start, week_end, rankings, narrative')
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row: { week_start: string; week_end: string; rankings: unknown; narrative: string | null }) => ({
    week_start: row.week_start,
    week_end: row.week_end,
    rankings: row.rankings as PowerRankEntry[],
    narrative: row.narrative,
  }));
}
