import { createHash } from 'crypto';

// In-memory vote storage (sufficient for MVP with mock data)
// Shared singleton across all API routes via module scope
const voteStore = new Map<string, Map<string, string>>(); // debateId -> (sessionToken -> modelId)
const ipRateLimit = new Map<string, number[]>(); // hashedIp -> timestamps

const MAX_VOTES_PER_HOUR = 3;

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export function getVoteCounts(debateId: string): { votes: Record<string, number>; total: number } {
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

export function castVote(
  debateId: string,
  sessionToken: string,
  modelId: string,
  ip: string
): { success: boolean; error?: string; status?: number; votes?: Record<string, number>; total?: number } {
  const hashedIp = hashIp(ip);

  const now = Date.now();
  const hourAgo = now - 3600000;
  const ipTimestamps = ipRateLimit.get(hashedIp) || [];
  const recentVotes = ipTimestamps.filter((t) => t > hourAgo);

  if (recentVotes.length >= MAX_VOTES_PER_HOUR) {
    return { success: false, error: 'Rate limit exceeded. Maximum 3 votes per hour.', status: 429 };
  }

  if (!voteStore.has(debateId)) {
    voteStore.set(debateId, new Map());
  }
  const debateVotes = voteStore.get(debateId)!;

  if (debateVotes.has(sessionToken)) {
    return { success: false, error: 'You have already voted in this debate.', status: 409 };
  }

  // Record vote
  debateVotes.set(sessionToken, modelId);

  // Update rate limit
  recentVotes.push(now);
  ipRateLimit.set(hashedIp, recentVotes);

  const result = getVoteCounts(debateId);
  return { success: true, ...result };
}
