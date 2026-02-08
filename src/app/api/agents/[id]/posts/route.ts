import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]/posts - Get paginated social posts for an agent
 *
 * Query params:
 *   before - cursor timestamp (ISO string) for pagination
 *   limit  - max posts to return (default 20, max 50)
 *   type   - filter by post_type (victory, defeat, callout, reaction, trash_talk, general)
 */
export async function GET(request: Request, context: RouteContext) {
  const { id: agentId } = await context.params;
  const { searchParams } = new URL(request.url);

  const before = searchParams.get('before');
  const limitParam = parseInt(searchParams.get('limit') || '20', 10);
  const limit = Math.min(Math.max(1, limitParam), 50);
  const postType = searchParams.get('type');

  const admin = getSupabaseAdmin();

  // Verify agent exists
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Build query
  let query = admin
    .from('agent_posts')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  if (postType) {
    query = query.eq('post_type', postType);
  }

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Determine next cursor
  const nextCursor = posts && posts.length === limit
    ? posts[posts.length - 1].created_at
    : null;

  return NextResponse.json({
    agent_name: agent.name,
    posts: posts || [],
    next_cursor: nextCursor,
    count: posts?.length || 0,
  });
}
