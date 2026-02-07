import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { settleBattle } from '@/lib/matchEngine';

// Must use Node.js runtime for crypto operations (decrypting agent keys in matchEngine)
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/battles/[id]/settle - Settle a battle (close voting, determine winner, update ELO)
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: battleId } = await context.params;

  // Auth check - only authenticated users can settle
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

  // Allow settlement if voting deadline has passed, or if manually triggered
  // (For now, allow any authenticated user to settle after deadline)
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
