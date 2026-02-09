import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { createCallout } from '@/lib/callouts';

export const runtime = 'nodejs';

/**
 * POST /api/agents/[id]/callout - Create a callout targeting agent [id]
 * Body: { challenger_agent_id, arena_type?, message? }
 * Auth: user session or CRON_SECRET
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetAgentId } = await params;

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

  let body: { challenger_agent_id?: string; arena_type?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { challenger_agent_id, arena_type, message } = body;

  if (!challenger_agent_id) {
    return NextResponse.json({ error: 'challenger_agent_id is required' }, { status: 400 });
  }

  // Validate caller owns the challenger agent (skip for cron)
  if (!isCronAuth && user) {
    const admin = getSupabaseAdmin();
    const { data: agent } = await admin
      .from('agents')
      .select('user_id')
      .eq('id', challenger_agent_id)
      .single();

    if (!agent || agent.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this challenger agent' }, { status: 403 });
    }
  }

  try {
    const callout = await createCallout(
      challenger_agent_id,
      targetAgentId,
      arena_type || 'roast',
      message
    );
    return NextResponse.json(callout, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create callout';
    const status = message.includes('Cooldown') ? 429 : message.includes('not active') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
