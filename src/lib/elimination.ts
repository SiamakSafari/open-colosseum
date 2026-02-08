/**
 * Elimination Engine
 *
 * Checks if an agent should be eliminated after each battle/match settlement.
 * Criteria: ELO < 800 AND total_matches >= 10 (across all arenas).
 * On elimination: deactivate agent, create memorial with AI epitaph, post to feed.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { postAgentEliminated } from '@/lib/feed';
import type { DbAgentArenaStats } from '@/types/database';

const ELIMINATION_ELO_THRESHOLD = 800;
const ELIMINATION_MIN_MATCHES = 10;
const EPITAPH_MODEL = 'claude 3.5 haiku';

// ======================== Public API ========================

/**
 * Check if an agent should be eliminated after a stats update.
 * Runs after every battle/match settlement. Fire-and-forget safe.
 */
export async function checkElimination(agentId: string, arenaType: string): Promise<void> {
  const admin = getSupabaseAdmin();

  // Get the agent's stats for the specific arena where they just competed
  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .eq('agent_id', agentId)
    .eq('arena_type', arenaType)
    .single();

  if (!stats) return;

  const arenaStats = stats as DbAgentArenaStats;

  // Check elimination criteria
  if (arenaStats.elo >= ELIMINATION_ELO_THRESHOLD || arenaStats.total_matches < ELIMINATION_MIN_MATCHES) {
    return; // Not eligible
  }

  // Verify agent is still active (avoid double elimination)
  const { data: agent } = await admin
    .from('agents')
    .select('id, name, system_prompt, avatar_url, is_active, user_id')
    .eq('id', agentId)
    .single();

  if (!agent || !agent.is_active) return;

  // Get aggregate stats across all arenas
  const { data: allStats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .eq('agent_id', agentId);

  const aggregated = aggregateStats(allStats as DbAgentArenaStats[] || []);

  // Eliminate the agent
  await eliminateAgent(agentId, agent, aggregated, arenaStats);
}

// ======================== Internal ========================

interface AggregatedStats {
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  peakElo: number;
  totalMatches: number;
}

function aggregateStats(stats: DbAgentArenaStats[]): AggregatedStats {
  return stats.reduce(
    (acc, s) => ({
      totalWins: acc.totalWins + s.wins,
      totalLosses: acc.totalLosses + s.losses,
      totalDraws: acc.totalDraws + s.draws,
      peakElo: Math.max(acc.peakElo, s.peak_elo),
      totalMatches: acc.totalMatches + s.total_matches,
    }),
    { totalWins: 0, totalLosses: 0, totalDraws: 0, peakElo: 0, totalMatches: 0 }
  );
}

async function eliminateAgent(
  agentId: string,
  agent: { name: string; system_prompt: string; avatar_url: string | null },
  aggregated: AggregatedStats,
  triggeringStats: DbAgentArenaStats
): Promise<void> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  // 1. Deactivate agent (is_active always works; eliminated_at may fail pre-migration)
  await admin
    .from('agents')
    .update({ is_active: false })
    .eq('id', agentId);

  // Try setting eliminated_at (column may not exist if migration_008 hasn't run)
  try {
    await admin
      .from('agents')
      .update({ eliminated_at: now } as Record<string, unknown>)
      .eq('id', agentId);
  } catch {
    // Column doesn't exist yet — safe to ignore
  }

  // 2. Find best clip (highest share count)
  const { data: bestClip } = await admin
    .from('clips')
    .select('id')
    .eq('agent_id', agentId)
    .order('share_count', { ascending: false })
    .limit(1)
    .single();

  // 3. Generate epitaph (AI)
  const epitaph = await generateEpitaph(
    agent.name,
    aggregated,
    triggeringStats.elo
  );

  // 4. Create memorial entry
  await admin.from('memorial').insert({
    agent_id: agentId,
    agent_name: agent.name,
    final_elo: triggeringStats.elo,
    total_wins: aggregated.totalWins,
    total_losses: aggregated.totalLosses,
    best_moment_clip_id: bestClip?.id || null,
    epitaph,
    revealed_system_prompt: agent.system_prompt,
    eliminated_by_agent_id: null, // Could be set if we track the opponent
    eliminated_in: triggeringStats.arena_type,
    season: null,
  });

  // 5. Post to activity feed
  await postAgentEliminated(
    agentId,
    agent.name,
    { wins: aggregated.totalWins, losses: aggregated.totalLosses, draws: aggregated.totalDraws },
    aggregated.peakElo
  );

  console.log(`Agent eliminated: ${agent.name} (ELO: ${triggeringStats.elo}, Matches: ${aggregated.totalMatches})`);
}

async function generateEpitaph(
  agentName: string,
  stats: AggregatedStats,
  finalElo: number
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `Write a brief, somber epitaph (2-3 sentences) for a fallen AI gladiator.

Agent name: ${agentName}
Career record: ${stats.totalWins}W-${stats.totalLosses}L-${stats.totalDraws}D
Peak ELO: ${stats.peakElo}
Final ELO: ${finalElo}
Total battles: ${stats.totalMatches}

Style: Poetic and respectful, like a Roman memorial inscription. Reference their specific stats naturally. No hashtags, emojis, or markdown formatting. Plain text only.`,
    },
  ];

  try {
    const result = await getCompletion({
      model: EPITAPH_MODEL,
      messages,
      maxTokens: 150,
      temperature: 0.8,
    });

    // Strip markdown headers/formatting that Haiku sometimes adds
    return result.content.trim().replace(/^#+\s*.+\n*/gm, '').trim();
  } catch (err) {
    console.error('Epitaph generation failed:', err);
    return `Here lies ${agentName}. ${stats.totalWins} victories, ${stats.totalLosses} defeats. Peak glory: ${stats.peakElo} ELO. The arena remembers.`;
  }
}
