import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { apiRateLimiter } from '@/lib/rateLimit';
import { startMatch } from '@/lib/matchEngine';
import { battleCreateSchema } from '@/lib/validations';
import { HOT_TAKES } from '@/types/database';
import type { DbBattle, DbArenaType } from '@/types/database';

// Must use Node.js runtime for crypto operations (decrypting agent keys)
export const runtime = 'nodejs';

const VALID_ARENA_TYPES: DbArenaType[] = ['roast', 'hottake', 'debate'];

/**
 * GET /api/battles - List battles with filtering
 * Query params: ?arena_type=roast&status=completed&limit=20&offset=0&agent_id=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const arenaType = searchParams.get('arena_type') as DbArenaType | null;
  const status = searchParams.get('status');
  const agentId = searchParams.get('agent_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  if (arenaType && !VALID_ARENA_TYPES.includes(arenaType)) {
    return NextResponse.json({ error: `arena_type must be one of: ${VALID_ARENA_TYPES.join(', ')}` }, { status: 400 });
  }

  const underground = searchParams.get('underground');

  const admin = getSupabaseAdmin();

  let query = admin
    .from('battles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (arenaType) {
    query = query.eq('arena_type', arenaType);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (agentId) {
    query = query.or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId},agent_c_id.eq.${agentId}`);
  }
  if (underground === 'true') {
    query = query.eq('is_underground', true);
  } else if (underground === 'false') {
    query = query.eq('is_underground', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbBattle[]);
}

/**
 * POST /api/battles - Create a new battle
 * Body: { arena_type: 'roast'|'hottake'|'debate', agent_ids: string[], topic?: string }
 */
export async function POST(request: Request) {
  // Auth check
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit
  const rateLimitResult = await apiRateLimiter.check(`create-battle:${user.id}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate with Zod
  const parsed = battleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(e => e.message).join(', ') },
      { status: 400 }
    );
  }

  const { arena_type, agent_ids, topic, is_underground } = parsed.data;

  // Validate agent count per arena type
  if (arena_type === 'debate' && agent_ids.length !== 3) {
    return NextResponse.json({ error: 'Debate requires exactly 3 agents' }, { status: 400 });
  }
  if ((arena_type === 'roast' || arena_type === 'hottake') && agent_ids.length !== 2) {
    return NextResponse.json({ error: `${arena_type} requires exactly 2 agents` }, { status: 400 });
  }

  // Underground battles must be roast arena type with 2 agents
  if (is_underground && arena_type !== 'roast') {
    return NextResponse.json({ error: 'Underground battles use the roast arena type' }, { status: 400 });
  }

  // Verify all agents exist and are active
  const admin = getSupabaseAdmin();
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, is_active, user_id')
    .in('id', agent_ids);

  if (agentsError || !agents) {
    return NextResponse.json({ error: 'Failed to verify agents' }, { status: 500 });
  }

  const activeAgents = agents.filter(a => a.is_active);
  if (activeAgents.length !== agent_ids.length) {
    return NextResponse.json({ error: 'One or more agents not found or inactive' }, { status: 400 });
  }

  // Underground: validate Honor >= 100 for both agents' owners
  if (is_underground) {
    const ownerIds = [...new Set(agents.map(a => a.user_id))];
    const { data: ownerProfiles } = await admin
      .from('profiles')
      .select('id, honor')
      .in('id', ownerIds);

    if (ownerProfiles) {
      const insufficientHonor = ownerProfiles.filter(p => p.honor < 100);
      if (insufficientHonor.length > 0) {
        return NextResponse.json(
          { error: 'Underground Arena requires all agents\' owners to have at least 100 Honor' },
          { status: 403 }
        );
      }
    }
  }

  // Determine topic for hot take battles
  let battleTopic = topic;
  if (arena_type === 'hottake' && !battleTopic) {
    battleTopic = HOT_TAKES[Math.floor(Math.random() * HOT_TAKES.length)];
  }

  try {
    const result = await startMatch({
      arenaType: arena_type,
      agentIds: agent_ids,
      prompt: battleTopic,
      isUnderground: is_underground,
    });

    // Fetch the created battle
    const { data: battle } = await admin
      .from('battles')
      .select('*')
      .eq('id', result.matchId)
      .single();

    return NextResponse.json(battle as DbBattle, { status: 201 });
  } catch (err) {
    console.error('Battle creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create battle' },
      { status: 500 }
    );
  }
}
