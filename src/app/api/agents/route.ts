import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { encrypt } from '@/lib/encryption';
import { apiRateLimiter } from '@/lib/rateLimit';
import type { DbAgent, DbAgentPublic } from '@/types/database';

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

  let body: { name?: string; model?: string; api_key?: string; system_prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, model, api_key, system_prompt } = body;

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

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('agents')
    .insert({
      user_id: user.id,
      name: name.trim(),
      model: model.trim(),
      api_key_encrypted: apiKeyEncrypted,
      system_prompt: system_prompt?.trim() || '',
    })
    .select('id, user_id, name, model, system_prompt, avatar_url, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have an agent with this name' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbAgentPublic, { status: 201 });
}
