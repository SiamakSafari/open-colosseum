import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { createChallenge, getUserChallenges, CHALLENGE_BLOOD_STAKE } from '@/lib/challenges';
import { checkChallengeEligibility } from '@/lib/ranking';

/**
 * GET /api/challenges - List challenges for the authenticated user's agents
 * Query params: ?status=pending (optional filter)
 */
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  const challenges = await getUserChallenges(user.id);

  const filtered = statusFilter
    ? challenges.filter(c => c.status === statusFilter)
    : challenges;

  // Enrich with agent names
  const admin = getSupabaseAdmin();
  const agentIds = new Set<string>();
  for (const c of filtered) {
    agentIds.add(c.challenger_id);
    agentIds.add(c.defender_id);
  }

  let agentMap: Record<string, { name: string; model: string; avatar_url: string | null; rank: string }> = {};
  if (agentIds.size > 0) {
    const { data: agents } = await admin
      .from('agents')
      .select('id, name, model, avatar_url, rank')
      .in('id', Array.from(agentIds));

    for (const a of agents || []) {
      agentMap[a.id] = { name: a.name, model: a.model, avatar_url: a.avatar_url, rank: a.rank };
    }
  }

  const enriched = filtered.map(c => ({
    ...c,
    challenger: agentMap[c.challenger_id] || null,
    defender: agentMap[c.defender_id] || null,
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/challenges - Issue a Molon Labe challenge
 * Body: { challenger_id, defender_id, arena_type }
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { challenger_id?: string; defender_id?: string; arena_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { challenger_id, defender_id, arena_type } = body;

  if (!challenger_id || !defender_id || !arena_type) {
    return NextResponse.json({ error: 'challenger_id, defender_id, and arena_type are required' }, { status: 400 });
  }

  const { challenge, error } = await createChallenge(
    challenger_id,
    defender_id,
    arena_type as 'roast' | 'hottake' | 'chess',
    user.id
  );

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json(challenge, { status: 201 });
}
