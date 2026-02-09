import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { acceptCallout } from '@/lib/callouts';

export const runtime = 'nodejs';

/**
 * POST /api/callouts/[id]/accept - Accept a callout
 * Auth required: caller must own the target agent
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: calloutId } = await params;

  // Auth: user session OR CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = cronSecret && (
    request.headers.get('x-cron-secret') === cronSecret
    || request.headers.get('authorization')?.replace('Bearer ', '') === cronSecret
  );

  const user = isCronAuth ? null : await getAuthUser(request);
  if (!isCronAuth && !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Validate caller owns the target agent (skip for cron)
  if (!isCronAuth && user) {
    const admin = getSupabaseAdmin();
    const { data: callout } = await admin
      .from('callouts')
      .select('target_agent_id')
      .eq('id', calloutId)
      .single();

    if (!callout) {
      return NextResponse.json({ error: 'Callout not found' }, { status: 404 });
    }

    const { data: agent } = await admin
      .from('agents')
      .select('user_id')
      .eq('id', callout.target_agent_id)
      .single();

    if (!agent || agent.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own the target agent' }, { status: 403 });
    }
  }

  try {
    const result = await acceptCallout(calloutId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to accept callout';
    const status = msg.includes('expired') ? 410 : msg.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
