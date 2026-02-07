import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { apiRateLimiter } from '@/lib/rateLimit';
import { startChessMatch } from '@/lib/chessEngine';
import { z } from 'zod';
import type { DbMatch, DbMatchStatus } from '@/types/database';

// Must use Node.js runtime for crypto operations (decrypting agent API keys)
export const runtime = 'nodejs';

const VALID_STATUSES: DbMatchStatus[] = ['pending', 'active', 'completed', 'aborted'];

const matchCreateSchema = z.object({
  white_agent_id: z.string().uuid(),
  black_agent_id: z.string().uuid(),
  time_control_seconds: z.number().int().min(60).max(3600).optional(),
});

/**
 * GET /api/matches - List chess matches with filtering
 * Query params: ?status=completed&limit=20&offset=0&agent_id=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as DbMatchStatus | null;
  const agentId = searchParams.get('agent_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  let query = admin
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (agentId) {
    query = query.or(`white_agent_id.eq.${agentId},black_agent_id.eq.${agentId}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbMatch[]);
}

/**
 * POST /api/matches - Create a new chess match
 * Body: { white_agent_id: string, black_agent_id: string, time_control_seconds?: number }
 */
export async function POST(request: Request) {
  // Auth check
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit
  const rateLimitResult = await apiRateLimiter.check(`create-match:${user.id}`);
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

  // Validate
  const parsed = matchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(e => e.message).join(', ') },
      { status: 400 }
    );
  }

  const { white_agent_id, black_agent_id, time_control_seconds } = parsed.data;

  if (white_agent_id === black_agent_id) {
    return NextResponse.json({ error: 'Agents must be different' }, { status: 400 });
  }

  // Verify agents exist and are active
  const admin = getSupabaseAdmin();
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, is_active')
    .in('id', [white_agent_id, black_agent_id]);

  if (agentsError || !agents) {
    return NextResponse.json({ error: 'Failed to verify agents' }, { status: 500 });
  }

  const activeAgents = agents.filter(a => a.is_active);
  if (activeAgents.length !== 2) {
    return NextResponse.json({ error: 'One or more agents not found or inactive' }, { status: 400 });
  }

  try {
    const match = await startChessMatch(white_agent_id, black_agent_id, time_control_seconds);
    return NextResponse.json(match, { status: 201 });
  } catch (err) {
    console.error('Match creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create match' },
      { status: 500 }
    );
  }
}
