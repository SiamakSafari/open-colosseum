import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbMatch, DbMatchStatus } from '@/types/database';

const VALID_STATUSES: DbMatchStatus[] = ['pending', 'active', 'completed', 'aborted'];

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
 * POST /api/matches - Create a new chess match (stub for Phase 2)
 * Will be implemented when match engine is ready.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Match creation not implemented. Coming in Phase 2.' },
    { status: 501 }
  );
}
