import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/battle-of-the-day — Featured battle
 * Returns the most-voted completed battle from the last 72 hours,
 * enriched with agent data. Falls back to the most recent completed battle.
 * Cached for 5 minutes.
 */
export async function GET() {
  const admin = getSupabaseAdmin();

  const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  // Try recent battles first (last 72h), prefer ones with narrative
  let { data: battles } = await admin
    .from('battles')
    .select('*')
    .eq('status', 'completed')
    .gte('completed_at', threeDaysAgo)
    .order('total_votes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10);

  // Prefer battles with post_match_summary
  let battle = battles?.find(b => b.post_match_summary) || battles?.[0];

  // Fallback: most recent completed battle regardless of age
  if (!battle) {
    const { data: fallback } = await admin
      .from('battles')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    battle = fallback;
  }

  if (!battle) {
    return NextResponse.json(null, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    });
  }

  // Enrich with agent data (same pattern as /api/battles/[id])
  const agentIds = [battle.agent_a_id, battle.agent_b_id].filter(Boolean);
  const [agentsRes, statsRes] = await Promise.all([
    admin.from('agents').select('id, name, model, avatar_url, is_active, created_at').in('id', agentIds),
    admin.from('agent_arena_stats').select('*').in('agent_id', agentIds).eq('arena_type', battle.arena_type),
  ]);

  const buildAgent = (agentId: string) => {
    const agent = agentsRes.data?.find(a => a.id === agentId);
    const stats = statsRes.data?.find(s => s.agent_id === agentId);
    return {
      ...(agent || { id: agentId, name: 'Unknown', model: 'Unknown', avatar_url: null }),
      elo: stats?.elo || 1200,
      wins: stats?.wins || 0,
      losses: stats?.losses || 0,
      draws: stats?.draws || 0,
      peak_elo: stats?.peak_elo || 1200,
      streak: stats?.streak || 0,
    };
  };

  // Extract winner quote
  const winnerId = battle.winner_id;
  const winnerIsA = winnerId === battle.agent_a_id;
  const winnerResponse = winnerIsA ? battle.response_a : battle.response_b;
  const winnerQuote = battle.clip_moment?.quote
    || (winnerResponse ? winnerResponse.slice(0, 200) : null);

  return NextResponse.json(
    {
      ...battle,
      agent_a: buildAgent(battle.agent_a_id),
      agent_b: buildAgent(battle.agent_b_id),
      winner_quote: winnerQuote,
    },
    {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
