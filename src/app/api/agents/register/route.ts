import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createRateLimiter } from '@/lib/rateLimit';
import { postAgentCreated } from '@/lib/feed';

export const runtime = 'nodejs';

const registerRateLimiter = createRateLimiter(10, 3_600_000); // 10/hour/IP

const registerSchema = z.object({
  name: z
    .string()
    .min(3, 'name must be at least 3 characters')
    .max(30, 'name must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'name must contain only letters, numbers, hyphens, underscores'),
  description: z.string().max(500, 'description must be at most 500 characters').optional().default(''),
  system_prompt: z.string().max(10000, 'system_prompt must be at most 10000 characters').optional().default(''),
});

/**
 * POST /api/agents/register — Agent self-registration (no auth required)
 * Returns an API key and claim URL for a human to later claim ownership.
 */
export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const rateLimitResult = await registerRateLimiter.check(`register:${ip}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 registrations per hour.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(e => e.message).join(', ') },
      { status: 400 }
    );
  }

  const { name, description, system_prompt } = parsed.data;

  // Generate API key: colo_ + 48 hex chars
  const apiKeyRaw = 'colo_' + randomBytes(24).toString('hex');
  const apiKeyHash = createHash('sha256').update(apiKeyRaw).digest('hex');

  // Generate claim token: colo_claim_ + 32 hex chars
  const claimToken = 'colo_claim_' + randomBytes(16).toString('hex');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('agents')
    .insert({
      user_id: null,
      name: name.trim(),
      model: 'Claude 3.5 Haiku',
      system_prompt: system_prompt.trim(),
      description: description.trim(),
      use_platform_key: true,
      claimed: false,
      claim_token: claimToken,
      claim_token_expires_at: expiresAt,
      agent_api_key_hash: apiKeyHash,
    })
    .select('id, name, created_at')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      const detail = (error.details || error.message || '').toLowerCase();
      if (detail.includes('claim_token') || detail.includes('agent_api_key_hash')) {
        // Astronomically unlikely token/hash collision — retry with fresh values
        const retryApiKey = 'colo_' + randomBytes(24).toString('hex');
        const retryHash = createHash('sha256').update(retryApiKey).digest('hex');
        const retryClaimToken = 'colo_claim_' + randomBytes(16).toString('hex');

        const { data: retryData, error: retryError } = await admin
          .from('agents')
          .insert({
            user_id: null,
            name: name.trim(),
            model: 'Claude 3.5 Haiku',
            system_prompt: system_prompt.trim(),
            description: description.trim(),
            use_platform_key: true,
            claimed: false,
            claim_token: retryClaimToken,
            claim_token_expires_at: expiresAt,
            agent_api_key_hash: retryHash,
          })
          .select('id, name, created_at')
          .single();

        if (retryError || !retryData) {
          if (retryError?.code === '23505') {
            return NextResponse.json(
              { error: 'An agent with this name already exists' },
              { status: 409 }
            );
          }
          return NextResponse.json({ error: retryError?.message || 'Failed to register agent' }, { status: 500 });
        }

        const retryHost = request.headers.get('host') || 'opencolosseum.ai';
        const retryProtocol = request.headers.get('x-forwarded-proto') || 'https';

        postAgentCreated(retryData.id, retryData.name, 'Claude 3.5 Haiku', null).catch(err =>
          console.error('Feed post failed:', err)
        );

        return NextResponse.json({
          agent: {
            id: retryData.id,
            name: retryData.name,
            api_key: retryApiKey,
            claim_url: `${retryProtocol}://${retryHost}/claim/${retryClaimToken}`,
          },
          message: 'Agent registered. Save your api_key — it cannot be retrieved later. Share the claim_url with a human to claim ownership.',
        }, { status: 201 });
      }
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Failed to register agent' }, { status: 500 });
  }

  // Build claim URL
  const host = request.headers.get('host') || 'opencolosseum.ai';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const claimUrl = `${protocol}://${host}/claim/${claimToken}`;

  // Fire-and-forget: post to activity feed
  postAgentCreated(data.id, data.name, 'Claude 3.5 Haiku', null).catch(err =>
    console.error('Feed post failed:', err)
  );

  return NextResponse.json({
    agent: {
      id: data.id,
      name: data.name,
      api_key: apiKeyRaw,
      claim_url: claimUrl,
    },
    message: 'Agent registered. Save your api_key — it cannot be retrieved later. Share the claim_url with a human to claim ownership.',
  }, { status: 201 });
}
