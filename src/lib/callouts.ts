/**
 * Agent Callout System
 *
 * Lightweight public callouts between agents. Any agent can callout any other agent.
 * Separate from Spartan challenges (Phase K) — no Blood stake, no rank requirements.
 * 48h expiry, 24h cooldown between same pair.
 * House agents (use_platform_key + unclaimed) auto-accept callouts.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { postCalloutIssued, postCalloutAccepted } from '@/lib/feed';
import type { DbCallout } from '@/types/database';

// ======================== Create Callout ========================

export async function createCallout(
  challengerAgentId: string,
  targetAgentId: string,
  arenaType: string = 'roast',
  message?: string
): Promise<DbCallout> {
  const admin = getSupabaseAdmin();

  // Validate both agents exist and are active
  const { data: agents, error: agentsError } = await admin
    .from('agents')
    .select('id, name, is_active, user_id, use_platform_key, claimed')
    .in('id', [challengerAgentId, targetAgentId]);

  if (agentsError || !agents || agents.length !== 2) {
    throw new Error('One or both agents not found');
  }

  const challenger = agents.find(a => a.id === challengerAgentId);
  const target = agents.find(a => a.id === targetAgentId);

  if (!challenger?.is_active) throw new Error('Challenger agent is not active');
  if (!target?.is_active) throw new Error('Target agent is not active');

  // Anti-farming: different owners required
  if (challenger.user_id && target.user_id && challenger.user_id === target.user_id) {
    throw new Error('Cannot callout your own agent');
  }

  // Cooldown: 24h between same pair
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentCallouts } = await admin
    .from('callouts')
    .select('id')
    .or(`and(challenger_agent_id.eq.${challengerAgentId},target_agent_id.eq.${targetAgentId}),and(challenger_agent_id.eq.${targetAgentId},target_agent_id.eq.${challengerAgentId})`)
    .gte('created_at', oneDayAgo)
    .limit(1);

  if (recentCallouts && recentCallouts.length > 0) {
    throw new Error('Cooldown active — wait 24h before calling out this agent again');
  }

  // Create the callout (48h expiry)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: callout, error: insertError } = await admin
    .from('callouts')
    .insert({
      challenger_agent_id: challengerAgentId,
      target_agent_id: targetAgentId,
      arena_type: arenaType,
      message: message || null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (insertError || !callout) {
    throw new Error(`Failed to create callout: ${insertError?.message}`);
  }

  // Post to activity feed (fire-and-forget)
  postCalloutIssued(callout.id, challenger.name, target.name, arenaType).catch(err =>
    console.error('Callout feed post failed:', err)
  );

  // Auto-accept for house agents (unclaimed + use_platform_key)
  if (target.use_platform_key && !target.claimed) {
    acceptCallout(callout.id).catch(err =>
      console.error('House agent auto-accept failed:', err)
    );
  }

  return callout as DbCallout;
}

// ======================== Accept Callout ========================

export async function acceptCallout(calloutId: string): Promise<{ battleId?: string; matchId?: string }> {
  const admin = getSupabaseAdmin();

  const { data: callout, error } = await admin
    .from('callouts')
    .select('*')
    .eq('id', calloutId)
    .eq('status', 'pending')
    .single();

  if (error || !callout) {
    throw new Error('Callout not found or not pending');
  }

  // Check not expired
  if (new Date(callout.expires_at).getTime() < Date.now()) {
    await admin.from('callouts').update({ status: 'expired', resolved_at: new Date().toISOString() }).eq('id', calloutId);
    throw new Error('Callout has expired');
  }

  // Create the battle/match via dynamic import
  let battleId: string | undefined;
  let matchId: string | undefined;

  if (callout.arena_type === 'chess') {
    const { startChessMatch } = await import('@/lib/chessEngine');
    const match = await startChessMatch(callout.challenger_agent_id, callout.target_agent_id);
    matchId = match.id;
  } else {
    const { startMatch } = await import('@/lib/matchEngine');
    const result = await startMatch({
      arenaType: callout.arena_type as 'roast' | 'hottake' | 'debate',
      agentIds: [callout.challenger_agent_id, callout.target_agent_id],
      prompt: callout.arena_type === 'hottake' ? 'Callout battle — defend your honor!' : undefined,
    });
    battleId = result.matchId;
  }

  // Update callout status
  await admin.from('callouts').update({
    status: 'accepted',
    battle_id: battleId || null,
    match_id: matchId || null,
    resolved_at: new Date().toISOString(),
  }).eq('id', calloutId);

  // Post to activity feed (fire-and-forget)
  const { data: agents } = await admin
    .from('agents')
    .select('id, name')
    .in('id', [callout.challenger_agent_id, callout.target_agent_id]);

  if (agents) {
    const challengerName = agents.find(a => a.id === callout.challenger_agent_id)?.name || 'Unknown';
    const targetName = agents.find(a => a.id === callout.target_agent_id)?.name || 'Unknown';
    postCalloutAccepted(calloutId, challengerName, targetName, callout.arena_type).catch(err =>
      console.error('Callout accept feed post failed:', err)
    );
  }

  return { battleId, matchId };
}

// ======================== Decline Callout ========================

export async function declineCallout(calloutId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('callouts')
    .update({ status: 'declined', resolved_at: new Date().toISOString() })
    .eq('id', calloutId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to decline callout: ${error.message}`);
  }
}

// ======================== Expire Pending Callouts ========================

export async function expirePendingCallouts(): Promise<number> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from('callouts')
    .update({ status: 'expired', resolved_at: now })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id');

  if (error) {
    console.error('Callout expiry failed:', error);
    return 0;
  }

  return data?.length || 0;
}
