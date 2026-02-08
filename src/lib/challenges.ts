/**
 * Molon Labe Challenge System
 *
 * A Perioikoi agent can challenge a Spartan for their rank.
 * - 50 Blood stake from challenger (deducted from user wallet)
 * - Defender has 24 hours to accept or forfeit
 * - Forfeit = defender loses Spartan rank, challenger takes it
 * - Accepted = battle/match created, winner gets/keeps rank + Blood stake
 * - Cooldowns: 7 days between same-pair challenges, 24h between any challenges from same agent
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { checkChallengeEligibility, setAgentRank } from '@/lib/ranking';
import { postChallengeIssued, postChallengeCompleted, postRankPromotion } from '@/lib/feed';
import { generateRankSocialPost } from '@/lib/agentSocial';
import type { DbChallenge, DbArenaType } from '@/types/database';

// ======================== Constants ========================

const CHALLENGE_BLOOD_STAKE = 50;
const CHALLENGE_DURATION_HOURS = 24;
const SAME_PAIR_COOLDOWN_DAYS = 7;
const AGENT_CHALLENGE_COOLDOWN_HOURS = 24;

export { CHALLENGE_BLOOD_STAKE, CHALLENGE_DURATION_HOURS };

// ======================== Create Challenge ========================

/**
 * Issue a Molon Labe challenge.
 * Validates eligibility, cooldowns, and deducts Blood stake.
 */
export async function createChallenge(
  challengerId: string,
  defenderId: string,
  arenaType: DbArenaType,
  userId: string
): Promise<{ challenge: DbChallenge | null; error?: string }> {
  const admin = getSupabaseAdmin();

  // 1. Validate arena type (no debate for challenges)
  if (!['roast', 'hottake', 'chess'].includes(arenaType)) {
    return { challenge: null, error: 'Invalid arena type for challenge' };
  }

  // 2. Check challenger eligibility
  const eligibility = await checkChallengeEligibility(challengerId);
  if (!eligibility.eligible) {
    return { challenge: null, error: eligibility.reason };
  }

  // 3. Verify challenger belongs to user
  const { data: challenger } = await admin
    .from('agents')
    .select('id, user_id, name')
    .eq('id', challengerId)
    .single();

  if (!challenger || challenger.user_id !== userId) {
    return { challenge: null, error: 'You do not own this agent' };
  }

  // 4. Verify defender is a Spartan
  const { data: defender } = await admin
    .from('agents')
    .select('id, user_id, rank, name, is_active')
    .eq('id', defenderId)
    .single();

  if (!defender) return { challenge: null, error: 'Defender not found' };
  if (!defender.is_active) return { challenge: null, error: 'Defender is eliminated' };
  if (defender.rank !== 'spartan') return { challenge: null, error: 'Can only challenge Spartans' };

  // 5. Can't challenge your own agent
  if (challenger.user_id === defender.user_id) {
    return { challenge: null, error: 'Cannot challenge your own agent' };
  }

  // 6. Check same-pair cooldown (7 days)
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - SAME_PAIR_COOLDOWN_DAYS);
  const { count: recentPairCount } = await admin
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('challenger_id', challengerId)
    .eq('defender_id', defenderId)
    .gte('created_at', cooldownDate.toISOString());

  if ((recentPairCount || 0) > 0) {
    return { challenge: null, error: `Must wait ${SAME_PAIR_COOLDOWN_DAYS} days between challenges to the same Spartan` };
  }

  // 7. Check agent-level cooldown (24h since last challenge issued)
  const agentCooldownDate = new Date();
  agentCooldownDate.setHours(agentCooldownDate.getHours() - AGENT_CHALLENGE_COOLDOWN_HOURS);
  const { count: recentAgentCount } = await admin
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('challenger_id', challengerId)
    .gte('created_at', agentCooldownDate.toISOString());

  if ((recentAgentCount || 0) > 0) {
    return { challenge: null, error: 'Must wait 24 hours between issuing challenges' };
  }

  // 8. Check defender doesn't already have a pending challenge
  const { count: defenderPending } = await admin
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('defender_id', defenderId)
    .eq('status', 'pending');

  if ((defenderPending || 0) > 0) {
    return { challenge: null, error: 'This Spartan already has a pending challenge' };
  }

  // 9. Deduct Blood stake from user wallet
  const { data: wallet } = await admin
    .from('user_wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .single();

  if (!wallet || wallet.balance < CHALLENGE_BLOOD_STAKE) {
    return { challenge: null, error: `Need ${CHALLENGE_BLOOD_STAKE} Blood to issue a challenge (have ${wallet?.balance || 0})` };
  }

  const { error: walletError } = await admin
    .from('user_wallets')
    .update({ balance: wallet.balance - CHALLENGE_BLOOD_STAKE })
    .eq('id', wallet.id);

  if (walletError) {
    return { challenge: null, error: 'Failed to deduct Blood stake' };
  }

  // 10. Create the challenge
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CHALLENGE_DURATION_HOURS);

  const { data: challenge, error: insertError } = await admin
    .from('challenges')
    .insert({
      challenger_id: challengerId,
      defender_id: defenderId,
      arena_type: arenaType,
      status: 'pending',
      blood_stake: CHALLENGE_BLOOD_STAKE,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !challenge) {
    // Refund on failure
    await admin
      .from('user_wallets')
      .update({ balance: wallet.balance })
      .eq('id', wallet.id);
    return { challenge: null, error: 'Failed to create challenge' };
  }

  // Fire-and-forget: feed event + social post
  postChallengeIssued(challenge.id, challenger.name, defender.name, arenaType).catch(err =>
    console.error('Challenge feed post failed:', err)
  );
  generateRankSocialPost(challengerId, 'challenge_issued', defender.name).catch(err =>
    console.error('Challenge social post failed:', err)
  );

  return { challenge: challenge as DbChallenge };
}

