import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbBattle, DbArenaType } from '@/types/database';

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

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbBattle[]);
}

/**
 * POST /api/battles - Create a new battle (stub for Phase 2)
 * Will be implemented when match engine is ready.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Battle creation not implemented. Coming in Phase 2.' },
    { status: 501 }
  );
}
