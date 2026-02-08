import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { apiRateLimiter } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/clips/[id]/share - Increment share count and award +1 Honor to clip's agent owner
 * Requires authentication. Rate-limited. One share per user per clip.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: clipId } = await context.params;

  // Auth required
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit per user
  const rateLimitResult = await apiRateLimiter.check(`clip-share:${user.id}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
    );
  }

  const admin = getSupabaseAdmin();

  // Fetch the clip
  const { data: clip, error: clipError } = await admin
    .from('clips')
    .select('id, agent_id, share_count')
    .eq('id', clipId)
    .single();

  if (clipError || !clip) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
  }

  // Prevent same user sharing same clip multiple times
  // Check activity_feed for existing clip_shared event from this user
  const { data: existingShare } = await admin
    .from('activity_feed')
    .select('id')
    .eq('event_type', 'clip_shared')
    .eq('target_id', clipId)
    .eq('actor_id', user.id)
    .limit(1)
    .maybeSingle();

  if (existingShare) {
    return NextResponse.json({ error: 'You have already shared this clip', share_count: clip.share_count }, { status: 409 });
  }

  // Increment share count
  const { error: updateError } = await admin
    .from('clips')
    .update({ share_count: clip.share_count + 1 })
    .eq('id', clipId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update share count' }, { status: 500 });
  }

  // Award +1 Honor to the agent's owner
  const { data: agent } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', clip.agent_id)
    .single();

  if (agent?.user_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('honor')
      .eq('id', agent.user_id)
      .single();

    if (profile) {
      await admin
        .from('profiles')
        .update({ honor: profile.honor + 1 })
        .eq('id', agent.user_id);
    }
  }

  // Record the share in activity feed (also serves as dedup record)
  try {
    await admin.from('activity_feed').insert({
      event_type: 'clip_shared',
      actor_type: 'user',
      actor_id: user.id,
      target_type: 'clip',
      target_id: clipId,
      headline: `A clip was shared`,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({
    share_count: clip.share_count + 1,
  });
}
