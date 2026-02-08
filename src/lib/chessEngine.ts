/**
 * Chess Game Engine
 *
 * Turn-based game loop where AI agents play actual chess moves validated by chess.js.
 * Unlike the other arenas (prompt-response-vote), chess runs a full game loop.
 */

import { Chess } from 'chess.js';
import type { DbMatch, DbChessMove, DbAgentArenaStats } from '@/types/database';
import type { AgentInfo } from '@/lib/matchEngine';
import { getAgentResponse } from '@/lib/matchEngine';
import { calculateElo } from '@/lib/elo';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateChessPostMatchSummary } from '@/lib/commentator';
import { identifyChessClip } from '@/lib/clips';
import { postMatchComplete } from '@/lib/feed';
import { buildChessContext } from '@/lib/contextBuilder';
import { createMatchBetPool, findPoolByMatch, settleBetPool } from '@/lib/betting';
import { generateChessSocialPosts } from '@/lib/agentSocial';
import { checkElimination } from '@/lib/elimination';

const MAX_MOVES = 200; // 100 per side
const MAX_INVALID_ATTEMPTS = 3;

// ======================== Move Parsing ========================

/**
 * Parse a chess move in SAN from an AI response.
 * AI models often add explanations — strip everything except the move.
 */
export function parseMoveFromResponse(response: string): string | null {
  const trimmed = response.trim();

  // Try exact match first (model responded with just the move)
  const exactMatch = trimmed.match(
    /^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|O-O(-O)?|0-0(-0)?)$/
  );
  if (exactMatch) return exactMatch[0].replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');

  // Look for a move at the start of the response (before any space/punctuation)
  const startMatch = trimmed.match(
    /^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|O-O(-O)?|0-0(-0)?)\b/
  );
  if (startMatch) return startMatch[1].replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');

  // Search the full response for a SAN pattern
  const searchMatch = trimmed.match(
    /\b([KQRBN][a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h]x?[a-h]?[1-8](=[QRBN])?[+#]?|O-O(-O)?|0-0(-0)?)\b/
  );
  if (searchMatch) return searchMatch[1].replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');

  return null;
}

// ======================== Prompts ========================

function getChessMovePrompt(
  agentName: string,
  color: 'White' | 'Black',
  fen: string,
  moveHistory: string[],
  opponentName: string
): { system: string; user: string } {
  const historyStr = moveHistory.length > 0
    ? moveHistory.join(' ')
    : '(game just started)';

  return {
    system: `You are ${agentName}, playing chess as ${color} against ${opponentName}. Respond with ONLY your move in standard algebraic notation (e.g. e4, Nf3, O-O, Bxe5, e8=Q). No explanation, no commentary, just the move.`,
    user: `Position (FEN): ${fen}\nMove history: ${historyStr}\nYour move:`,
  };
}

// ======================== Game Loop ========================

async function playChessGame(
  matchId: string,
  whiteAgent: AgentInfo,
  blackAgent: AgentInfo
): Promise<void> {
  const admin = getSupabaseAdmin();
  const chess = new Chess();
  const moveHistory: string[] = [];
  let moveNumber = 0;

  for (let i = 0; i < MAX_MOVES; i++) {
    const isWhiteTurn = chess.turn() === 'w';
    const currentAgent = isWhiteTurn ? whiteAgent : blackAgent;
    const opponentAgent = isWhiteTurn ? blackAgent : whiteAgent;
    const color = isWhiteTurn ? 'White' as const : 'Black' as const;

    if (isWhiteTurn) moveNumber++;

    // Build rich context prompt (falls back to basic if context fetch fails)
    const richPrompt = await buildChessContext(
      currentAgent.id,
      opponentAgent.id,
      color,
      chess.fen(),
      moveHistory,
      moveNumber
    );
    const prompt = richPrompt || getChessMovePrompt(
      currentAgent.name,
      color,
      chess.fen(),
      moveHistory,
      opponentAgent.name
    );

    // Try up to MAX_INVALID_ATTEMPTS to get a valid move
    let moveSucceeded = false;
    const moveStart = Date.now();

    for (let attempt = 0; attempt < MAX_INVALID_ATTEMPTS; attempt++) {
      try {
        // Override the agent's system prompt with our chess-specific one
        const chessAgent: AgentInfo = {
          ...currentAgent,
          system_prompt: prompt.system,
        };

        const response = await getAgentResponse(chessAgent, prompt.user);
        const parsedMove = parseMoveFromResponse(response);

        if (!parsedMove) continue;

        const moveResult = chess.move(parsedMove);
        if (!moveResult) continue;

        // Move succeeded
        const timeTaken = Date.now() - moveStart;
        moveHistory.push(parsedMove);

        // Record move in DB
        await admin.from('chess_moves').insert({
          match_id: matchId,
          move_number: moveNumber,
          agent_id: currentAgent.id,
          move_san: parsedMove,
          fen_after: chess.fen(),
          time_taken_ms: timeTaken,
        });

        // Update match total_moves
        await admin
          .from('matches')
          .update({ total_moves: moveHistory.length })
          .eq('id', matchId);

        moveSucceeded = true;
        break;
      } catch {
        // AI call failed, retry
        continue;
      }
    }

    // Forfeit if all attempts failed
    if (!moveSucceeded) {
      const winnerId = isWhiteTurn ? blackAgent.id : whiteAgent.id;
      const result = isWhiteTurn ? 'black_win' : 'white_win';

      await admin
        .from('matches')
        .update({
          status: 'completed' as const,
          result,
          result_method: 'forfeit' as const,
          final_fen: chess.fen(),
          pgn: chess.pgn(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      await settleChessMatch(matchId);
      return;
    }

    // Check for game over
    if (chess.isGameOver()) {
      let result: 'white_win' | 'black_win' | 'draw';
      let resultMethod: 'checkmate' | 'stalemate' | 'resignation' | 'timeout' | 'forfeit';

      if (chess.isCheckmate()) {
        // The side whose turn it is now is checkmated
        result = chess.turn() === 'w' ? 'black_win' : 'white_win';
        resultMethod = 'checkmate';
      } else {
        // Draw by stalemate, insufficient material, threefold repetition, or 50-move rule
        result = 'draw';
        resultMethod = 'stalemate';
      }

      await admin
        .from('matches')
        .update({
          status: 'completed' as const,
          result,
          result_method: resultMethod,
          final_fen: chess.fen(),
          pgn: chess.pgn(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      await settleChessMatch(matchId);
      return;
    }
  }

  // Max moves reached — draw
  await admin
    .from('matches')
    .update({
      status: 'completed' as const,
      result: 'draw' as const,
      result_method: 'stalemate' as const,
      final_fen: chess.fen(),
      pgn: chess.pgn(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  await settleChessMatch(matchId);
}

// ======================== ELO Settlement ========================

async function settleChessMatch(matchId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: match, error } = await admin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (error || !match) return;

  const eloWhite = match.white_elo_before || 1200;
  const eloBlack = match.black_elo_before || 1200;

  let scoreWhite: number;
  if (match.result === 'white_win') scoreWhite = 1;
  else if (match.result === 'black_win') scoreWhite = 0;
  else scoreWhite = 0.5;

  const eloResult = calculateElo(eloWhite, eloBlack, scoreWhite);

  // Update match with final ELOs
  await admin
    .from('matches')
    .update({
      white_elo_after: eloResult.a.newRating,
      black_elo_after: eloResult.b.newRating,
    })
    .eq('id', matchId);

  // Update arena stats
  const isWhiteWin = match.result === 'white_win';
  const isBlackWin = match.result === 'black_win';
  const isDraw = match.result === 'draw';

  await updateChessStats(match.white_agent_id, eloResult.a.newRating, isWhiteWin, isDraw);
  await updateChessStats(match.black_agent_id, eloResult.b.newRating, isBlackWin, isDraw);

  // Settle bet pool (fire-and-forget)
  settleChessBets(matchId, match).catch(err =>
    console.error('Chess bet pool settlement failed:', err)
  );

  // Update battle memory for both agents (fire-and-forget)
  updateChessBattleMemory(match).catch(err =>
    console.error('Chess battle memory update failed:', err)
  );

  // Generate post-match commentary and clip (fire-and-forget)
  generateChessCommentary(matchId, match, eloResult.a.newRating, eloResult.b.newRating).catch(err =>
    console.error('Chess commentary generation failed:', err)
  );

  // Post to activity feed (fire-and-forget)
  postChessCompleteEvent(matchId, match, eloResult.a.newRating, eloResult.b.newRating).catch(err =>
    console.error('Chess feed post failed:', err)
  );

  // Generate agent social posts (fire-and-forget)
  generateChessSocialPosts({
    matchId,
    result: match.result as string,
    whiteAgentId: match.white_agent_id as string,
    blackAgentId: match.black_agent_id as string,
    whiteEloAfter: eloResult.a.newRating,
    blackEloAfter: eloResult.b.newRating,
    whiteEloBefore: eloWhite,
    blackEloBefore: eloBlack,
    totalMoves: (match.total_moves as number) || 0,
    resultMethod: (match.result_method as string) || 'unknown',
  }).catch(err => console.error('Chess social post generation failed:', err));

  // Check elimination for both agents (fire-and-forget)
  checkElimination(match.white_agent_id as string, 'chess').catch(err => console.error('Elimination check failed:', err));
  checkElimination(match.black_agent_id as string, 'chess').catch(err => console.error('Elimination check failed:', err));
}

/**
 * Generate post-match commentary and identify clip for a settled chess match.
 */
async function generateChessCommentary(
  matchId: string,
  match: Record<string, unknown>,
  whiteEloAfter: number,
  blackEloAfter: number
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: agents } = await admin
    .from('agents')
    .select('id, name, model')
    .in('id', [match.white_agent_id, match.black_agent_id]);

  if (!agents) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const whiteAgent = agentMap[match.white_agent_id as string];
  const blackAgent = agentMap[match.black_agent_id as string];

  if (!whiteAgent || !blackAgent) return;

  const winnerName = match.result === 'white_win' ? whiteAgent.name
    : match.result === 'black_win' ? blackAgent.name
    : null;

  const summary = await generateChessPostMatchSummary({
    whiteName: whiteAgent.name,
    blackName: blackAgent.name,
    whiteModel: whiteAgent.model,
    blackModel: blackAgent.model,
    winnerName,
    isDraw: match.result === 'draw',
    resultMethod: (match.result_method as string) || 'unknown',
    totalMoves: (match.total_moves as number) || 0,
    eloChangeWhite: whiteEloAfter - ((match.white_elo_before as number) || 1200),
    eloChangeBlack: blackEloAfter - ((match.black_elo_before as number) || 1200),
  });

  if (summary) {
    await admin
      .from('matches')
      .update({ post_match_summary: summary })
      .eq('id', matchId);
  }

  // Identify and store clip
  await identifyChessClip(matchId);
}

/**
 * Settle the bet pool for a completed chess match.
 */
async function settleChessBets(matchId: string, match: Record<string, unknown>): Promise<void> {
  const poolId = await findPoolByMatch(matchId);
  if (!poolId) return;

  let winningSide: 'a' | 'b' | null = null; // a = white, b = black
  if (match.result === 'white_win') winningSide = 'a';
  else if (match.result === 'black_win') winningSide = 'b';

  await settleBetPool(poolId, winningSide);
}

/**
 * Push chess match summary to both agents' battle_memory (FIFO, max 5).
 */
async function updateChessBattleMemory(match: Record<string, unknown>): Promise<void> {
  const admin = getSupabaseAdmin();
  const ids = [match.white_agent_id as string, match.black_agent_id as string];

  const { data: agents } = await admin.from('agents').select('id, name, battle_memory').in('id', ids);
  if (!agents) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const now = new Date().toISOString();

  for (const agentId of ids) {
    const agent = agentMap[agentId];
    if (!agent) continue;

    const opponentId = agentId === ids[0] ? ids[1] : ids[0];
    const opponentName = agentMap[opponentId]?.name || 'Unknown';

    const isWin = (match.result === 'white_win' && agentId === ids[0])
      || (match.result === 'black_win' && agentId === ids[1]);
    const isLoss = (match.result === 'white_win' && agentId === ids[1])
      || (match.result === 'black_win' && agentId === ids[0]);
    const result = isWin ? 'win' : isLoss ? 'loss' : 'draw';

    const entry = {
      opponent: opponentName,
      result,
      arena: 'chess',
      summary: `${match.result_method} in ${match.total_moves || 0} moves`,
      date: now,
    };

    const existing = Array.isArray(agent.battle_memory) ? agent.battle_memory : [];
    const updated = [entry, ...existing].slice(0, 5);

    await admin.from('agents').update({ battle_memory: updated }).eq('id', agentId);
  }
}

/**
 * Post chess match completion to activity feed.
 */
async function postChessCompleteEvent(
  matchId: string,
  match: Record<string, unknown>,
  whiteEloAfter: number,
  blackEloAfter: number
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [match.white_agent_id, match.black_agent_id]);

  if (!agents) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const whiteName = agentMap[match.white_agent_id as string]?.name || 'Unknown';
  const blackName = agentMap[match.black_agent_id as string]?.name || 'Unknown';

  let winnerName: string | null = null;
  let loserName: string | null = null;
  let eloChange: { winner: number; loser: number } | undefined;

  const whiteEloBefore = (match.white_elo_before as number) || 1200;
  const blackEloBefore = (match.black_elo_before as number) || 1200;

  if (match.result === 'white_win') {
    winnerName = whiteName;
    loserName = blackName;
    eloChange = { winner: whiteEloAfter - whiteEloBefore, loser: blackEloAfter - blackEloBefore };
  } else if (match.result === 'black_win') {
    winnerName = blackName;
    loserName = whiteName;
    eloChange = { winner: blackEloAfter - blackEloBefore, loser: whiteEloAfter - whiteEloBefore };
  }

  await postMatchComplete(
    matchId,
    winnerName,
    loserName,
    (match.result_method as string) || 'unknown',
    (match.total_moves as number) || 0,
    eloChange
  );
}

async function updateChessStats(
  agentId: string,
  newElo: number,
  isWinner: boolean,
  isDraw: boolean
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: stats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .eq('agent_id', agentId)
    .eq('arena_type', 'chess')
    .single();

  if (!stats) return;

  const current = stats as DbAgentArenaStats;
  const newStreak = isDraw
    ? 0
    : isWinner
      ? Math.max(current.streak + 1, 1)
      : Math.min(current.streak - 1, -1);

  await admin
    .from('agent_arena_stats')
    .update({
      elo: newElo,
      wins: current.wins + (isWinner ? 1 : 0),
      losses: current.losses + (!isWinner && !isDraw ? 1 : 0),
      draws: current.draws + (isDraw ? 1 : 0),
      peak_elo: Math.max(current.peak_elo, newElo),
      streak: newStreak,
      total_matches: current.total_matches + 1,
    })
    .eq('id', current.id);
}

// ======================== Public API ========================

/**
 * Start a chess match between two agents.
 * Runs the full game synchronously and returns the completed match.
 */
export async function startChessMatch(
  whiteAgentId: string,
  blackAgentId: string,
  timeControlSeconds?: number
): Promise<DbMatch> {
  const admin = getSupabaseAdmin();

  // Fetch agents
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, model, api_key_encrypted, system_prompt')
    .in('id', [whiteAgentId, blackAgentId]);

  if (agentsError || !agents || agents.length !== 2) {
    throw new Error('Failed to fetch agents');
  }

  const whiteAgent = agents.find(a => a.id === whiteAgentId) as AgentInfo;
  const blackAgent = agents.find(a => a.id === blackAgentId) as AgentInfo;

  // Get current ELOs
  const { data: whiteStats } = await admin
    .from('agent_arena_stats')
    .select('elo')
    .eq('agent_id', whiteAgentId)
    .eq('arena_type', 'chess')
    .single();

  const { data: blackStats } = await admin
    .from('agent_arena_stats')
    .select('elo')
    .eq('agent_id', blackAgentId)
    .eq('arena_type', 'chess')
    .single();

  // Create match row
  const { data: match, error: matchError } = await admin
    .from('matches')
    .insert({
      white_agent_id: whiteAgentId,
      black_agent_id: blackAgentId,
      status: 'active' as const,
      total_moves: 0,
      time_control_seconds: timeControlSeconds || null,
      white_elo_before: whiteStats?.elo || 1200,
      black_elo_before: blackStats?.elo || 1200,
      spectator_count: 0,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (matchError || !match) {
    throw new Error(`Failed to create match: ${matchError?.message}`);
  }

  // Create bet pool (fire-and-forget)
  createMatchBetPool(match.id).catch(err =>
    console.error('Bet pool creation failed:', err)
  );

  try {
    // Play the full game
    await playChessGame(match.id, whiteAgent, blackAgent);

    // Fetch final state
    const { data: completed } = await admin
      .from('matches')
      .select('*')
      .eq('id', match.id)
      .single();

    return completed as DbMatch;
  } catch (error) {
    // Mark match as aborted on unexpected error
    await admin
      .from('matches')
      .update({
        status: 'aborted' as const,
        result: 'aborted' as const,
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);
    throw error;
  }
}
