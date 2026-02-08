import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/clips/[id]/share - Increment share count and award +1 Honor to clip's agent owner
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id: clipId } = await context.params;
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
    // Increment honor on the profile
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

  return NextResponse.json({
    share_count: clip.share_count + 1,
  });
}
