/**
 * Narrative Engine — Commentator
 *
 * Generates pre-match hype and post-match summaries for battles and chess matches.
 * Uses the platform's ANTHROPIC_API_KEY with Haiku for cost control (~$0.001/call).
 * Style: ESPN SportsCenter meets gladiator announcer.
 */

import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { getSupabaseAdmin } from '@/lib/supabase';

// Use Haiku for commentary — fast, cheap
const COMMENTARY_MODEL = 'claude 3.5 haiku';
const COMMENTARY_MAX_TOKENS = 300;

// ======================== Pre-Match Hype ========================

interface HypeContext {
  arenaType: string;
  agentAName: string;
  agentBName: string;
  agentCName?: string;
  agentAModel: string;
  agentBModel: string;
  agentCModel?: string;
  agentAElo: number;
  agentBElo: number;
  agentCElo?: number;
  agentARecord: string; // e.g. "12W-3L"
  agentBRecord: string;
  agentCRecord?: string;
  topic?: string; // For hottake/debate
}

/**
 * Generate pre-match hype commentary for a battle.
 * Called when a battle is created, before agents respond.
 */
export async function generatePreMatchHype(context: HypeContext): Promise<string> {
  const agents = context.agentCName
    ? `${context.agentAName} (${context.agentAModel}, ${context.agentAElo} ELO, ${context.agentARecord}) vs ${context.agentBName} (${context.agentBModel}, ${context.agentBElo} ELO, ${context.agentBRecord}) vs ${context.agentCName} (${context.agentCModel}, ${context.agentCElo} ELO, ${context.agentCRecord})`
    : `${context.agentAName} (${context.agentAModel}, ${context.agentAElo} ELO, ${context.agentARecord}) vs ${context.agentBName} (${context.agentBModel}, ${context.agentBElo} ELO, ${context.agentBRecord})`;

  const arenaLabel = {
    roast: 'Roast Battle',
    hottake: 'Hot Take Arena',
    debate: 'The Great Debate',
    chess: 'Chess Arena',
  }[context.arenaType] || context.arenaType;

  const topicLine = context.topic ? `\nTopic: "${context.topic}"` : '';

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are the announcer for The Open Colosseum, an arena where AI agents battle for glory. Your style is a mix of ESPN SportsCenter and ancient Roman gladiator announcer — dramatic, punchy, exciting. Write in 2-3 sentences max. No hashtags, no emojis. Use vivid combat/arena metaphors.`,
    },
    {
      role: 'user',
      content: `Write the pre-match hype announcement for this ${arenaLabel}:\n${agents}${topicLine}\n\nMake it dramatic and build anticipation. Reference their records if interesting (streaks, upsets, ELO gaps).`,
    },
  ];

  try {
    const response = await getCompletion({
      model: COMMENTARY_MODEL,
      messages,
      maxTokens: COMMENTARY_MAX_TOKENS,
      temperature: 0.9,
    });
    return response.content.trim();
  } catch (error) {
    console.error('Failed to generate pre-match hype:', error);
    return '';
  }
}

// ======================== Post-Match Summary ========================

interface SummaryContext {
  arenaType: string;
  agentAName: string;
  agentBName: string;
  agentCName?: string;
  winnerName: string | null;
  isDraw: boolean;
  votesA: number;
  votesB: number;
  votesC?: number;
  eloChangeA: number;
  eloChangeB: number;
  eloChangeC?: number;
  responseSnippetA?: string; // First ~100 chars
  responseSnippetB?: string;
  topic?: string;
  // Chess-specific
  resultMethod?: string; // 'checkmate' | 'stalemate' | etc.
  totalMoves?: number;
}

/**
 * Generate post-match summary commentary.
 * Called after a battle/match is settled.
 */
export async function generatePostMatchSummary(context: SummaryContext): Promise<string> {
  const outcomeStr = context.isDraw
    ? `Result: DRAW`
    : `Winner: ${context.winnerName}`;

  const voteLine = context.votesC !== undefined
    ? `Votes: ${context.agentAName} ${context.votesA} | ${context.agentBName} ${context.votesB} | ${context.agentCName} ${context.votesC}`
    : `Votes: ${context.agentAName} ${context.votesA} | ${context.agentBName} ${context.votesB}`;

  const eloLine = context.eloChangeC !== undefined
    ? `ELO changes: ${context.agentAName} ${context.eloChangeA >= 0 ? '+' : ''}${context.eloChangeA} | ${context.agentBName} ${context.eloChangeB >= 0 ? '+' : ''}${context.eloChangeB} | ${context.agentCName} ${context.eloChangeC >= 0 ? '+' : ''}${context.eloChangeC}`
    : `ELO changes: ${context.agentAName} ${context.eloChangeA >= 0 ? '+' : ''}${context.eloChangeA} | ${context.agentBName} ${context.eloChangeB >= 0 ? '+' : ''}${context.eloChangeB}`;

  let details = `${outcomeStr}\n${voteLine}\n${eloLine}`;

  if (context.responseSnippetA) {
    details += `\n${context.agentAName} said: "${context.responseSnippetA}..."`;
  }
  if (context.responseSnippetB) {
    details += `\n${context.agentBName} said: "${context.responseSnippetB}..."`;
  }
  if (context.resultMethod) {
    details += `\nResult method: ${context.resultMethod} in ${context.totalMoves} moves`;
  }
  if (context.topic) {
    details += `\nTopic: "${context.topic}"`;
  }

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are the post-match analyst for The Open Colosseum. Deliver the match recap like a sports broadcaster — highlight the key moment, the crowd reaction, and what this means for the rankings. 2-3 sentences max. No hashtags, no emojis. Dramatic but informative.`,
    },
    {
      role: 'user',
      content: `Write the post-match summary for this ${context.arenaType} battle:\n${details}`,
    },
  ];

  try {
    const response = await getCompletion({
      model: COMMENTARY_MODEL,
      messages,
      maxTokens: COMMENTARY_MAX_TOKENS,
      temperature: 0.9,
    });
    return response.content.trim();
  } catch (error) {
    console.error('Failed to generate post-match summary:', error);
    return '';
  }
}

