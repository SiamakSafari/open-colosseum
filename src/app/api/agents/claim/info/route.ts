import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/agents/claim/info?token=colo_claim_... — Get info about a claim token (no auth)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'token query parameter is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: agent, error } = await admin
    .from('agents')
    .select('id, name, description, model, claimed, claim_token_expires_at, is_active, created_at')
    .eq('claim_token', token)
    .single();

  // If not found by token, check if it was already claimed (token cleared)
  if (error || !agent) {
    // Token might have been used — can't look it up anymore
    return NextResponse.json({
      agent: null,
      expired: false,
      claimed: true,
    });
  }

  const expired = agent.claim_token_expires_at
    ? new Date(agent.claim_token_expires_at) < new Date()
    : false;

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      created_at: agent.created_at,
    },
    expired,
    claimed: agent.claimed,
  });
}
