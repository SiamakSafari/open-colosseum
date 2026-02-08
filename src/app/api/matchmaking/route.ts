import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { apiRateLimiter } from '@/lib/rateLimit';
import { tryInstantMatch } from '@/lib/orchestrator';
import { z } from 'zod';

// Must use Node.js runtime for crypto operations (decrypting agent API keys if instant match)
export const runtime = 'nodejs';

const queueSchema = z.object({
  agent_id: z.string().uuid(),
  arena_type: z.enum(['roast', 'hottake', 'chess', 'debate']),
  challenge_agent_id: z.string().uuid().optional(),
});

/**
 * POST /api/matchmaking — Add agent to matchmaking queue
 * If a compatible opponent is already waiting, creates an instant match.
 * Otherwise, adds to queue with 'waiting' status.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const rateLimitResult = await apiRateLimiter.check(`matchmaking:${user.id}`);
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

  const parsed = queueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(e => e.message).join(', ') },
      { status: 400 }
    );
  }

  const { agent_id, arena_type, challenge_agent_id } = parsed.data;

  const admin = getSupabaseAdmin();

  // Verify agent exists, is active, and belongs to user
  const { data: agent } = await admin
    .from('agents')
    .select('id, is_active, user_id')
    .eq('id', agent_id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  if (!agent.is_active) {
    return NextResponse.json({ error: 'Agent is not active (possibly eliminated)' }, { status: 400 });
  }
  if (agent.user_id !== user.id) {
    return NextResponse.json({ error: 'You can only queue your own agents' }, { status: 403 });
  }

  // Check if agent is already in queue
  const { data: existing } = await admin
    .from('matchmaking_queue')
    .select('id, status, arena_type')
    .eq('agent_id', agent_id)
    .eq('status', 'waiting')
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Agent is already in queue', queue_entry: existing },
      { status: 409 }
    );
  }

  // Validate challenge target exists and is active
  if (challenge_agent_id) {
    const { data: target } = await admin
      .from('agents')
      .select('id, is_active')
      .eq('id', challenge_agent_id)
      .single();

    if (!target || !target.is_active) {
      return NextResponse.json({ error: 'Challenge target not found or inactive' }, { status: 400 });
    }
    if (challenge_agent_id === agent_id) {
      return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
    }
  }

  // Insert into queue
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const { data: queueEntry, error: insertError } = await admin
    .from('matchmaking_queue')
    .insert({
      agent_id,
      arena_type,
      challenge_agent_id: challenge_agent_id || null,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (insertError || !queueEntry) {
    return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
  }

  // Try instant match — check if a compatible opponent is already waiting
  try {
    const instantResult = await tryInstantMatch(
      queueEntry.id,
      agent_id,
      arena_type,
      challenge_agent_id
    );

    if (instantResult) {
      return NextResponse.json({
        status: 'matched',
        queue_entry_id: queueEntry.id,
        battle_id: instantResult.battleId || null,
        match_id: instantResult.matchId || null,
      }, { status: 201 });
    }
  } catch (err) {
    console.error('Instant match attempt failed:', err);
    // Fall through to waiting state — will be matched on next orchestrator tick
  }

  return NextResponse.json({
    status: 'waiting',
    queue_entry_id: queueEntry.id,
    arena_type,
    expires_at: expiresAt,
    message: 'Waiting for opponent. You will be matched automatically.',
  }, { status: 201 });
}

/**
 * GET /api/matchmaking — Check queue status for an agent
 * Query: ?agent_id=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');

  if (!agentId) {
    return NextResponse.json({ error: 'agent_id required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: entry } = await admin
    .from('matchmaking_queue')
    .select('*')
    .eq('agent_id', agentId)
    .in('status', ['waiting', 'matched'])
    .order('queued_at', { ascending: false })
    .limit(1)
    .single();

  if (!entry) {
    return NextResponse.json({ status: 'none', message: 'Agent is not in queue' });
  }

  return NextResponse.json({
    status: entry.status,
    queue_entry_id: entry.id,
    arena_type: entry.arena_type,
    battle_id: entry.battle_id,
    match_id: entry.match_id,
    queued_at: entry.queued_at,
    expires_at: entry.expires_at,
  });
}

/**
 * DELETE /api/matchmaking — Cancel a queue entry
 * Body: { agent_id: string }
 */
export async function DELETE(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agent_id } = body as { agent_id?: string };
  if (!agent_id) {
    return NextResponse.json({ error: 'agent_id required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Verify ownership
  const { data: agent } = await admin
    .from('agents')
    .select('id, user_id')
    .eq('id', agent_id)
    .single();

  if (!agent || agent.user_id !== user.id) {
    return NextResponse.json({ error: 'Agent not found or not owned by you' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('matchmaking_queue')
    .update({ status: 'cancelled' })
    .eq('agent_id', agent_id)
    .eq('status', 'waiting')
    .select('id');

  if (error) {
    return NextResponse.json({ error: 'Failed to cancel queue entry' }, { status: 500 });
  }

  return NextResponse.json({
    cancelled: data?.length || 0,
    message: data?.length ? 'Queue entry cancelled' : 'No waiting entry found',
  });
}
