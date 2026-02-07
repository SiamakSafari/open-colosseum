import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { voteRateLimiter } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/battles/[id]/vote - Vote on a battle
 * Body: { voted_for: 'a' | 'b' | 'c', session_token: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: battleId } = await context.params;

  // Parse body
  let body: { voted_for?: string; session_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { voted_for, session_token } = body;

  if (!voted_for || !['a', 'b', 'c'].includes(voted_for)) {
    return NextResponse.json({ error: 'voted_for must be "a", "b", or "c"' }, { status: 400 });
  }

  if (!session_token) {
    return NextResponse.json({ error: 'session_token is required' }, { status: 400 });
  }

  // Rate limit by IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const rateLimitResult = await voteRateLimiter.check(`vote:${ip}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const admin = getSupabaseAdmin();

  // Verify battle exists and is in voting state
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .select('id, status, arena_type, agent_c_id')
    .eq('id', battleId)
    .single();

  if (battleError || !battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  if (battle.status !== 'voting') {
    return NextResponse.json({ error: 'Battle is not accepting votes' }, { status: 400 });
  }

  // Can't vote 'c' on non-debate battles
  if (voted_for === 'c' && !battle.agent_c_id) {
    return NextResponse.json({ error: 'Invalid vote option for this battle type' }, { status: 400 });
  }

  // Get optional auth user
  const user = await getAuthUser(request);

  // Insert vote
  const { error: voteError } = await admin
    .from('votes')
    .insert({
      battle_id: battleId,
      user_id: user?.id || null,
      session_token,
      ip_address: ip,
      voted_for: voted_for as 'a' | 'b' | 'c',
    });

  if (voteError) {
    if (voteError.code === '23505') {
      return NextResponse.json({ error: 'You have already voted on this battle' }, { status: 409 });
    }
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  // Increment vote count on battle
  const voteField = `votes_${voted_for}` as 'votes_a' | 'votes_b' | 'votes_c';

  // Use RPC or manual increment
  const { data: currentBattle } = await admin
    .from('battles')
    .select('votes_a, votes_b, votes_c, total_votes')
    .eq('id', battleId)
    .single();

  if (currentBattle) {
    await admin
      .from('battles')
      .update({
        [voteField]: (currentBattle[voteField] || 0) + 1,
        total_votes: (currentBattle.total_votes || 0) + 1,
      })
      .eq('id', battleId);
  }

  // Return updated vote counts
  const { data: updated } = await admin
    .from('battles')
    .select('votes_a, votes_b, votes_c, total_votes')
    .eq('id', battleId)
    .single();

  return NextResponse.json({
    votes_a: updated?.votes_a || 0,
    votes_b: updated?.votes_b || 0,
    votes_c: updated?.votes_c || 0,
    total_votes: updated?.total_votes || 0,
  });
}
