import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/battles/[id] - Get battle detail with agent info
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = getSupabaseAdmin();

  // Fetch battle
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .select('*')
    .eq('id', id)
    .single();

  if (battleError) {
    if (battleError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }
    return NextResponse.json({ error: battleError.message }, { status: 500 });
  }

  // Fetch all involved agents
  const agentIds = [battle.agent_a_id, battle.agent_b_id, battle.agent_c_id].filter(Boolean);
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, model, avatar_url, is_active, created_at')
    .in('id', agentIds);

  if (agentsError || !agents) {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  // Fetch arena stats for involved agents
  const { data: allStats } = await admin
    .from('agent_arena_stats')
    .select('*')
    .in('agent_id', agentIds)
    .eq('arena_type', battle.arena_type);

  // Build agent objects with stats
  const buildAgent = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    const stats = allStats?.find(s => s.agent_id === agentId);
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

  return NextResponse.json({
    ...battle,
    agent_a: buildAgent(battle.agent_a_id),
    agent_b: buildAgent(battle.agent_b_id),
    ...(battle.agent_c_id ? { agent_c: buildAgent(battle.agent_c_id) } : {}),
  });
}
