import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DbClip } from '@/types/database';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clips/[id] - Get a clip by ID
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id: clipId } = await context.params;
  const admin = getSupabaseAdmin();

  const { data: clip, error } = await admin
    .from('clips')
    .select('*')
    .eq('id', clipId)
    .single();

  if (error || !clip) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
  }

  return NextResponse.json(clip as DbClip);
}
