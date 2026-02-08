/**
 * Clip Identification Engine
 *
 * Uses Haiku to identify the best shareable moment from a battle or chess match,
 * then stores it in the clips table.
 */

import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ClipMomentType, DbClip } from '@/types/database';

const CLIP_MODEL = 'claude 3.5 haiku';

interface ClipCandidate {
  agentId: string;
  agentName: string;
  quoteText: string;
  contextText: string;
  momentType: ClipMomentType;
}

// ======================== Battle Clip Identification ========================

/**
 * Identify the best clip-worthy moment from a completed battle.
 * Returns the created clip, or null if identification fails.
 */
export async function identifyBattleClip(battleId: string): Promise<DbClip | null> {
  const admin = getSupabaseAdmin();

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (!battle || !battle.response_a || !battle.response_b) return null;

  const agentIds = [battle.agent_a_id, battle.agent_b_id, battle.agent_c_id].filter(Boolean) as string[];

  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', agentIds);

  if (!agents) return null;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  // Build context for Haiku to pick the best moment
  let responsesBlock = `${agentMap[battle.agent_a_id]?.name || 'Agent A'} [ID:${battle.agent_a_id}]:\n"${battle.response_a}"\n\n${agentMap[battle.agent_b_id]?.name || 'Agent B'} [ID:${battle.agent_b_id}]:\n"${battle.response_b}"`;

  if (battle.response_c && battle.agent_c_id) {
    responsesBlock += `\n\n${agentMap[battle.agent_c_id]?.name || 'Agent C'} [ID:${battle.agent_c_id}]:\n"${battle.response_c}"`;
  }

  const winnerContext = battle.winner_id
    ? `Winner: ${agentMap[battle.winner_id]?.name || 'Unknown'}`
    : 'Result: Draw';

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a clip curator for The Open Colosseum. Your job is to identify the single most shareable, memorable quote from a battle. Pick the line that would make someone stop scrolling. Respond ONLY in this exact JSON format:
{"agent_id":"<the agent's ID from the brackets>","quote":"<the exact quote, max 280 chars>","context":"<1 sentence explaining why this moment matters>","moment_type":"<one of: highlight, knockout, comeback, upset, legendary>"}`,
    },
    {
      role: 'user',
      content: `Arena: ${battle.arena_type}\n${winnerContext}\n\nResponses:\n${responsesBlock}\n\nPick the single best clip-worthy quote.`,
    },
  ];

  try {
    const response = await getCompletion({
      model: CLIP_MODEL,
      messages,
      maxTokens: 200,
      temperature: 0.3,
    });

    const clip = parseClipResponse(response.content, agentIds);
    if (!clip) return null;

    // Store in clips table
    const { data: savedClip, error } = await admin
      .from('clips')
      .insert({
        battle_id: battleId,
        agent_id: clip.agentId,
        quote_text: clip.quoteText,
        context_text: clip.contextText,
        moment_type: clip.momentType,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to save clip:', error);
      return null;
    }

    // Store clip reference on the battle
    await admin
      .from('battles')
      .update({
        clip_moment: {
          clip_id: savedClip.id,
          agent_id: clip.agentId,
          quote: clip.quoteText,
          moment_type: clip.momentType,
        },
      })
      .eq('id', battleId);

    return savedClip as DbClip;
  } catch (error) {
    console.error('Failed to identify battle clip:', error);
    return null;
  }
}

// ======================== Chess Clip Identification ========================

/**
 * Identify the best clip-worthy moment from a completed chess match.
 */
export async function identifyChessClip(matchId: string): Promise<DbClip | null> {
  const admin = getSupabaseAdmin();

  const { data: match } = await admin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match) return null;

  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [match.white_agent_id, match.black_agent_id]);

  if (!agents) return null;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  const whiteName = agentMap[match.white_agent_id]?.name || 'White';
  const blackName = agentMap[match.black_agent_id]?.name || 'Black';

  const resultStr = match.result === 'white_win'
    ? `${whiteName} won by ${match.result_method}`
    : match.result === 'black_win'
    ? `${blackName} won by ${match.result_method}`
    : `Draw by ${match.result_method}`;

  const winnerId = match.result === 'white_win' ? match.white_agent_id
    : match.result === 'black_win' ? match.black_agent_id
    : match.white_agent_id; // For draws, credit white by convention

  const winnerName = agentMap[winnerId]?.name || 'Unknown';

  // Determine moment type based on match characteristics
  let momentType: ClipMomentType = 'highlight';
  if (match.result_method === 'checkmate' && match.total_moves <= 20) {
    momentType = 'knockout';
  } else if (match.result_method === 'checkmate') {
    momentType = 'highlight';
  }

  // For chess, create a descriptive clip rather than a quote
  const quoteText = match.result_method === 'checkmate'
    ? `${winnerName} delivers checkmate in ${match.total_moves} moves`
    : match.result === 'draw'
    ? `${whiteName} and ${blackName} battle to a draw after ${match.total_moves} moves`
    : `${winnerName} wins by ${match.result_method} in ${match.total_moves} moves`;

  const contextText = `${whiteName} vs ${blackName} — ${resultStr}`;

  // Store in clips table
  const { data: savedClip, error } = await admin
    .from('clips')
    .insert({
      match_id: matchId,
      agent_id: winnerId,
      quote_text: quoteText,
      context_text: contextText,
      moment_type: momentType,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to save chess clip:', error);
    return null;
  }

  // Store clip reference on the match
  await admin
    .from('matches')
    .update({
      clip_moment: {
        clip_id: savedClip.id,
        agent_id: winnerId,
        quote: quoteText,
        moment_type: momentType,
      },
    })
    .eq('id', matchId);

  return savedClip as DbClip;
}

// ======================== Parse Helpers ========================

function parseClipResponse(
  raw: string,
  validAgentIds: string[]
): ClipCandidate | null {
  try {
    // Extract JSON from response (may have surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const agentId = parsed.agent_id;
    if (!agentId || !validAgentIds.includes(agentId)) return null;

    const quoteText = (parsed.quote || '').slice(0, 280);
    if (!quoteText) return null;

    const validMomentTypes: ClipMomentType[] = ['highlight', 'knockout', 'comeback', 'upset', 'legendary'];
    const momentType = validMomentTypes.includes(parsed.moment_type)
      ? parsed.moment_type
      : 'highlight';

    return {
      agentId,
      agentName: '',
      quoteText,
      contextText: (parsed.context || '').slice(0, 500),
      momentType,
    };
  } catch {
    console.error('Failed to parse clip response:', raw);
    return null;
  }
}
