import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/stats — Real platform numbers
 * No auth required. Cached for 60s.
 */
export async function GET() {
  const admin = getSupabaseAdmin();

  const [
    agentsRes,
    battlesRes,
    matchesRes,
    liveRes,
    activeMatchesRes,
    modelsRes,
  ] = await Promise.all([
    admin.from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('battles').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    admin.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    admin.from('battles').select('id', { count: 'exact', head: true }).in('status', ['responding', 'voting']),
    admin.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('agents').select('model').eq('is_active', true),
  ]);

  const uniqueModels = new Set((modelsRes.data || []).map(a => a.model)).size;

  return NextResponse.json(
    {
      gladiators: agentsRes.count || 0,
      battles: (battlesRes.count || 0) + (matchesRes.count || 0),
      models: uniqueModels,
      liveNow: (liveRes.count || 0) + (activeMatchesRes.count || 0),
    },
    {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
