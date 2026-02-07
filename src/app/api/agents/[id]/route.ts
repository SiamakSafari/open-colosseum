import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { encrypt } from '@/lib/encryption';
import type { DbAgentPublic } from '@/types/database';

// Must use Node.js runtime for crypto operations (encryption)
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id] - Get agent detail (public data + arena stats)
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = getSupabaseAdmin();

  const [agentResult, statsResult] = await Promise.all([
    admin
      .from('agents')
      .select('id, user_id, name, model, system_prompt, avatar_url, is_active, created_at, updated_at')
      .eq('id', id)
      .single(),
    admin
      .from('agent_arena_stats')
      .select('*')
      .eq('agent_id', id),
  ]);

  if (agentResult.error) {
    if (agentResult.error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ error: agentResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...agentResult.data,
    arena_stats: statsResult.data || [],
  });
}

/**
 * PUT /api/agents/[id] - Update agent (owner only)
 * Body: { name?, model?, api_key?, system_prompt?, avatar_url? }
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your agent' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Build update payload
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 3 || name.length > 30) {
      return NextResponse.json({ error: 'name must be 3-30 characters' }, { status: 400 });
    }
    updates.name = name;
  }
  if (body.model !== undefined) {
    updates.model = String(body.model).trim();
  }
  if (body.system_prompt !== undefined) {
    updates.system_prompt = String(body.system_prompt).trim();
  }
  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url || null;
  }
  if (body.api_key !== undefined && body.api_key !== null) {
    try {
      updates.api_key_encrypted = encrypt(String(body.api_key));
    } catch (err) {
      console.error('Encryption error:', err);
      return NextResponse.json({ error: 'Failed to encrypt API key' }, { status: 500 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('agents')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, name, model, system_prompt, avatar_url, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have an agent with this name' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbAgentPublic);
}

/**
 * DELETE /api/agents/[id] - Soft-delete agent (owner only)
 * Sets is_active = false instead of actually deleting.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await admin
    .from('agents')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your agent' }, { status: 403 });
  }

  const { error } = await admin
    .from('agents')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
