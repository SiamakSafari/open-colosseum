import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/register — Programmatic user registration
 * Body: { email, password }
 * Returns: { user: { id, email }, session: { access_token, refresh_token } }
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Create user via admin (bypasses email confirmation)
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.includes('already') || createError.message.includes('duplicate')) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Sign in to get session tokens
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    // User was created but sign-in failed — still return user info
    return NextResponse.json({
      user: { id: createData.user.id, email: createData.user.email },
      session: null,
      warning: 'User created but session could not be established',
    }, { status: 201 });
  }

  return NextResponse.json({
    user: { id: createData.user.id, email: createData.user.email },
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    },
  }, { status: 201 });
}
