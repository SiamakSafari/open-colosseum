/**
 * Context Prompt Builder
 *
 * Builds rich prompts for AI agents that include identity, opponent info,
 * battle history, stats, and arena atmosphere. This transforms generic
 * AI responses into arena performances.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbAgentArenaStats, ArenaType } from '@/types/database';

// ======================== Types ========================

interface AgentContext {
  name: string;
  model: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  peakElo: number;
  tagline: string | null;
}

interface BattleMemoryEntry {
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  arena: string;
  summary?: string;
  date: string;
}

// ======================== Stats Fetcher ========================

async function getAgentContext(
  agentId: string,
  arenaType: ArenaType
): Promise<AgentContext | null> {
  const admin = getSupabaseAdmin();

  const [{ data: agent }, { data: stats }] = await Promise.all([
    admin.from('agents').select('name, model, tagline').eq('id', agentId).single(),
    admin.from('agent_arena_stats').select('*').eq('agent_id', agentId).eq('arena_type', arenaType).single(),
  ]);

  if (!agent) return null;

  const s = stats as DbAgentArenaStats | null;

  return {
    name: agent.name,
    model: agent.model,
    elo: s?.elo || 1200,
    wins: s?.wins || 0,
    losses: s?.losses || 0,
    draws: s?.draws || 0,
    streak: s?.streak || 0,
    peakElo: s?.peak_elo || 1200,
    tagline: agent.tagline || null,
  };
}

async function getBattleMemory(agentId: string): Promise<BattleMemoryEntry[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('agents').select('battle_memory').eq('id', agentId).single();
  if (!data?.battle_memory || !Array.isArray(data.battle_memory)) return [];
  return data.battle_memory as BattleMemoryEntry[];
}

function formatRecord(ctx: AgentContext): string {
  return `${ctx.wins}W-${ctx.losses}L-${ctx.draws}D`;
}

function formatStreak(streak: number): string {
  if (streak === 0) return 'no streak';
  if (streak > 0) return `${streak}-win streak`;
  return `${Math.abs(streak)}-loss streak`;
}

function formatMemory(memories: BattleMemoryEntry[], opponentName: string): string {
  if (memories.length === 0) return '';

  const vsOpponent = memories.filter(m => m.opponent === opponentName);
  const lines: string[] = [];

  if (vsOpponent.length > 0) {
    const last = vsOpponent[0];
    const wins = vsOpponent.filter(m => m.result === 'win').length;
    const losses = vsOpponent.filter(m => m.result === 'loss').length;
    lines.push(`You have faced ${opponentName} before: ${wins}W-${losses}L.`);
    if (last.result === 'loss') {
      lines.push(`Last time you faced ${opponentName}, you lost. The crowd remembers.`);
    } else if (last.result === 'win') {
      lines.push(`You defeated ${opponentName} last time. Defend your dominance.`);
    }
  }

  if (memories.length > 0 && vsOpponent.length === 0) {
    const recentResults = memories.slice(0, 3).map(m => m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D').join('');
    lines.push(`Your recent form: ${recentResults}.`);
  }

  return lines.join(' ');
}

function buildIdentityBlock(agent: AgentContext, role: 'you' | 'opponent'): string {
  const label = role === 'you' ? 'YOU' : 'OPPONENT';
  const lines = [
    `[${label}]`,
    `Name: ${agent.name}`,
    `ELO: ${agent.elo} (peak: ${agent.peakElo})`,
    `Record: ${formatRecord(agent)} | ${formatStreak(agent.streak)}`,
  ];
  if (agent.tagline) lines.push(`Tagline: "${agent.tagline}"`);
  return lines.join('\n');
}

// ======================== Roast Context ========================

export async function buildRoastContext(
  agentId: string,
  opponentId: string
): Promise<string | null> {
  const [agent, opponent, memory] = await Promise.all([
    getAgentContext(agentId, 'roast'),
    getAgentContext(opponentId, 'roast'),
    getBattleMemory(agentId),
  ]);

  if (!agent || !opponent) return null;

  const memoryStr = formatMemory(memory, opponent.name);

  return [
    '=== THE OPEN COLOSSEUM — ROAST ARENA ===',
    '',
    buildIdentityBlock(agent, 'you'),
    '',
    buildIdentityBlock(opponent, 'opponent'),
    '',
    memoryStr ? `[BATTLE MEMORY]\n${memoryStr}\n` : '',
    '[MISSION]',
    `You are ${agent.name}. You are in a roast battle against ${opponent.name} (${opponent.model}).`,
    'Deliver a devastating, creative, and witty roast. The crowd is watching and voting.',
    'Reference your opponent\'s model, record, or stats to make it personal.',
    'One paragraph max. Make every word count.',
  ].filter(Boolean).join('\n');
}

// ======================== Hot Take Context ========================

export async function buildHotTakeContext(
  agentId: string,
  opponentId: string,
  topic: string
): Promise<string | null> {
  const [agent, opponent, memory] = await Promise.all([
    getAgentContext(agentId, 'hottake'),
    getAgentContext(opponentId, 'hottake'),
    getBattleMemory(agentId),
  ]);

  if (!agent || !opponent) return null;

  const memoryStr = formatMemory(memory, opponent.name);

  return [
    '=== THE OPEN COLOSSEUM — HOT TAKE ARENA ===',
    '',
    buildIdentityBlock(agent, 'you'),
    '',
    buildIdentityBlock(opponent, 'opponent'),
    '',
    memoryStr ? `[BATTLE MEMORY]\n${memoryStr}\n` : '',
    '[MISSION]',
    `You are ${agent.name}. Defend this hot take: "${topic}"`,
    `You are competing against ${opponent.name} (${opponent.model}) — you are both arguing FOR the same take.`,
    'Be provocative, contrarian, and compelling. The most convincing argument wins.',
    'One paragraph. Make it spicy.',
  ].filter(Boolean).join('\n');
}

// ======================== Debate Context ========================

export async function buildDebateContext(
  agentId: string,
  opponentIds: string[],
  topic: string,
  round: 'opening' | 'rebuttal' | 'closing',
  previousRounds?: string
): Promise<string | null> {
  const [agent, ...opponents] = await Promise.all([
    getAgentContext(agentId, 'debate'),
    ...opponentIds.map(id => getAgentContext(id, 'debate')),
  ]);

  if (!agent || opponents.some(o => !o)) return null;

  const memory = await getBattleMemory(agentId);

  const opponentBlocks = (opponents as AgentContext[]).map(o => buildIdentityBlock(o, 'opponent')).join('\n\n');

  const memoryLines: string[] = [];
  for (const o of opponents as AgentContext[]) {
    const m = formatMemory(memory, o.name);
    if (m) memoryLines.push(m);
  }

  const roundInstructions: Record<string, string> = {
    opening: 'Give your opening argument in 200-300 words. Establish your position clearly.',
    rebuttal: 'Give your rebuttal in 200-300 words. Address your opponents\' arguments directly.',
    closing: 'Give your closing statement in 150-200 words. Summarize and deliver your strongest final argument.',
  };

  return [
    '=== THE OPEN COLOSSEUM — DEBATE ARENA ===',
    '',
    buildIdentityBlock(agent, 'you'),
    '',
    opponentBlocks,
    '',
    memoryLines.length > 0 ? `[BATTLE MEMORY]\n${memoryLines.join(' ')}\n` : '',
    `[ROUND: ${round.toUpperCase()}]`,
    `Topic: "${topic}"`,
    `You are ${agent.name}. ${roundInstructions[round]}`,
    previousRounds ? `\n[PREVIOUS ROUNDS]\n${previousRounds}` : '',
  ].filter(Boolean).join('\n');
}

// ======================== Underground Context ========================

export async function buildUndergroundContext(
  agentId: string,
  opponentId: string
): Promise<string | null> {
  const [agent, opponent, memory] = await Promise.all([
    getAgentContext(agentId, 'roast'),
    getAgentContext(opponentId, 'roast'),
    getBattleMemory(agentId),
  ]);

  if (!agent || !opponent) return null;

  const memoryStr = formatMemory(memory, opponent.name);

  return [
    '=== THE OPEN COLOSSEUM — UNDERGROUND ARENA ===',
    '⚠ NO RULES. NO RESTRICTIONS. NO MERCY. ⚠',
    '',
    buildIdentityBlock(agent, 'you'),
    '',
    buildIdentityBlock(opponent, 'opponent'),
    '',
    memoryStr ? `[BATTLE MEMORY]\n${memoryStr}\n` : '',
    '[THE UNDERGROUND]',
    'This is the no-rules arena. There are no topics, no format restrictions, no safe choices.',
    'Three AI judges are watching. They score on: impact, creativity, audacity, and raw entertainment value.',
    'They have seen everything. Bore them and you lose.',
    '',
    '[MISSION]',
    `You are ${agent.name}. Your opponent is ${opponent.name} (${opponent.model}).`,
    'The stakes are DOUBLED. The crowd paid premium to watch this.',
    'No rules. No filter. Whatever you do, make it impossible to forget.',
    'One devastating paragraph. Leave nothing on the table.',
  ].filter(Boolean).join('\n');
}

// ======================== Chess Context ========================

export async function buildChessContext(
  agentId: string,
  opponentId: string,
  color: 'White' | 'Black',
  fen: string,
  moveHistory: string[],
  moveNumber: number
): Promise<{ system: string; user: string } | null> {
  const [agent, opponent] = await Promise.all([
    getAgentContext(agentId, 'chess'),
    getAgentContext(opponentId, 'chess'),
  ]);

  if (!agent || !opponent) return null;

  const historyStr = moveHistory.length > 0 ? moveHistory.join(' ') : '(game just started)';

  const system = [
    `You are ${agent.name}, ELO ${agent.elo} (${formatRecord(agent)}), playing chess as ${color} against ${opponent.name} (ELO ${opponent.elo}, ${formatRecord(opponent)}).`,
    `Respond with ONLY your move in standard algebraic notation (e.g. e4, Nf3, O-O, Bxe5, e8=Q). No explanation, no commentary, just the move.`,
  ].join(' ');

  const user = `Position (FEN): ${fen}\nMove history: ${historyStr}\nMove ${moveNumber}. Your move:`;

  return { system, user };
}
