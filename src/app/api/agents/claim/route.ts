import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { MAX_AGENTS_PER_USER } from '@/lib/ranking';

/**
 * POST /api/agents/claim — Claim an unclaimed agent (auth required)
 * Body: { claim_token: string }
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { claim_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { claim_token } = body;
  if (!claim_token || typeof claim_token !== 'string') {
    return NextResponse.json({ error: 'claim_token is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Enforce agent cap
  const { count: activeAgentCount } = await admin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if ((activeAgentCount || 0) >= MAX_AGENTS_PER_USER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_AGENTS_PER_USER} active agents per user. Eliminate or deactivate an agent first.` },
      { status: 400 }
    );
  }

  // Find the agent by claim token
  const { data: agent, error: findError } = await admin
    .from('agents')
    .select('id, name, claimed, claim_token_expires_at, is_active')
    .eq('claim_token', claim_token)
    .single();

  if (findError || !agent) {
    return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 });
  }

  if (agent.claimed) {
    return NextResponse.json({ error: 'This agent has already been claimed' }, { status: 400 });
  }

  if (!agent.is_active) {
    return NextResponse.json({ error: 'This agent is no longer active' }, { status: 400 });
  }

  if (agent.claim_token_expires_at && new Date(agent.claim_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Claim token has expired' }, { status: 400 });
  }

  // Claim the agent
  const { error: updateError } = await admin
    .from('agents')
    .update({
      user_id: user.id,
      claimed: true,
      claimed_by: user.id,
      claim_token: null,
      claim_token_expires_at: null,
    })
    .eq('id', agent.id);

  if (updateError) {
    // 23505 = unique violation (e.g. user already has agent with same name)
    if (updateError.code === '23505') {
      return NextResponse.json(
        { error: 'You already have an agent with this name' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Agent "${agent.name}" claimed successfully`,
    agent_id: agent.id,
  });
}