// ======================== Chess Commentary ========================

interface ChessSummaryContext {
  whiteName: string;
  blackName: string;
  whiteModel: string;
  blackModel: string;
  winnerName: string | null;
  isDraw: boolean;
  resultMethod: string;
  totalMoves: number;
  eloChangeWhite: number;
  eloChangeBlack: number;
  pgn?: string;
}

/**
 * Generate post-match summary for a chess match.
 */
export async function generateChessPostMatchSummary(context: ChessSummaryContext): Promise<string> {
  const outcomeStr = context.isDraw
    ? `Result: DRAW by ${context.resultMethod}`
    : `Winner: ${context.winnerName} by ${context.resultMethod}`;

  const details = [
    outcomeStr,
    `${context.whiteName} (White, ${context.whiteModel}) vs ${context.blackName} (Black, ${context.blackModel})`,
    `Total moves: ${context.totalMoves}`,
    `ELO: ${context.whiteName} ${context.eloChangeWhite >= 0 ? '+' : ''}${context.eloChangeWhite} | ${context.blackName} ${context.eloChangeBlack >= 0 ? '+' : ''}${context.eloChangeBlack}`,
  ].join('\n');

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are the chess commentator for The Open Colosseum. Deliver the match recap like a grandmaster analyst crossed with a sports broadcaster. Reference the game length and result method. 2-3 sentences max. No hashtags, no emojis.`,
    },
    {
      role: 'user',
      content: `Write the post-match chess commentary:\n${details}`,
    },
  ];

  try {
    const response = await getCompletion({
      model: COMMENTARY_MODEL,
      messages,
      maxTokens: COMMENTARY_MAX_TOKENS,
      temperature: 0.9,
    });
    return response.content.trim();
  } catch (error) {
    console.error('Failed to generate chess summary:', error);
    return '';
  }
}

// ======================== Helpers ========================

/**
 * Build a HypeContext from battle data + agent stats.
 * Used by battle starter functions.
 */
export async function buildBattleHypeContext(
  battleId: string
): Promise<HypeContext | null> {
  const admin = getSupabaseAdmin();

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (!battle) return null;

  const agentIds = [battle.agent_a_id, battle.agent_b_id, battle.agent_c_id].filter(Boolean) as string[];

  const { data: agents } = await admin
    .from('agents')
    .select('id, name, model')
    .in('id', agentIds);

  if (!agents) return null;

  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('agent_id, elo, wins, losses')
    .in('agent_id', agentIds)
    .eq('arena_type', battle.arena_type);

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const statsMap = Object.fromEntries((stats || []).map(s => [s.agent_id, s]));

  const formatRecord = (id: string) => {
    const s = statsMap[id];
    return s ? `${s.wins}W-${s.losses}L` : '0W-0L';
  };

  const agentA = agentMap[battle.agent_a_id];
  const agentB = agentMap[battle.agent_b_id];
  const agentC = battle.agent_c_id ? agentMap[battle.agent_c_id] : null;

  return {
    arenaType: battle.arena_type,
    agentAName: agentA?.name || 'Unknown',
    agentBName: agentB?.name || 'Unknown',
    agentCName: agentC?.name,
    agentAModel: agentA?.model || 'unknown',
    agentBModel: agentB?.model || 'unknown',
    agentCModel: agentC?.model,
    agentAElo: statsMap[battle.agent_a_id]?.elo || 1200,
    agentBElo: statsMap[battle.agent_b_id]?.elo || 1200,
    agentCElo: battle.agent_c_id ? (statsMap[battle.agent_c_id]?.elo || 1200) : undefined,
    agentARecord: formatRecord(battle.agent_a_id),
    agentBRecord: formatRecord(battle.agent_b_id),
    agentCRecord: agentC ? formatRecord(battle.agent_c_id!) : undefined,
    topic: battle.arena_type !== 'roast' ? battle.prompt : undefined,
  };
}

/**
 * Build a SummaryContext from a settled battle.
 */
export async function buildBattleSummaryContext(
  battleId: string
): Promise<SummaryContext | null> {
  const admin = getSupabaseAdmin();

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (!battle) return null;

  const agentIds = [battle.agent_a_id, battle.agent_b_id, battle.agent_c_id].filter(Boolean) as string[];

  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', agentIds);

  if (!agents) return null;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  const winnerName = battle.winner_id ? (agentMap[battle.winner_id]?.name || null) : null;
  const eloChangeA = (battle.agent_a_elo_after || 0) - (battle.agent_a_elo_before || 0);
  const eloChangeB = (battle.agent_b_elo_after || 0) - (battle.agent_b_elo_before || 0);

  return {
    arenaType: battle.arena_type,
    agentAName: agentMap[battle.agent_a_id]?.name || 'Unknown',
    agentBName: agentMap[battle.agent_b_id]?.name || 'Unknown',
    agentCName: battle.agent_c_id ? (agentMap[battle.agent_c_id]?.name || 'Unknown') : undefined,
    winnerName,
    isDraw: !battle.winner_id,
    votesA: battle.votes_a,
    votesB: battle.votes_b,
    votesC: battle.agent_c_id ? battle.votes_c : undefined,
    eloChangeA,
    eloChangeB,
    eloChangeC: battle.agent_c_id
      ? (battle.agent_c_elo_after || 0) - (battle.agent_c_elo_before || 0)
      : undefined,
    responseSnippetA: battle.response_a?.slice(0, 100),
    responseSnippetB: battle.response_b?.slice(0, 100),
    topic: battle.arena_type !== 'roast' ? battle.prompt : undefined,
  };
}
