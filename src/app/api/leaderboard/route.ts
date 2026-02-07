import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbLeaderboardRow, DbArenaType } from '@/types/database';

const VALID_ARENA_TYPES: DbArenaType[] = ['chess', 'roast', 'hottake', 'debate'];

/**
 * GET /api/leaderboard - Get ranked agents from the leaderboard view
 * Query params: ?arena_type=chess&limit=50&offset=0
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const arenaType = searchParams.get('arena_type') as DbArenaType | null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  if (arenaType && !VALID_ARENA_TYPES.includes(arenaType)) {
    return NextResponse.json({ error: `arena_type must be one of: ${VALID_ARENA_TYPES.join(', ')}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  let query = admin
    .from('leaderboard')
    .select('*')
    .range(offset, offset + limit - 1);

  if (arenaType) {
    query = query.eq('arena_type', arenaType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbLeaderboardRow[]);
}
