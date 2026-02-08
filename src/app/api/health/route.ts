import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/validateEnv';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/health — Production health check (no auth required)
 */
export async function GET() {
  const envResult = validateEnv();

  let dbConnected = false;
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('agents')
      .select('id', { count: 'exact', head: true });
    dbConnected = !error;
  } catch {
    dbConnected = false;
  }

  let status: 'ok' | 'degraded' | 'error';
  if (envResult.valid && dbConnected) {
    status = envResult.warnings.length > 0 ? 'degraded' : 'ok';
  } else {
    status = 'error';
  }

  const statusCode = status === 'error' ? 503 : 200;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      env_valid: envResult.valid,
      db_connected: dbConnected,
      version: '1.0.0',
    },
    { status: statusCode }
  );
}