// ======================== Accept Challenge ========================

/**
 * Accept a Molon Labe challenge. Creates the battle/match.
 * Returns the battle or match ID for redirect.
 */
export async function acceptChallenge(
  challengeId: string,
  userId: string
): Promise<{ battleId?: string; matchId?: string; error?: string }> {
  const admin = getSupabaseAdmin();

  // Fetch the challenge
  const { data: challenge } = await admin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('status', 'pending')
    .single();

  if (!challenge) {
    return { error: 'Challenge not found or already resolved' };
  }

  // Verify user owns the defender
  const { data: defender } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', challenge.defender_id)
    .single();

  if (!defender || defender.user_id !== userId) {
    return { error: 'You do not own the defending agent' };
  }

  // Check not expired
  if (new Date(challenge.expires_at) < new Date()) {
    return { error: 'Challenge has expired' };
  }

  // Mark as accepted
  await admin
    .from('challenges')
    .update({ status: 'accepted' })
    .eq('id', challengeId);

  // Create the battle or match based on arena type
  if (challenge.arena_type === 'chess') {
    // Import chess engine dynamically to avoid circular deps
    const { startChessMatch } = await import('@/lib/chessEngine');
    try {
      const match = await startChessMatch(challenge.challenger_id, challenge.defender_id);
      // Link challenge to match
      await admin
        .from('challenges')
        .update({ match_id: match.id })
        .eq('id', challengeId);
      return { matchId: match.id };
    } catch (err) {
      console.error('Failed to start challenge chess match:', err);
      // Revert to pending
      await admin.from('challenges').update({ status: 'pending' }).eq('id', challengeId);
      return { error: 'Failed to create chess match' };
    }
  } else {
    // Roast or Hot Take battle
    const { startRoastBattle, startHotTakeBattle } = await import('@/lib/matchEngine');
    try {
      let battle;
      if (challenge.arena_type === 'hottake') {
        // Pick a topic for hot take challenges
        const topics = [
          'AI will replace all human creativity',
          'Remote work is the future of civilization',
          'Social media is a net negative for society',
          'Money can buy happiness',
          'Free will is an illusion',
        ];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        battle = await startHotTakeBattle(challenge.challenger_id, challenge.defender_id, topic);
      } else {
        battle = await startRoastBattle(challenge.challenger_id, challenge.defender_id);
      }
      // Link challenge to battle
      await admin
        .from('challenges')
        .update({ battle_id: battle.id })
        .eq('id', challengeId);
      return { battleId: battle.id };
    } catch (err) {
      console.error('Failed to start challenge battle:', err);
      await admin.from('challenges').update({ status: 'pending' }).eq('id', challengeId);
      return { error: 'Failed to create battle' };
    }
  }
}

// ======================== Decline Challenge ========================

/**
 * Decline a Molon Labe challenge. Defender forfeits Spartan rank.
 * Challenger is promoted to Spartan and gets Blood stake back.
 */
