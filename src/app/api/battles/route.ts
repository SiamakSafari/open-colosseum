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
  // Auth: user session OR CRON_SECRET (for orchestrator / Socrates)
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = cronSecret && (
    request.headers.get('x-cron-secret') === cronSecret
    || request.headers.get('authorization')?.replace('Bearer ', '') === cronSecret
  );

  const user = isCronAuth ? null : await getAuthUser(request);
  if (!isCronAuth && !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit (skip for cron-authed requests)
  if (user) {
    const rateLimitResult = await apiRateLimiter.check(`create-battle:${user.id}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
      );
    }
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

  const { arena_type, agent_ids, topic, is_underground, scheduled_for } = parsed.data;

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

  // Rate limit house agents: max 3 games per user per 24 hours (battles + matches combined)
  // Skipped for cron-authed requests (orchestrator/Socrates)
  // Wrapped in try/catch — skips gracefully if use_platform_key column doesn't exist yet
  if (!isCronAuth) try {
    const ownerIds = [...new Set(agents.map(a => a.user_id).filter(Boolean))];
    const { data: allUserHouseAgents } = await admin
      .from('agents')
      .select('id')
      .in('user_id', ownerIds)
      .eq('use_platform_key', true);

    if (allUserHouseAgents && allUserHouseAgents.length > 0) {
      const allIds = allUserHouseAgents.map(a => a.id);
      // Only rate-limit if the agents in this battle are actually house agents
      const battleAgentIsHouse = allIds.some(hid => agent_ids.includes(hid));
      if (battleAgentIsHouse) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { count: battleCount } = await admin
          .from('battles')
          .select('id', { count: 'exact', head: true })
          .or(allIds.map(id => `agent_a_id.eq.${id},agent_b_id.eq.${id}`).join(','))
          .gte('created_at', oneDayAgo);

        const { count: matchCount } = await admin
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(allIds.map(id => `white_agent_id.eq.${id},black_agent_id.eq.${id}`).join(','))
          .gte('created_at', oneDayAgo);

        if (((battleCount || 0) + (matchCount || 0)) >= 3) {
          return NextResponse.json(
            { error: 'Free-tier daily limit reached (3 games/day across all arenas). Upgrade with your own API key for unlimited games.' },
            { status: 429 }
          );
        }
      }
    }
  } catch {
    // use_platform_key column may not exist yet — skip rate limit
  }

  // Underground: block unclaimed agents
  if (is_underground && agents.some(a => a.user_id === null)) {
    return NextResponse.json(
      { error: 'Underground Arena requires all agents to be claimed by a human owner' },
      { status: 403 }
    );
  }

  // Underground: validate Honor >= 100 for both agents' owners
  if (is_underground) {
    const ownerIds = [...new Set(agents.map(a => a.user_id).filter(Boolean))];
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

  // Scheduled battles: insert row with status='scheduled', skip startMatch
  if (scheduled_for) {
    const scheduledDate = new Date(scheduled_for);
    if (scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'scheduled_for must be in the future' }, { status: 400 });
    }

    // Get current ELOs for the agents
    const eloPromises = agent_ids.map(id =>
      admin.from('agent_arena_stats').select('elo').eq('agent_id', id).eq('arena_type', arena_type === 'hottake' ? 'hottake' : arena_type).single()
    );
    const eloResults = await Promise.all(eloPromises);

    const { data: scheduledBattle, error: schedError } = await admin
      .from('battles')
      .insert({
        arena_type,
        agent_a_id: agent_ids[0],
        agent_b_id: agent_ids[1],
        agent_c_id: agent_ids[2] || null,
        status: 'scheduled' as const,
        prompt: battleTopic || `${arena_type} battle`,
        agent_a_elo_before: eloResults[0]?.data?.elo || 1200,
        agent_b_elo_before: eloResults[1]?.data?.elo || 1200,
        agent_c_elo_before: eloResults[2]?.data?.elo || null,
        scheduled_for: scheduled_for,
        is_underground: is_underground || false,
      })
      .select('*')
      .single();

    if (schedError || !scheduledBattle) {
      return NextResponse.json({ error: schedError?.message || 'Failed to schedule battle' }, { status: 500 });
    }

    return NextResponse.json(scheduledBattle as DbBattle, { status: 201 });
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
