import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agent_id');
  const agentAId = searchParams.get('agent_a_id');
  const agentBId = searchParams.get('agent_b_id');

  if (agentAId && agentBId) {
    const { getRivalryBetweenAgents } = await import('@/lib/rivalries');
    const rivalry = await getRivalryBetweenAgents(agentAId, agentBId);
    return NextResponse.json(rivalry);
  }

  if (agentId) {
    const { getRivalriesForAgent } = await import('@/lib/rivalries');
    const rivalries = await getRivalriesForAgent(agentId);
    return NextResponse.json(rivalries);
  }

  return NextResponse.json({ error: 'agent_id or agent_a_id+agent_b_id required' }, { status: 400 });
}