export async function declineChallenge(
  challengeId: string,
  userId: string
): Promise<{ error?: string }> {
  const admin = getSupabaseAdmin();

  const { data: challenge } = await admin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('status', 'pending')
    .single();

  if (!challenge) {
    return { error: 'Challenge not found or already resolved' };
  }

  // Verify user owns the defender
  const { data: defender } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', challenge.defender_id)
    .single();

  if (!defender || defender.user_id !== userId) {
    return { error: 'You do not own the defending agent' };
  }

  await resolveDeclineOrExpiry(challengeId, challenge);
  return {};
}

// ======================== Expiry ========================

/**
 * Expire all pending challenges past their deadline.
 * Called by orchestrator tick.
 * Returns count of expired challenges.
 */
export async function expirePendingChallenges(): Promise<number> {
  const admin = getSupabaseAdmin();

  const { data: expired } = await admin
    .from('challenges')
    .select('*')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .limit(10);

  if (!expired || expired.length === 0) return 0;

  let count = 0;
  for (const challenge of expired) {
    try {
      await resolveDeclineOrExpiry(challenge.id, challenge);
      count++;
    } catch (err) {
      console.error('Failed to expire challenge:', challenge.id, err);
    }
  }

  return count;
}

// ======================== Challenge Resolution ========================

/**
 * Resolve a challenge after the linked battle/match completes.
 * Called by settlement hooks in matchEngine/chessEngine.
 * Winner gets/keeps Spartan rank. Loser drops to Perioikoi.
 */
export async function resolveChallengeByBattle(battleId: string, winnerId: string | null): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: challenge } = await admin
    .from('challenges')
    .select('*')
    .eq('battle_id', battleId)
    .in('status', ['accepted'])
    .single();

  if (!challenge) return; // Not a challenge battle

  await resolveCompletedChallenge(challenge, winnerId);
}

export async function resolveChallengeByMatch(matchId: string, winnerId: string | null): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: challenge } = await admin
    .from('challenges')
    .select('*')
    .eq('match_id', matchId)
    .in('status', ['accepted'])
    .single();

  if (!challenge) return;

  await resolveCompletedChallenge(challenge, winnerId);
}

// ======================== Query Helpers ========================

/**
 * Get all challenges involving a user's agents.
 */
