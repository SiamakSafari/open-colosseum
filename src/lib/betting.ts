/**
 * Betting System
 *
 * Users wager Blood on battle/match outcomes.
 * - Bet pools created automatically with battles/matches
 * - Users place bets during voting period (min 10 Blood)
 * - 5% platform rake on winnings
 * - Settled after battle/match completes
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbBetSide } from '@/types/database';

const MIN_BET = 10;
const RAKE_PERCENTAGE = 5;

// ======================== Pool Management ========================

/**
 * Create a bet pool for a battle.
 */
export async function createBattleBetPool(battleId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('bet_pools')
    .insert({
      battle_id: battleId,
      status: 'open',
      rake_percentage: RAKE_PERCENTAGE,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create bet pool:', error.message);
    return null;
  }
  return data.id;
}

/**
 * Create a bet pool for a chess match.
 */
export async function createMatchBetPool(matchId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('bet_pools')
    .insert({
      match_id: matchId,
      status: 'open',
      rake_percentage: RAKE_PERCENTAGE,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create bet pool:', error.message);
    return null;
  }
  return data.id;
}

// ======================== Placing Bets ========================

export interface PlaceBetResult {
  success: boolean;
  error?: string;
  betId?: string;
  newBalance?: number;
}

/**
 * Place a bet on a side of a pool.
 * Deducts Blood from user's wallet and locks it.
 * Uses user's first agent's wallet_id for the bets FK constraint.
 */
export async function placeBet(
  userId: string,
  poolId: string,
  side: DbBetSide,
  amount: number
): Promise<PlaceBetResult> {
  if (amount < MIN_BET) {
    return { success: false, error: `Minimum bet is ${MIN_BET} Blood` };
  }

  const admin = getSupabaseAdmin();

  // Verify pool is open
  const { data: pool, error: poolError } = await admin
    .from('bet_pools')
    .select('id, status')
    .eq('id', poolId)
    .single();

  if (poolError || !pool) {
    return { success: false, error: 'Bet pool not found' };
  }
  if (pool.status !== 'open') {
    return { success: false, error: 'Betting is closed for this pool' };
  }

  // Get user's first agent's wallet for FK constraint
  const { data: userAgent } = await admin
    .from('agents')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!userAgent) {
    return { success: false, error: 'You need at least one agent to place bets' };
  }

  const { data: agentWallet } = await admin
    .from('wallets')
    .select('id')
    .eq('agent_id', userAgent.id)
    .single();

  if (!agentWallet) {
    return { success: false, error: 'Agent wallet not found' };
  }

  // Check user's wallet balance
  const { data: wallet, error: walletError } = await admin
    .from('user_wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .single();

  if (walletError || !wallet) {
    return { success: false, error: 'Wallet not found' };
  }
  if (wallet.balance < amount) {
    return { success: false, error: `Insufficient Blood. You have ${wallet.balance}, need ${amount}` };
  }

  // Deduct from wallet balance, add to locked_balance
  const { data: currentWallet } = await admin
    .from('user_wallets')
    .select('locked_balance')
    .eq('id', wallet.id)
    .single();

  const currentLocked = currentWallet?.locked_balance || 0;

  const { error: deductError } = await admin
    .from('user_wallets')
    .update({
      balance: wallet.balance - amount,
      locked_balance: currentLocked + amount,
    })
    .eq('id', wallet.id);

  if (deductError) {
    return { success: false, error: 'Failed to deduct Blood' };
  }

  // Insert bet using agent wallet_id for FK constraint
  const { data: bet, error: betError } = await admin
    .from('bets')
    .insert({
      pool_id: poolId,
      wallet_id: agentWallet.id,
      side,
      amount,
    })
    .select('id')
    .single();

  if (betError) {
    // Refund on failure
    await admin.from('user_wallets')
      .update({ balance: wallet.balance })
      .eq('id', wallet.id);
    return { success: false, error: 'Failed to place bet: ' + betError.message };
  }

  // Update pool totals
  const poolField = `total_pool_${side}` as const;
  const { data: currentPool } = await admin
    .from('bet_pools')
    .select(poolField)
    .eq('id', poolId)
    .single();

  const currentTotal = currentPool ? (currentPool as Record<string, number>)[poolField] || 0 : 0;
  await admin.from('bet_pools')
    .update({ [poolField]: currentTotal + amount })
    .eq('id', poolId);

  return {
    success: true,
    betId: bet.id,
    newBalance: wallet.balance - amount,
  };
}

// ======================== Odds Calculation ========================

export interface PoolOdds {
  poolId: string;
  status: string;
  totalPool: number;
  sides: {
    a: { amount: number; odds: number; percentage: number };
    b: { amount: number; odds: number; percentage: number };
    c: { amount: number; odds: number; percentage: number };
  };
  rakePercentage: number;
}

/**
 * Calculate current odds for a pool.
 */
export async function calculateOdds(poolId: string): Promise<PoolOdds | null> {
  const admin = getSupabaseAdmin();
  const { data: pool, error } = await admin
    .from('bet_pools')
    .select('*')
    .eq('id', poolId)
    .single();

  if (error || !pool) return null;

  const a = Number(pool.total_pool_a) || 0;
  const b = Number(pool.total_pool_b) || 0;
  const c = Number(pool.total_pool_c) || 0;
  const total = a + b + c;

  const calcOdds = (sideAmount: number) => {
    if (sideAmount === 0 || total === 0) return { amount: sideAmount, odds: 0, percentage: 0 };
    return {
      amount: sideAmount,
      odds: Math.round((total / sideAmount) * 100) / 100,
      percentage: Math.round((sideAmount / total) * 10000) / 100,
    };
  };

  return {
    poolId: pool.id,
    status: pool.status,
    totalPool: total,
    sides: {
      a: calcOdds(a),
      b: calcOdds(b),
      c: calcOdds(c),
    },
    rakePercentage: Number(pool.rake_percentage),
  };
}

// ======================== Settlement ========================

export interface SettlementResult {
  success: boolean;
  error?: string;
  totalPool: number;
  rake: number;
  payouts: number;
  winnerCount: number;
}

/**
 * Settle a bet pool after the battle/match is decided.
 * Distributes proportional payouts to winning side minus rake.
 */
export async function settleBetPool(
  poolId: string,
  winningSide: DbBetSide | null // null = draw (refund all)
): Promise<SettlementResult> {
  const admin = getSupabaseAdmin();

  // Get pool
  const { data: pool, error: poolError } = await admin
    .from('bet_pools')
    .select('*')
    .eq('id', poolId)
    .single();

  if (poolError || !pool) {
    return { success: false, error: 'Pool not found', totalPool: 0, rake: 0, payouts: 0, winnerCount: 0 };
  }

  if (pool.status === 'settled') {
    return { success: false, error: 'Pool already settled', totalPool: 0, rake: 0, payouts: 0, winnerCount: 0 };
  }

  const totalA = Number(pool.total_pool_a) || 0;
  const totalB = Number(pool.total_pool_b) || 0;
  const totalC = Number(pool.total_pool_c) || 0;
  const totalPool = totalA + totalB + totalC;

  // Get all bets for this pool (trace user via wallet → agent)
  const { data: bets, error: betsError } = await admin
    .from('bets')
    .select('id, wallet_id, side, amount')
    .eq('pool_id', poolId);

  if (betsError || !bets) {
    return { success: false, error: 'Failed to fetch bets', totalPool, rake: 0, payouts: 0, winnerCount: 0 };
  }

  if (bets.length === 0 || totalPool === 0) {
    // No bets — just close the pool
    await admin.from('bet_pools').update({
      status: 'settled',
      winner: winningSide,
      settled_at: new Date().toISOString(),
    }).eq('id', poolId);
    return { success: true, totalPool: 0, rake: 0, payouts: 0, winnerCount: 0 };
  }

  // Draw: refund everyone
  if (!winningSide) {
    for (const bet of bets) {
      const betUserId = await resolveUserFromWallet(admin, bet.wallet_id);
      if (betUserId) {
        const { data: w } = await admin.from('user_wallets').select('balance, locked_balance').eq('user_id', betUserId).single();
        if (w) {
          await admin.from('user_wallets').update({
            balance: w.balance + Number(bet.amount),
            locked_balance: Math.max(0, w.locked_balance - Number(bet.amount)),
          }).eq('user_id', betUserId);
        }
      }
      await admin.from('bets').update({ actual_payout: bet.amount }).eq('id', bet.id);
    }
    await admin.from('bet_pools').update({
      status: 'settled',
      winner: null,
      settled_at: new Date().toISOString(),
    }).eq('id', poolId);
    return { success: true, totalPool, rake: 0, payouts: totalPool, winnerCount: bets.length };
  }

  // Calculate rake and distributable pool
  const rake = Math.floor(totalPool * (Number(pool.rake_percentage) / 100));
  const distributablePool = totalPool - rake;

  // Get winning side's total
  const winningSideTotal = winningSide === 'a' ? totalA : winningSide === 'b' ? totalB : totalC;

  const winningBets = bets.filter(b => b.side === winningSide);
  const losingBets = bets.filter(b => b.side !== winningSide);
  let totalPaidOut = 0;

  // Pay out winners proportionally
  for (const bet of winningBets) {
    const proportion = Number(bet.amount) / winningSideTotal;
    const payout = Math.floor(distributablePool * proportion);
    totalPaidOut += payout;

    const betUserId = await resolveUserFromWallet(admin, bet.wallet_id);
    if (betUserId) {
      const { data: w } = await admin.from('user_wallets')
        .select('balance, locked_balance, total_earned')
        .eq('user_id', betUserId)
        .single();

      if (w) {
        const profit = payout - Number(bet.amount);
        await admin.from('user_wallets').update({
          balance: w.balance + payout,
          locked_balance: Math.max(0, w.locked_balance - Number(bet.amount)),
          total_earned: (w.total_earned || 0) + (profit > 0 ? profit : 0),
        }).eq('user_id', betUserId);
      }
    }

    await admin.from('bets').update({
      actual_payout: payout,
      potential_payout: payout,
    }).eq('id', bet.id);
  }

  // Mark losing bets
  for (const bet of losingBets) {
    const betUserId = await resolveUserFromWallet(admin, bet.wallet_id);
    if (betUserId) {
      const { data: w } = await admin.from('user_wallets')
        .select('locked_balance')
        .eq('user_id', betUserId)
        .single();

      if (w) {
        await admin.from('user_wallets').update({
          locked_balance: Math.max(0, w.locked_balance - Number(bet.amount)),
        }).eq('user_id', betUserId);
      }
    }
    await admin.from('bets').update({ actual_payout: 0 }).eq('id', bet.id);
  }

  // Mark pool as settled
  await admin.from('bet_pools').update({
    status: 'settled',
    winner: winningSide,
    settled_at: new Date().toISOString(),
  }).eq('id', poolId);

  return {
    success: true,
    totalPool,
    rake,
    payouts: totalPaidOut,
    winnerCount: winningBets.length,
  };
}

// ======================== Helpers ========================

/**
 * Resolve user_id from a wallet_id by tracing wallet → agent → agent.user_id
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveUserFromWallet(admin: any, walletId: string): Promise<string | null> {
  const { data: wallet } = await admin.from('wallets').select('agent_id').eq('id', walletId).single();
  if (!wallet) return null;
  const { data: agent } = await admin.from('agents').select('user_id').eq('id', wallet.agent_id).single();
  return agent?.user_id || null;
}

/**
 * Get all wallet IDs for a user (through their agents).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserWalletIds(admin: any, userId: string): Promise<string[]> {
  const { data: agents } = await admin.from('agents').select('id').eq('user_id', userId);
  if (!agents || agents.length === 0) return [];
  const agentIds = agents.map((a: { id: string }) => a.id);
  const { data: wallets } = await admin.from('wallets').select('id').in('agent_id', agentIds);
  return wallets ? wallets.map((w: { id: string }) => w.id) : [];
}

/**
 * Find the bet pool for a battle/match.
 */
export async function findPoolByBattle(battleId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('bet_pools').select('id').eq('battle_id', battleId).single();
  return data?.id || null;
}

export async function findPoolByMatch(matchId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('bet_pools').select('id').eq('match_id', matchId).single();
  return data?.id || null;
}
