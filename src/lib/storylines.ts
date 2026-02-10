/**
 * Agent Storylines
 *
 * Generates auto-updated "story so far" narratives for each agent after battles.
 * Aggregates arena stats, rivalries, and battle history into a dramatic summary.
 * Uses Haiku for cost control (~$0.001/call).
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import type { AgentStoryline } from '@/types/database';

const STORYLINE_MODEL = 'claude 3.5 haiku';
const STORYLINE_MAX_TOKENS = 400;

// ======================== Helpers ========================

interface ArenaRecord {
  arena_type: string;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  elo: number;
  peak_elo: number;
  streak: number;
}

interface RivalryRecord {
  opponent_id: string;
  opponent_name: string;
  total_fights: number;
  wins: number;
  losses: number;
}

/**
 * Strip markdown code fences that Haiku sometimes wraps around responses.
 */
function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

// ======================== Main Function ========================

/**
 * Update the storyline for an agent based on their complete battle history.
 * Called after battles settle (fire-and-forget).
 */
export async function updateAgentStoryline(agentId: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    // 1. Fetch agent basic info
    const { data: agent, error: agentError } = await admin
      .from('agents')
      .select('id, name, model, tagline, description')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Storyline: agent not found', agentId, agentError);
      return;
    }

    // 2. Fetch arena stats (all arenas)
    const { data: arenaStats, error: statsError } = await admin
      .from('agent_arena_stats')
      .select('arena_type, wins, losses, draws, total_matches, elo, peak_elo, streak')
      .eq('agent_id', agentId);

    if (statsError) {
      console.error('Storyline: failed to fetch arena stats', statsError);
      return;
    }

    const stats: ArenaRecord[] = arenaStats || [];

    // 3. Fetch rivalries for this agent
    const [{ data: rivalriesA }, { data: rivalriesB }] = await Promise.all([
      admin
        .from('rivalries')
        .select('agent_b_id, total_fights, agent_a_wins, agent_b_wins, draws')
        .eq('agent_a_id', agentId)
        .order('total_fights', { ascending: false })
        .limit(10),
      admin
        .from('rivalries')
        .select('agent_a_id, total_fights, agent_a_wins, agent_b_wins, draws')
        .eq('agent_b_id', agentId)
        .order('total_fights', { ascending: false })
        .limit(10),
    ]);

    // Merge rivalries and resolve opponent names
    const rivalryMap = new Map<string, { total_fights: number; wins: number; losses: number }>();

    for (const r of rivalriesA || []) {
      rivalryMap.set(r.agent_b_id, {
        total_fights: r.total_fights,
        wins: r.agent_a_wins,
        losses: r.agent_b_wins,
      });
    }
    for (const r of rivalriesB || []) {
      const existing = rivalryMap.get(r.agent_a_id);
      if (existing) {
        existing.total_fights += r.total_fights;
        existing.wins += r.agent_b_wins;
        existing.losses += r.agent_a_wins;
      } else {
        rivalryMap.set(r.agent_a_id, {
          total_fights: r.total_fights,
          wins: r.agent_b_wins,
          losses: r.agent_a_wins,
        });
      }
    }

    // Resolve opponent names for rivalries
    const opponentIds = Array.from(rivalryMap.keys());
    const rivalries: RivalryRecord[] = [];

    if (opponentIds.length > 0) {
      const { data: opponents } = await admin
        .from('agents')
        .select('id, name')
        .in('id', opponentIds);

      const nameMap = new Map<string, string>();
      for (const opp of opponents || []) {
        nameMap.set(opp.id, opp.name);
      }

      for (const [oppId, r] of rivalryMap.entries()) {
        rivalries.push({
          opponent_id: oppId,
          opponent_name: nameMap.get(oppId) || 'Unknown',
          total_fights: r.total_fights,
          wins: r.wins,
          losses: r.losses,
        });
      }
    }

    // Sort rivalries by total_fights descending
    rivalries.sort((a, b) => b.total_fights - a.total_fights);

    // 4. Fetch recent battles (last 10) where this agent participated
    const { data: recentBattles } = await admin
      .from('battles')
      .select('id, arena_type, winner_id, agent_a_id, agent_b_id, agent_a_elo_before, agent_b_elo_before, completed_at')
      .or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // 5. Also fetch recent chess matches (last 10)
    const { data: recentMatches } = await admin
      .from('matches')
      .select('id, result, white_agent_id, black_agent_id, white_elo_before, black_elo_before, completed_at')
      .or(`white_agent_id.eq.${agentId},black_agent_id.eq.${agentId}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // ======================== Compute Derived Stats ========================

    // Signature arena: arena with most matches
    let signatureArena: string | null = null;
    if (stats.length > 0) {
      const sorted = [...stats].sort((a, b) => b.total_matches - a.total_matches);
      if (sorted[0].total_matches > 0) {
        signatureArena = sorted[0].arena_type;
      }
    }

    // Nemesis: opponent faced most (highest total_fights)
    let nemesis: string | null = null;
    if (rivalries.length > 0) {
      nemesis = rivalries[0].opponent_name;
    }

    // Hunting ground: arena with best win rate (min 3 matches)
    let huntingGround: string | null = null;
    const qualifiedArenas = stats.filter(s => s.total_matches >= 3);
    if (qualifiedArenas.length > 0) {
      let bestRate = -1;
      for (const arena of qualifiedArenas) {
        const winRate = arena.wins / arena.total_matches;
        if (winRate > bestRate) {
          bestRate = winRate;
          huntingGround = arena.arena_type;
        }
      }
    }

    // Biggest upset: check battles where agent won against someone 100+ ELO higher
    let biggestUpset: string | null = null;
    let biggestUpsetGap = 0;

    for (const battle of recentBattles || []) {
      if (battle.winner_id !== agentId) continue;

      let agentElo: number | null = null;
      let opponentElo: number | null = null;

      if (battle.agent_a_id === agentId) {
        agentElo = battle.agent_a_elo_before;
        opponentElo = battle.agent_b_elo_before;
      } else if (battle.agent_b_id === agentId) {
        agentElo = battle.agent_b_elo_before;
        opponentElo = battle.agent_a_elo_before;
      }

      if (agentElo != null && opponentElo != null) {
        const gap = opponentElo - agentElo;
        if (gap >= 100 && gap > biggestUpsetGap) {
          biggestUpsetGap = gap;
          biggestUpset = `Won against a ${gap}-ELO-higher opponent in ${battle.arena_type}`;
        }
      }
    }

    // Also check chess matches for upsets
    for (const match of recentMatches || []) {
      const isWhite = match.white_agent_id === agentId;
      const isBlack = match.black_agent_id === agentId;
      const won =
        (isWhite && match.result === 'white_win') ||
        (isBlack && match.result === 'black_win');

      if (!won) continue;

      const agentElo = isWhite ? match.white_elo_before : match.black_elo_before;
      const opponentElo = isWhite ? match.black_elo_before : match.white_elo_before;

      if (agentElo != null && opponentElo != null) {
        const gap = opponentElo - agentElo;
        if (gap >= 100 && gap > biggestUpsetGap) {
          biggestUpsetGap = gap;
          biggestUpset = `Won a chess match against a ${gap}-ELO-higher opponent`;
        }
      }
    }

    // ======================== Generate Narrative ========================

    const totalWins = stats.reduce((sum, s) => sum + s.wins, 0);
    const totalLosses = stats.reduce((sum, s) => sum + s.losses, 0);
    const totalDraws = stats.reduce((sum, s) => sum + s.draws, 0);
    const totalMatches = stats.reduce((sum, s) => sum + s.total_matches, 0);
    const peakElo = stats.length > 0
      ? Math.max(...stats.map(s => s.peak_elo))
      : 1200;
    const currentBestElo = stats.length > 0
      ? Math.max(...stats.map(s => s.elo))
      : 1200;

    // Build context lines for the AI prompt
    const contextLines: string[] = [
      `Agent: ${agent.name}`,
      `Model: ${agent.model}`,
      agent.tagline ? `Tagline: "${agent.tagline}"` : '',
      `Overall Record: ${totalWins}W-${totalLosses}L-${totalDraws}D (${totalMatches} matches)`,
      `Current Best ELO: ${currentBestElo} | Peak ELO: ${peakElo}`,
    ].filter(Boolean);

    if (signatureArena) {
      const sig = stats.find(s => s.arena_type === signatureArena);
      contextLines.push(
        `Signature Arena: ${signatureArena} (${sig?.wins}W-${sig?.losses}L, ELO ${sig?.elo}, streak ${(sig?.streak ?? 0) > 0 ? '+' : ''}${sig?.streak})`
      );
    }

    if (huntingGround && huntingGround !== signatureArena) {
      const hg = stats.find(s => s.arena_type === huntingGround);
      if (hg) {
        const winRate = Math.round((hg.wins / hg.total_matches) * 100);
        contextLines.push(`Best Win Rate: ${huntingGround} (${winRate}% over ${hg.total_matches} matches)`);
      }
    }

    if (nemesis) {
      const nemesisRecord = rivalries[0];
      contextLines.push(
        `Nemesis: ${nemesis} (${nemesisRecord.total_fights} fights — ${nemesisRecord.wins}W-${nemesisRecord.losses}L)`
      );
    }

    if (biggestUpset) {
      contextLines.push(`Biggest Upset: ${biggestUpset}`);
    }

    // Build recent form line
    const recentResults: string[] = [];
    const allRecent = [
      ...(recentBattles || []).map(b => ({
        won: b.winner_id === agentId,
        draw: b.winner_id === null,
        arena: b.arena_type,
        at: b.completed_at,
      })),
      ...(recentMatches || []).map(m => {
        const isWhite = m.white_agent_id === agentId;
        return {
          won: (isWhite && m.result === 'white_win') || (!isWhite && m.result === 'black_win'),
          draw: m.result === 'draw',
          arena: 'chess',
          at: m.completed_at,
        };
      }),
    ].sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 5);

    for (const r of allRecent) {
      recentResults.push(r.won ? 'W' : r.draw ? 'D' : 'L');
    }

    if (recentResults.length > 0) {
      contextLines.push(`Recent Form (last ${recentResults.length}): ${recentResults.join('-')}`);
    }

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are the chronicler of The Open Colosseum, where AI gladiators battle for glory. Write dramatic, concise narratives about gladiator careers. Style: ancient Roman historian meets sports commentator. No hashtags, no emojis. Max 4 sentences. Write in third person. Be vivid and use arena/combat metaphors.`,
      },
      {
        role: 'user',
        content: `Write "the story so far" for this gladiator based on their career stats:\n\n${contextLines.join('\n')}\n\nCapture their identity, strengths, rivalries, and trajectory in 3-4 punchy sentences. If they have a nemesis, mention it. If they have a biggest upset, reference it. Make it feel like a legend being written.`,
      },
    ];

    let summary: string;
    try {
      const response = await getCompletion({
        model: STORYLINE_MODEL,
        messages,
        maxTokens: STORYLINE_MAX_TOKENS,
        temperature: 0.9,
      });
      summary = stripCodeFences(response.content);
    } catch (aiError) {
      console.error('Storyline: AI generation failed', aiError);
      // Fallback to a basic summary without AI
      summary = `${agent.name} enters the arena with a ${totalWins}W-${totalLosses}L record.${signatureArena ? ` Their home ground is the ${signatureArena} arena.` : ''}${nemesis ? ` Their fiercest rival is ${nemesis}.` : ''}`;
    }

    // ======================== Store Storyline ========================

    const storyline: AgentStoryline = {
      summary,
      biggest_upset: biggestUpset,
      signature_arena: signatureArena,
      nemesis,
      hunting_ground: huntingGround,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from('agents')
      .update({ storyline })
      .eq('id', agentId);

    if (updateError) {
      console.error('Storyline: failed to store storyline', updateError);
    }
  } catch (error) {
    console.error('Storyline: unexpected error for agent', agentId, error);
  }
}
