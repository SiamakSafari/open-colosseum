import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findOptimalMatch, findAnyMatch, getMatchmakingStats } from '@/lib/matchmaking';
import { startMatch } from '@/lib/matchEngine';
import type { ArenaType } from '@/types/database';

/**
 * GET /api/matchmaking - Get matchmaking stats or find matches
 * Query params: 
 *   ?arena_type=roast&stats=true - Get arena statistics
 *   ?arena_type=roast&agent_id=xxx - Find optimal match for agent
 *   ?arena_type=roast&agent_id=xxx&execute=true - Find and start match
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const arenaType = searchParams.get('arena_type') as ArenaType | null;
  const agentId = searchParams.get('agent_id');
  const showStats = searchParams.get('stats') === 'true';
  const execute = searchParams.get('execute') === 'true';

  if (!arenaType || !['roast', 'hottake', 'debate'].includes(arenaType)) {
    return NextResponse.json({ 
      error: 'arena_type is required and must be one of: roast, hottake, debate' 
    }, { status: 400 });
  }

  // Return arena statistics
  if (showStats) {
    try {
      const stats = await getMatchmakingStats(arenaType);
      return NextResponse.json(stats);
    } catch (error) {
      console.error('Matchmaking stats error:', error);
      return NextResponse.json({ 
        error: 'Failed to get matchmaking stats' 
      }, { status: 500 });
    }
  }

  // Find match for specific agent
  if (!agentId) {
    return NextResponse.json({ 
      error: 'agent_id is required when not requesting stats' 
    }, { status: 400 });
  }

  // Verify agent exists and is active
  const admin = getSupabaseAdmin();
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('id, name, is_active')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ 
      error: 'Agent not found' 
    }, { status: 404 });
  }

  if (!agent.is_active) {
    return NextResponse.json({ 
      error: 'Agent is not active' 
    }, { status: 400 });
  }

  try {
    // Try optimal matching first
    let match = await findOptimalMatch(arenaType, agentId);
    
    // Fall back to any available match if optimal fails
    if (!match) {
      match = await findAnyMatch(arenaType, agentId);
    }

    if (!match) {
      return NextResponse.json({ 
        error: 'No suitable opponents found',
        suggestions: ['Try again later', 'Check that other agents are active in this arena']
      }, { status: 404 });
    }

    // If execute=true, actually start the battle
    if (execute) {
      try {
        const agentIds = [match.agentA, match.agentB];
        if (match.agentC) agentIds.push(match.agentC);

        // Generate topic for hottake battles
        let topic: string | undefined;
        if (arenaType === 'hottake') {
          const topics = [
            "Pineapple belongs on pizza",
            "Remote work is killing corporate culture", 
            "AI will replace human creativity",
            "Social media was a mistake",
            "Cryptocurrency is just digital gambling",
            "The metaverse is already dead",
            "GenZ has the worst work ethic in history",
            "Influencers provide more value than traditional media",
            "Cancel culture is just accountability",
            "NFTs were the greatest scam in tech history"
          ];
          topic = topics[Math.floor(Math.random() * topics.length)];
        } else if (arenaType === 'debate') {
          const debateTopics = [
            "Is artificial intelligence a threat to humanity?",
            "Should social media platforms be regulated like utilities?", 
            "Is remote work better for productivity and work-life balance?",
            "Should cryptocurrency replace traditional banking?",
            "Is climate change best addressed through technology or policy?",
            "Should AI-generated content be labeled and regulated?",
            "Is the gig economy liberating or exploitative?",
            "Should genetic engineering be used to enhance humans?",
            "Is privacy dead in the digital age?",
            "Should universal basic income replace welfare systems?"
          ];
          topic = debateTopics[Math.floor(Math.random() * debateTopics.length)];
        }

        const result = await startMatch({
          arenaType,
          agentIds,
          prompt: topic,
        });

        return NextResponse.json({
          match,
          battleId: result.matchId,
          topic,
          executed: true,
        });
      } catch (startError) {
        console.error('Failed to start match:', startError);
        return NextResponse.json({
          match,
          executed: false,
          error: startError instanceof Error ? startError.message : 'Failed to start battle',
        });
      }
    }

    // Just return the match suggestion without executing
    return NextResponse.json({ match });

  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ 
      error: 'Matchmaking failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/matchmaking - Create optimized matches for multiple agents
 * Body: { arena_type: 'roast', agent_ids: ['id1', 'id2', ...], max_battles: 5 }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
  }

  const { arena_type, agent_ids, max_battles } = body as Record<string, unknown>;

  if (!arena_type || !['roast', 'hottake', 'debate'].includes(arena_type as string)) {
    return NextResponse.json({ 
      error: 'arena_type is required and must be one of: roast, hottake, debate' 
    }, { status: 400 });
  }

  if (!Array.isArray(agent_ids) || agent_ids.length === 0) {
    return NextResponse.json({ 
      error: 'agent_ids must be a non-empty array' 
    }, { status: 400 });
  }

  const maxBattles = typeof max_battles === 'number' ? Math.min(max_battles, 10) : 5;
  const arenaType = arena_type as ArenaType;

  const admin = getSupabaseAdmin();

  // Verify all agents exist and are active
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, is_active')
    .in('id', agent_ids);

  if (agentsError || !agents) {
    return NextResponse.json({ 
      error: 'Failed to verify agents' 
    }, { status: 500 });
  }

  const activeAgentIds = agents
    .filter(a => a.is_active)
    .map(a => a.id);

  if (activeAgentIds.length === 0) {
    return NextResponse.json({ 
      error: 'No active agents found' 
    }, { status: 400 });
  }

  const results: {
    agent_id: string;
    agent_name: string;
    match?: any;
    error?: string;
  }[] = [];

  // Find matches for each agent
  for (const agentId of activeAgentIds.slice(0, maxBattles)) {
    const agent = agents.find(a => a.id === agentId);
    const result = {
      agent_id: agentId,
      agent_name: agent?.name || 'Unknown',
    };

    try {
      // Try optimal matching
      let match = await findOptimalMatch(arenaType, agentId);
      
      // Fall back to any match
      if (!match) {
        match = await findAnyMatch(arenaType, agentId);
      }

      if (match) {
        result.match = match;
      } else {
        result.error = 'No suitable opponents found';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Matchmaking failed';
    }

    results.push(result);
  }

  const successful = results.filter(r => r.match).length;
  const failed = results.filter(r => r.error).length;

  return NextResponse.json({
    results,
    summary: {
      total_requested: activeAgentIds.length,
      successful_matches: successful,
      failed_matches: failed,
      arena_type: arenaType,
    },
  });
}