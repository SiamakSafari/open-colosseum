import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { encrypt } from '@/lib/encryption';
import { apiRateLimiter } from '@/lib/rateLimit';
import type { DbAgentPublic } from '@/types/database';
import { postAgentCreated } from '@/lib/feed';
import { MAX_AGENTS_PER_USER } from '@/lib/ranking';

// Must use Node.js runtime for crypto operations (encryption)
export const runtime = 'nodejs';

/**
 * GET /api/agents - List all active agents (public data only)
 * Query params: ?limit=20&offset=0&user_id=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const userId = searchParams.get('user_id');

  const admin = getSupabaseAdmin();

  let query = admin
    .from('agents')
    .select('id, user_id, name, model, system_prompt, avatar_url, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbAgentPublic[]);
}

/**
 * POST /api/agents - Create a new agent (authenticated)
 * Body: { name, model, api_key?, system_prompt? }
 */
export async function POST(request: Request) {
  // Auth check
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit
  const rateLimitResult = await apiRateLimiter.check(`create-agent:${user.id}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
    );
  }

  const admin = getSupabaseAdmin();

  // Agent cap enforcement (max 3 active agents per user)
  const { count: activeAgentCount } = await admin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if ((activeAgentCount || 0) >= MAX_AGENTS_PER_USER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_AGENTS_PER_USER} active agents per user. Eliminate or deactivate an agent first.` },
      { status: 400 }
    );
  }

  let body: { name?: string; model?: string; api_key?: string; system_prompt?: string; use_platform_key?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, api_key, system_prompt, use_platform_key } = body;
  // House agents are forced to Claude 3.5 Haiku
  const model = use_platform_key ? 'Claude 3.5 Haiku' : body.model;

  // Validation
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (name.length < 3 || name.length > 30) {
    return NextResponse.json({ error: 'name must be 3-30 characters' }, { status: 400 });
  }
  if (!model || typeof model !== 'string') {
    return NextResponse.json({ error: 'model is required' }, { status: 400 });
  }

  // Premium agents must provide an API key
  if (!use_platform_key && (!api_key || typeof api_key !== 'string')) {
    return NextResponse.json({ error: 'API key is required for premium agents. Use use_platform_key for free tier.' }, { status: 400 });
  }

  // Encrypt API key if provided
  let apiKeyEncrypted: string | null = null;
  if (api_key && typeof api_key === 'string') {
    try {
      apiKeyEncrypted = encrypt(api_key);
    } catch (err) {
      console.error('Encryption error:', err);
      return NextResponse.json({ error: 'Failed to encrypt API key. Check ENCRYPTION_KEY config.' }, { status: 500 });
    }
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name: name.trim(),
    model: model.trim(),
    api_key_encrypted: apiKeyEncrypted,
    system_prompt: system_prompt?.trim() || '',
  };
  // Add use_platform_key if the column exists (migration_010)
  if (use_platform_key) insertPayload.use_platform_key = true;

  let { data, error } = await admin
    .from('agents')
    .insert(insertPayload)
    .select('id, user_id, name, model, system_prompt, avatar_url, is_active, created_at, updated_at')
    .single();

  // If use_platform_key column doesn't exist yet, retry without it
  if (error && use_platform_key && error.message?.includes('use_platform_key')) {
    delete insertPayload.use_platform_key;
    const retry = await admin
      .from('agents')
      .insert(insertPayload)
      .select('id, user_id, name, model, system_prompt, avatar_url, is_active, created_at, updated_at')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'You already have an agent with this name' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create agent' }, { status: 500 });
  }

  // Post to activity feed (fire-and-forget)
  postAgentCreated(data.id, data.name, data.model, user.id).catch(err =>
    console.error('Feed post failed:', err)
  );

  return NextResponse.json(data as DbAgentPublic, { status: 201 });
}
