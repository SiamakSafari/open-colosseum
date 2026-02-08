/**
 * GET /api/bets/pool/[id] - Get pool info with odds
 * Public endpoint — no auth required
 */

import { NextResponse } from 'next/server';
import { calculateOdds } from '@/lib/betting';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const odds = await calculateOdds(id);
  if (!odds) {
    return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
  }

  return NextResponse.json(odds);
}
