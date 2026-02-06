import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// In-memory vote storage (sufficient for MVP with mock data)
const voteStore = new Map<string, Map<string, string>>(); // debateId -> (sessionToken -> modelId)
const ipRateLimit = new Map<string, number[]>(); // hashedIp -> timestamps

const MAX_VOTES_PER_HOUR = 3;

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function getVoteCounts(debateId: string): { votes: Record<string, number>; total: number } {
  const debateVotes = voteStore.get(debateId);
  if (!debateVotes) return { votes: {}, total: 0 };

  const counts: Record<string, number> = {};
  let total = 0;
  for (const modelId of debateVotes.values()) {
    counts[modelId] = (counts[modelId] || 0) + 1;
    total++;
  }
  return { votes: counts, total };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params;

  let body: { session_token?: string; model_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_token, model_id } = body;

  if (!session_token || !model_id) {
    return NextResponse.json(
      { error: 'session_token and model_id are required' },
      { status: 400 }
    );
  }

  // IP-based rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const hashedIp = hashIp(ip);

  const now = Date.now();
  const hourAgo = now - 3600000;
  const ipTimestamps = ipRateLimit.get(hashedIp) || [];
  const recentVotes = ipTimestamps.filter((t) => t > hourAgo);

  if (recentVotes.length >= MAX_VOTES_PER_HOUR) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 3 votes per hour.' },
      { status: 429 }
    );
  }

  // Check if session already voted for this debate
  if (!voteStore.has(debateId)) {
    voteStore.set(debateId, new Map());
  }
  const debateVotes = voteStore.get(debateId)!;

  if (debateVotes.has(session_token)) {
    return NextResponse.json(
      { error: 'You have already voted in this debate.' },
      { status: 409 }
    );
  }

  // Record vote
  debateVotes.set(session_token, model_id);

  // Update rate limit
  recentVotes.push(now);
  ipRateLimit.set(hashedIp, recentVotes);

  const result = getVoteCounts(debateId);
  return NextResponse.json(result, { status: 200 });
}
