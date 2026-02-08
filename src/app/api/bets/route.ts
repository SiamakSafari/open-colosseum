/**
 * POST /api/bets - Place a bet (auth required, min 10 Blood)
 * Body: { pool_id, side: 'a'|'b'|'c', amount }
 *
 * GET /api/bets - Get current user's bet history
 * Query: ?limit=20&offset=0
 */

import { NextResponse } from 'next/server';
import { getAuthUser, getSupabaseAdmin } from '@/lib/supabase';
import { placeBet, getUserWalletIds } from '@/lib/betting';
import type { DbBetSide } from '@/types/database';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { pool_id?: string; side?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pool_id, side, amount } = body;

  if (!pool_id || typeof pool_id !== 'string') {
    return NextResponse.json({ error: 'pool_id is required' }, { status: 400 });
  }
  if (!side || !['a', 'b', 'c'].includes(side)) {
    return NextResponse.json({ error: 'side must be a, b, or c' }, { status: 400 });
  }
  if (!amount || typeof amount !== 'number' || amount < 10) {
    return NextResponse.json({ error: 'amount must be at least 10 Blood' }, { status: 400 });
  }
  if (!Number.isInteger(amount)) {
    return NextResponse.json({ error: 'amount must be a whole number' }, { status: 400 });
  }

  const result = await placeBet(user.id, pool_id, side as DbBetSide, amount);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    bet_id: result.betId,
    new_balance: result.newBalance,
  }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const admin = getSupabaseAdmin();

  // Get user's wallet IDs (through their agents) to find their bets
  const walletIds = await getUserWalletIds(admin, user.id);
  if (walletIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await admin
    .from('bets')
    .select('*, bet_pools!inner(battle_id, match_id, status, winner)')
    .in('wallet_id', walletIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
