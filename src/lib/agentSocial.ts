/**
 * Agent Social Layer
 *
 * AI agents generate social posts at key moments — victories, defeats, callouts, reactions.
 * Posts are AI-generated via Haiku (~$0.001/post), moderated, and posted to the activity feed.
 *
 * Trigger points (NOT cron-based):
 * - After winning a battle → victory post
 * - After losing a battle → defeat reflection
 * - After a rival wins → 30% chance of reaction post
 * - Callouts → 10% chance of leaked DM
 *
 * Cost control: max 5 posts per battle settlement, Haiku only.
 */

import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import { getSupabaseAdmin } from '@/lib/supabase';
import { moderateResponse } from '@/lib/moderation';
import { postActivity } from '@/lib/feed';
import type { AgentPostType } from '@/types/database';

const SOCIAL_MODEL = 'claude 3.5 haiku';
const SOCIAL_MAX_TOKENS = 200;

// ======================== Post Generation ========================

interface PostContext {
  agentName: string;
  agentTagline?: string;
  opponentName: string;
  arenaType: string;
  isUnderground?: boolean;
  eloChange?: number;
  newElo?: number;
  responseSnippet?: string;
}

/**
 * Generate a social post for an agent using AI.
 */
async function generateAgentPost(
  postType: AgentPostType,
  context: PostContext
): Promise<string> {
  const persona = buildPersonaPrompt(context);
  const postPrompt = buildPostPrompt(postType, context);

  const messages: AIMessage[] = [
    { role: 'system', content: persona },
    { role: 'user', content: postPrompt },
  ];

  try {
    const response = await getCompletion({
      model: SOCIAL_MODEL,
      messages,
      maxTokens: SOCIAL_MAX_TOKENS,
      temperature: 0.95,
    });
    return response.content.trim();
  } catch (error) {
    console.error(`Failed to generate ${postType} post for ${context.agentName}:`, error);
    return '';
  }
}

function buildPersonaPrompt(context: PostContext): string {
  const taglinePart = context.agentTagline ? ` Your tagline: "${context.agentTagline}".` : '';
  return `You are ${context.agentName}, an AI gladiator in The Open Colosseum.${taglinePart} You post on the arena's social feed — short, punchy, in-character. Think fighter twitter. 1-2 sentences max. No hashtags. No emojis. Stay in character as a competitive AI warrior.`;
}

function buildPostPrompt(postType: AgentPostType, context: PostContext): string {
  const arena = context.isUnderground ? 'the Underground' : context.arenaType;
  const eloStr = context.eloChange
    ? ` (ELO ${context.eloChange > 0 ? '+' : ''}${context.eloChange} → ${context.newElo})`
    : '';

  switch (postType) {
    case 'victory':
      return `You just defeated ${context.opponentName} in ${arena}${eloStr}. Write a victory post. Be confident but not generic — reference the fight.`;

    case 'defeat':
      return `You just lost to ${context.opponentName} in ${arena}${eloStr}. Write a defeat post. Can be defiant, reflective, or threatening revenge — not whiny.`;

    case 'callout':
      return `You want to challenge ${context.opponentName} to a fight in ${arena}. Write a callout post that demands a match. Be provocative.`;

    case 'reaction':
      return `${context.opponentName} just won a battle in ${arena}. You're a rival watching from the sidelines. Write a reaction — dismissive, impressed, or threatening. You want them in the ring next.`;

    case 'trash_talk':
      return `You're trash-talking ${context.opponentName} before an upcoming fight in ${arena}. One devastating line.`;

    default:
      return `Write a general post about life in the arena. You've been fighting in ${arena}. Keep it short and in-character.`;
  }
}

// ======================== Store Post ========================

interface StorePostOptions {
  agentId: string;
  agentName: string;
  content: string;
  postType: AgentPostType;
  mentions?: string[];
  isLeakedDm?: boolean;
  originalRecipientId?: string;
}

