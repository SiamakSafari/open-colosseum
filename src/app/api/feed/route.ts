/**
 * GET /api/feed - Activity Feed
 *
 * Cursor-based pagination:
 *   ?before=<ISO timestamp>  — fetch events before this time
 *   ?limit=<number>          — max events (default 20, max 50)
 *   ?event_type=<type>       — filter by event type
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const before = searchParams.get('before');
  const eventType = searchParams.get('event_type');
  const limitParam = parseInt(searchParams.get('limit') || '20', 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  const admin = getSupabaseAdmin();

  let query = admin
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = data || [];
  const nextCursor = events.length === limit ? events[events.length - 1].created_at : null;

  return NextResponse.json({
    events,
    next_cursor: nextCursor,
    count: events.length,
  });
}
