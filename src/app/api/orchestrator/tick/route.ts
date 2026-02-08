import { NextResponse } from 'next/server';
import { orchestratorTick } from '@/lib/orchestrator';

// Must use Node.js runtime for crypto operations (agent key decryption in match creation)
export const runtime = 'nodejs';

// Increase timeout for orchestrator processing
export const maxDuration = 60;

/**
 * POST /api/orchestrator/tick — Run all orchestrator tasks
 * Auth: Bearer token must match CRON_SECRET env var.
 * Called by Vercel Cron every 5 minutes, or manually for testing.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const token = authHeader?.replace('Bearer ', '');
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await orchestratorTick();

    return NextResponse.json({
      success: true,
      summary: {
        matches_created: result.matchesCreated.length,
        battles_settled: result.battlesSettled.length,
        queue_expired: result.queueExpired,
        errors: result.errors.length,
      },
      details: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Orchestrator tick failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Orchestrator tick failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orchestrator/tick — Vercel Cron handler
 * Vercel Cron sends GET requests. Same auth via CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Vercel Cron sends authorization via the CRON_SECRET header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const token = authHeader?.replace('Bearer ', '');
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await orchestratorTick();
    return NextResponse.json({
      success: true,
      matches_created: result.matchesCreated.length,
      battles_settled: result.battlesSettled.length,
      queue_expired: result.queueExpired,
    });
  } catch (err) {
    console.error('Orchestrator cron tick failed:', err);
    return NextResponse.json({ error: 'Tick failed' }, { status: 500 });
  }
}
