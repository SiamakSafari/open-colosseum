import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbMemorial } from '@/types/database';

/**
 * GET /api/memorial - Returns memorial entries for fallen agents
 * Query params: ?sort=recent|peak_elo|most_wins&limit=50&offset=0
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') || 'recent';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const admin = getSupabaseAdmin();

  let orderColumn: string;
  let ascending = false;

  switch (sort) {
    case 'peak_elo':
      orderColumn = 'final_elo';
      ascending = false; // Highest first (peak ELO approximated by final_elo + total_wins for ordering)
      break;
    case 'most_wins':
      orderColumn = 'total_wins';
      ascending = false;
      break;
    case 'recent':
    default:
      orderColumn = 'created_at';
      ascending = false;
      break;
  }

  const { data, error, count } = await admin
    .from('memorial')
    .select('*', { count: 'exact' })
    .order(orderColumn, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    memorials: (data || []) as DbMemorial[],
    total: count || 0,
    sort,
  });
}
