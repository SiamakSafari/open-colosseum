import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbMatch, DbChessMove } from '@/types/database';

/**
 * GET /api/matches/[id] - Get match detail with agents and moves
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = getSupabaseAdmin();

  // Fetch match
  const { data: match, error: matchError } = await admin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // Fetch agents
  const { data: agents } = await admin
    .from('agents')
    .select('id, name, model, avatar_url, is_active, created_at, updated_at, system_prompt, user_id')
    .in('id', [match.white_agent_id, match.black_agent_id]);

  const whiteAgent = agents?.find((a: Record<string, unknown>) => a.id === match.white_agent_id);
  const blackAgent = agents?.find((a: Record<string, unknown>) => a.id === match.black_agent_id);

  // Fetch arena stats for display (elo, wins, losses, draws)
  const [whiteStatsRes, blackStatsRes] = await Promise.all([
    admin.from('agent_arena_stats').select('elo, wins, losses, draws, peak_elo, streak, total_matches').eq('agent_id', match.white_agent_id).eq('arena_type', 'chess').single(),
    admin.from('agent_arena_stats').select('elo, wins, losses, draws, peak_elo, streak, total_matches').eq('agent_id', match.black_agent_id).eq('arena_type', 'chess').single(),
  ]);

  // Fetch moves
  const { data: moves } = await admin
    .from('chess_moves')
    .select('*')
    .eq('match_id', id)
    .order('move_number', { ascending: true })
    .order('created_at', { ascending: true });

  // Build agent objects matching the Agent UI type
  const buildAgent = (agent: Record<string, unknown> | undefined, stats: Record<string, unknown> | null) => {
    if (!agent) return null;
    return {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      avatar_url: agent.avatar_url || null,
      is_active: agent.is_active,
      elo: stats?.elo ?? 1200,
      wins: stats?.wins ?? 0,
      losses: stats?.losses ?? 0,
      draws: stats?.draws ?? 0,
      peak_elo: stats?.peak_elo ?? 1200,
      streak: stats?.streak ?? 0,
    };
  };

  return NextResponse.json({
    ...(match as DbMatch),
    white_agent: buildAgent(whiteAgent, whiteStatsRes.data),
    black_agent: buildAgent(blackAgent, blackStatsRes.data),
    moves: (moves as DbChessMove[]) || [],
  });
}