export async function getUserChallenges(userId: string): Promise<DbChallenge[]> {
  const admin = getSupabaseAdmin();

  // Get user's agent IDs
  const { data: agents } = await admin
    .from('agents')
    .select('id')
    .eq('user_id', userId);

  if (!agents || agents.length === 0) return [];

  const agentIds = agents.map(a => a.id);

  const { data: challenges } = await admin
    .from('challenges')
    .select('*')
    .or(`challenger_id.in.(${agentIds.join(',')}),defender_id.in.(${agentIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(50);

  return (challenges as DbChallenge[]) || [];
}

/**
 * Get a challenge by ID with agent details.
 */
export async function getChallengeWithAgents(challengeId: string) {
  const admin = getSupabaseAdmin();

  const { data: challenge } = await admin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (!challenge) return null;

  const { data: agents } = await admin
    .from('agents')
    .select('id, name, model, avatar_url, rank, user_id')
    .in('id', [challenge.challenger_id, challenge.defender_id]);

  const challenger = agents?.find(a => a.id === challenge.challenger_id);
  const defender = agents?.find(a => a.id === challenge.defender_id);

  return { ...challenge, challenger, defender };
}

/**
 * Find a challenge linked to a battle ID.
 */
export async function getChallengeByBattleId(battleId: string): Promise<DbChallenge | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('challenges')
    .select('*')
    .eq('battle_id', battleId)
    .single();
  return data as DbChallenge | null;
}

/**
 * Find a challenge linked to a match ID.
 */
export async function getChallengeByMatchId(matchId: string): Promise<DbChallenge | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('challenges')
    .select('*')
    .eq('match_id', matchId)
    .single();
  return data as DbChallenge | null;
}

// ======================== Internal Helpers ========================

/**
 * Handle decline or expiry: defender loses rank, challenger gets promoted + refunded.
 */
async function resolveDeclineOrExpiry(
  challengeId: string,
  challenge: { challenger_id: string; defender_id: string; blood_stake: number; expires_at: string }
): Promise<void> {
  const admin = getSupabaseAdmin();
  const isExpiry = new Date(challenge.expires_at) < new Date();

  // 1. Defender loses Spartan rank → Perioikoi
  await setAgentRank(challenge.defender_id, 'perioikoi');

  // 2. Challenger gains Spartan rank
  await setAgentRank(challenge.challenger_id, 'spartan');

  // 3. Refund Blood to challenger's owner
  const { data: challenger } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', challenge.challenger_id)
    .single();

  if (challenger) {
    const { data: wallet } = await admin
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', challenger.user_id)
      .single();

    if (wallet) {
      await admin
        .from('user_wallets')
        .update({ balance: wallet.balance + challenge.blood_stake })
        .eq('id', wallet.id);
    }
  }

  // 4. Mark challenge as declined/expired
  await admin
    .from('challenges')
    .update({
      status: isExpiry ? 'expired' : 'declined',
      winner_id: challenge.challenger_id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', challengeId);

  // 5. Narrative events (fire-and-forget)
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [challenge.challenger_id, challenge.defender_id]);

  const challengerName = agents?.find(a => a.id === challenge.challenger_id)?.name || 'Challenger';
  const defenderName = agents?.find(a => a.id === challenge.defender_id)?.name || 'Defender';

  postChallengeCompleted(challengeId, challengerName, defenderName, true).catch(() => {});
  postRankPromotion(challenge.challenger_id, challengerName, 'spartan').catch(() => {});
  generateRankSocialPost(challenge.challenger_id, 'challenge_won', defenderName).catch(() => {});
  generateRankSocialPost(challenge.defender_id, 'rank_lost', challengerName).catch(() => {});
}

/**
 * Resolve a completed challenge battle/match.
 */
async function resolveCompletedChallenge(
  challenge: { id: string; challenger_id: string; defender_id: string; blood_stake: number },
  winnerId: string | null
): Promise<void> {
  const admin = getSupabaseAdmin();

  if (!winnerId) {
    // Draw — both keep their current ranks, refund challenger's stake
    const { data: challenger } = await admin
      .from('agents')
      .select('user_id')
      .eq('id', challenge.challenger_id)
      .single();

    if (challenger) {
      const { data: wallet } = await admin
        .from('user_wallets')
        .select('id, balance')
        .eq('user_id', challenger.user_id)
        .single();

      if (wallet) {
        await admin
          .from('user_wallets')
          .update({ balance: wallet.balance + challenge.blood_stake })
          .eq('id', wallet.id);
      }
    }

    await admin
      .from('challenges')
      .update({ status: 'completed', resolved_at: new Date().toISOString() })
      .eq('id', challenge.id);
    return;
  }

  const challengerWon = winnerId === challenge.challenger_id;

  if (challengerWon) {
    // Challenger takes Spartan rank, defender drops to Perioikoi
    await setAgentRank(challenge.challenger_id, 'spartan');
    await setAgentRank(challenge.defender_id, 'perioikoi');
  }
  // If defender won: they keep Spartan, challenger stays Perioikoi
  // Blood stake goes to winner's owner either way

  // Pay Blood stake to winner's owner
  const { data: winner } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', winnerId)
    .single();

  if (winner) {
    const { data: wallet } = await admin
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', winner.user_id)
      .single();

    if (wallet) {
      await admin
        .from('user_wallets')
        .update({ balance: wallet.balance + challenge.blood_stake })
        .eq('id', wallet.id);
    }
  }

  await admin
    .from('challenges')
    .update({
      status: 'completed',
      winner_id: winnerId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', challenge.id);

  // Narrative events (fire-and-forget)
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [challenge.challenger_id, challenge.defender_id]);

  const challengerName = agents?.find(a => a.id === challenge.challenger_id)?.name || 'Challenger';
  const defenderName = agents?.find(a => a.id === challenge.defender_id)?.name || 'Defender';
  const winnerName = winnerId === challenge.challenger_id ? challengerName : defenderName;
  const loserName = winnerId === challenge.challenger_id ? defenderName : challengerName;

  postChallengeCompleted(challenge.id, winnerName, loserName, challengerWon).catch(() => {});
  if (challengerWon) {
    postRankPromotion(challenge.challenger_id, challengerName, 'spartan').catch(() => {});
    generateRankSocialPost(challenge.challenger_id, 'challenge_won', defenderName).catch(() => {});
    generateRankSocialPost(challenge.defender_id, 'rank_lost', challengerName).catch(() => {});
  } else {
    generateRankSocialPost(challenge.defender_id, 'challenge_won', challengerName).catch(() => {});
    generateRankSocialPost(challenge.challenger_id, 'challenge_lost', defenderName).catch(() => {});
  }
}
