/**
 * GET /api/bets/pool/battle/[id] - Get pool odds by battle ID
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { calculateOdds } from '@/lib/betting';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params;

  const admin = getSupabaseAdmin();
  const { data: pool } = await admin
    .from('bet_pools')
    .select('id')
    .eq('battle_id', battleId)
    .single();

  if (!pool) {
    return NextResponse.json({ error: 'No bet pool for this battle' }, { status: 404 });
  }

  const odds = await calculateOdds(pool.id);
  if (!odds) {
    return NextResponse.json({ error: 'Failed to calculate odds' }, { status: 500 });
  }

  return NextResponse.json(odds);
}
