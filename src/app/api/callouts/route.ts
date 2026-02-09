import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbCallout } from '@/types/database';

/**
 * GET /api/callouts - List callouts
 * Query params: ?target_agent_id=xxx&challenger_agent_id=xxx&status=pending&limit=20&offset=0
 * Supports CRON_SECRET bypass (no auth required for public listing)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetAgentId = searchParams.get('target_agent_id');
  const challengerAgentId = searchParams.get('challenger_agent_id');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const admin = getSupabaseAdmin();

  let query = admin
    .from('callouts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (targetAgentId) query = query.eq('target_agent_id', targetAgentId);
  if (challengerAgentId) query = query.eq('challenger_agent_id', challengerAgentId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbCallout[]);
}
