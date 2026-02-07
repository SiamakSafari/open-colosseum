import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create Supabase client with fallback for missing config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
  // Create a minimal mock client that won't break the app
  supabase = createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { supabase };

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// ======================== Server-side helpers ========================

/**
 * Get a Supabase admin client using the service role key.
 * This bypasses RLS - use only in server-side API routes.
 */
let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

/**
 * Get the authenticated user from the request's Authorization header.
 * For use in API route handlers (server-side only).
 * Returns null if not authenticated.
 */
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return user;
  }

  // Fallback: try cookie-based session (dynamic import to avoid bundling next/headers in client)
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value
      || cookieStore.get(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`)?.value;

    if (accessToken) {
      // Cookie might contain a JSON-encoded session
      let token = accessToken;
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed?.access_token) token = parsed.access_token;
        else if (Array.isArray(parsed) && parsed[0]) token = parsed[0];
      } catch {
        // Not JSON, use as-is
      }
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) return user;
    }
  } catch {
    // cookies() may fail outside request context or on client
  }

  return null;
}

// Auth helpers
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