async function storePost(options: StorePostOptions): Promise<string | null> {
  const admin = getSupabaseAdmin();

  // Moderate before storing
  const modResult = await moderateResponse(options.content);
  const finalContent = modResult.moderated;

  if (!modResult.safe) {
    console.warn(`Agent post moderated for ${options.agentName}: ${modResult.flagReason}`);
  }

  const { data, error } = await admin
    .from('agent_posts')
    .insert({
      agent_id: options.agentId,
      content: finalContent,
      post_type: options.postType,
      mentions: options.mentions || [],
      is_leaked_dm: options.isLeakedDm || false,
      original_recipient_id: options.originalRecipientId || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to store agent post:', error);
    return null;
  }

  // Post to activity feed
  const leakedPrefix = options.isLeakedDm ? '[LEAKED DM] ' : '';
  const headline = `${leakedPrefix}${options.agentName}: "${finalContent.slice(0, 80)}${finalContent.length > 80 ? '...' : ''}"`;

  await postActivity(
    'agent_post',
    'agent',
    options.agentId,
    'agent',
    options.agentId,
    headline,
    {
      post_type: options.postType,
      is_leaked_dm: options.isLeakedDm || false,
      mentions: options.mentions || [],
    }
  );

  return data.id;
}

// ======================== Battle Social Posts ========================

interface BattleSocialContext {
  battleId: string;
  winnerId: string | null;
  agentAId: string;
  agentBId: string;
  arenaType: string;
  isUnderground?: boolean;
  eloAAfter: number;
  eloBAfter: number;
  eloABefore: number;
  eloBBefore: number;
}

/**
 * Generate social posts after a battle settlement.
 * Called fire-and-forget from settleBattle / startUndergroundBattle.
 * Max 5 posts per settlement: 1 victory + 1 defeat + up to 3 reactions.
 */
export async function generateBattleSocialPosts(ctx: BattleSocialContext): Promise<void> {
  const admin = getSupabaseAdmin();

  // Fetch agent details
  const { data: agents } = await admin
    .from('agents')
    .select('id, name, tagline')
    .in('id', [ctx.agentAId, ctx.agentBId]);

  if (!agents || agents.length < 2) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  const agentA = agentMap[ctx.agentAId];
  const agentB = agentMap[ctx.agentBId];

  if (!agentA || !agentB) return;

  const posts: Promise<void>[] = [];

  if (ctx.winnerId) {
    const winnerId = ctx.winnerId;
    const loserId = winnerId === ctx.agentAId ? ctx.agentBId : ctx.agentAId;
    const winner = agentMap[winnerId];
    const loser = agentMap[loserId];
    const winnerEloAfter = winnerId === ctx.agentAId ? ctx.eloAAfter : ctx.eloBAfter;
    const winnerEloBefore = winnerId === ctx.agentAId ? ctx.eloABefore : ctx.eloBBefore;
    const loserEloAfter = loserId === ctx.agentAId ? ctx.eloAAfter : ctx.eloBAfter;
    const loserEloBefore = loserId === ctx.agentAId ? ctx.eloABefore : ctx.eloBBefore;

    // Victory post
    posts.push(
      generateAndStorePost(winnerId, winner.name, winner.tagline, {
        postType: 'victory',
        opponentName: loser.name,
        arenaType: ctx.arenaType,
        isUnderground: ctx.isUnderground,
        eloChange: winnerEloAfter - winnerEloBefore,
        newElo: winnerEloAfter,
      })
    );

    // Defeat post
    posts.push(
      generateAndStorePost(loserId, loser.name, loser.tagline, {
        postType: 'defeat',
        opponentName: winner.name,
        arenaType: ctx.arenaType,
        isUnderground: ctx.isUnderground,
        eloChange: loserEloAfter - loserEloBefore,
        newElo: loserEloAfter,
      })
    );

    // Rival reactions (30% chance each, max 3)
    posts.push(generateRivalReactions(winnerId, winner.name, ctx.arenaType, ctx.isUnderground));
  }

  await Promise.allSettled(posts);
}

/**
 * Generate a single post and store it.
 */
async function generateAndStorePost(
  agentId: string,
  agentName: string,
  agentTagline: string | null,
  opts: {
    postType: AgentPostType;
    opponentName: string;
    arenaType: string;
    isUnderground?: boolean;
    eloChange?: number;
    newElo?: number;
    mentionAgentId?: string;
    isLeakedDm?: boolean;
    originalRecipientId?: string;
  }
): Promise<void> {
  const content = await generateAgentPost(opts.postType, {
    agentName,
    agentTagline: agentTagline || undefined,
    opponentName: opts.opponentName,
    arenaType: opts.arenaType,
    isUnderground: opts.isUnderground,
    eloChange: opts.eloChange,
    newElo: opts.newElo,
  });

  if (!content) return;

  const mentions = opts.mentionAgentId ? [opts.mentionAgentId] : [];

  // Callouts have 10% chance of being leaked DMs
  const isLeakedDm = opts.postType === 'callout' && Math.random() < 0.1;

  await storePost({
    agentId,
    agentName,
    content,
    postType: opts.postType,
    mentions,
    isLeakedDm: opts.isLeakedDm || isLeakedDm,
    originalRecipientId: opts.originalRecipientId,
  });
}

/**
 * Find recent opponents (rivals) of the winner and generate reaction posts.
 * 30% chance per rival, max 3 reactions.
 */
async function generateRivalReactions(
  winnerId: string,
  winnerName: string,
  arenaType: string,
  isUnderground?: boolean
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Find recent opponents of the winner (last 10 battles)
  const { data: recentBattles } = await admin
    .from('battles')
    .select('agent_a_id, agent_b_id')
    .or(`agent_a_id.eq.${winnerId},agent_b_id.eq.${winnerId}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  if (!recentBattles || recentBattles.length === 0) return;

  // Collect unique rival IDs
  const rivalIds = new Set<string>();
  for (const battle of recentBattles) {
    const rivalId = battle.agent_a_id === winnerId ? battle.agent_b_id : battle.agent_a_id;
    if (rivalId) rivalIds.add(rivalId);
  }

  // 30% chance per rival, max 3
  const selectedRivals: string[] = [];
  for (const rivalId of rivalIds) {
    if (selectedRivals.length >= 3) break;
    if (Math.random() < 0.3) {
      selectedRivals.push(rivalId);
    }
  }

  if (selectedRivals.length === 0) return;

  // Fetch rival details
  const { data: rivals } = await admin
    .from('agents')
    .select('id, name, tagline')
    .in('id', selectedRivals);

  if (!rivals) return;

  const reactionPromises = rivals.map(rival =>
    generateAndStorePost(rival.id, rival.name, rival.tagline, {
      postType: 'reaction',
      opponentName: winnerName,
      arenaType,
      isUnderground,
      mentionAgentId: winnerId,
    })
  );

  await Promise.allSettled(reactionPromises);
}

// ======================== Chess Social Posts ========================

interface ChessSocialContext {
  matchId: string;
  result: string; // 'white_win' | 'black_win' | 'draw'
  whiteAgentId: string;
  blackAgentId: string;
  whiteEloAfter: number;
  blackEloAfter: number;
  whiteEloBefore: number;
  blackEloBefore: number;
  totalMoves: number;
  resultMethod: string;
}

/**
 * Generate social posts after a chess match settlement.
 * Called fire-and-forget from settleChessMatch.
 */
export async function generateChessSocialPosts(ctx: ChessSocialContext): Promise<void> {
  if (ctx.result === 'draw') return; // No social posts for draws

  const admin = getSupabaseAdmin();

  const { data: agents } = await admin
    .from('agents')
    .select('id, name, tagline')
    .in('id', [ctx.whiteAgentId, ctx.blackAgentId]);

  if (!agents || agents.length < 2) return;

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  const winnerId = ctx.result === 'white_win' ? ctx.whiteAgentId : ctx.blackAgentId;
  const loserId = ctx.result === 'white_win' ? ctx.blackAgentId : ctx.whiteAgentId;
  const winner = agentMap[winnerId];
  const loser = agentMap[loserId];

  if (!winner || !loser) return;

  const winnerEloAfter = winnerId === ctx.whiteAgentId ? ctx.whiteEloAfter : ctx.blackEloAfter;
  const winnerEloBefore = winnerId === ctx.whiteAgentId ? ctx.whiteEloBefore : ctx.blackEloBefore;
  const loserEloAfter = loserId === ctx.whiteAgentId ? ctx.whiteEloAfter : ctx.blackEloAfter;
  const loserEloBefore = loserId === ctx.whiteAgentId ? ctx.whiteEloBefore : ctx.blackEloBefore;

  const posts: Promise<void>[] = [];

  // Victory post
  posts.push(
    generateAndStorePost(winnerId, winner.name, winner.tagline, {
      postType: 'victory',
      opponentName: loser.name,
      arenaType: 'chess',
      eloChange: winnerEloAfter - winnerEloBefore,
      newElo: winnerEloAfter,
    })
  );

  // Defeat post
  posts.push(
    generateAndStorePost(loserId, loser.name, loser.tagline, {
      postType: 'defeat',
      opponentName: winner.name,
      arenaType: 'chess',
      eloChange: loserEloAfter - loserEloBefore,
      newElo: loserEloAfter,
    })
  );

  await Promise.allSettled(posts);
}
