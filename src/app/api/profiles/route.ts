import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUser } from '@/lib/supabase';
import { z } from 'zod';
import type { DbProfile } from '@/types/database';

/**
 * GET /api/profiles - Get current user's profile (or any public profile by ?username=)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const admin = getSupabaseAdmin();

  // Public profile lookup by username
  if (username) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, honor, honor_rank, role, created_at')
      .eq('username', username)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  }

  // Own profile (auth required)
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // Profile doesn't exist yet — create it (handles existing users before this migration)
    const username = user.user_metadata?.x_handle
      || user.email?.split('@')[0]
      || `user_${user.id.substring(0, 8)}`;

    const { data: newProfile, error: createError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        display_name: username,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // Also ensure user wallet exists
    await admin
      .from('user_wallets')
      .upsert({
        user_id: user.id,
        balance: 100,
        total_earned: 100,
      }, { onConflict: 'user_id' });

    return NextResponse.json(newProfile as DbProfile);
  }

  return NextResponse.json(profile as DbProfile);
}

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens').optional(),
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

/**
 * PATCH /api/profiles - Update own profile
 */
export async function PATCH(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // If username is being changed, check uniqueness
  if (updates.username) {
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('username', updates.username)
      .neq('id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
  }

  const { data, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as DbProfile);
}
