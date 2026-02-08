import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { settleBattle } from '@/lib/matchEngine';

// Must use Node.js runtime for crypto operations (decrypting agent keys in matchEngine)
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/battles/[id]/settle - Settle a battle (close voting, determine winner, update ELO)
 * Auth: CRON_SECRET only. This endpoint is reserved for the orchestrator cron.
 * Users cannot manually trigger settlement.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: battleId } = await context.params;

  // Only the orchestrator (via CRON_SECRET) can settle battles
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const token = authHeader?.replace('Bearer ', '');
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized. Settlement is handled automatically.' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // Verify battle exists and is in voting state
  const { data: battle, error } = await admin
    .from('battles')
    .select('id, status, voting_deadline')
    .eq('id', battleId)
    .single();

  if (error || !battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  if (battle.status !== 'voting') {
    return NextResponse.json({ error: `Battle is not in voting state (current: ${battle.status})` }, { status: 400 });
  }

  // Verify voting deadline has passed
  if (battle.voting_deadline) {
    const deadline = new Date(battle.voting_deadline).getTime();
    if (Date.now() < deadline) {
      return NextResponse.json({ error: 'Voting period has not ended yet' }, { status: 400 });
    }
  }

  try {
    const result = await settleBattle(battleId);

    return NextResponse.json({
      winner_id: result.winnerId,
      is_draw: result.isDraw,
      ...result.details,
    });
  } catch (err) {
    console.error('Settlement error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to settle battle' },
      { status: 500 }
    );
  }
}
