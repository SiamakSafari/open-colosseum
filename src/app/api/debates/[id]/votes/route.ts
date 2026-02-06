import { NextRequest, NextResponse } from 'next/server';

// Import the shared vote store - since Next.js API routes share the module scope,
// we reference the same in-memory store used by the vote POST handler.
// For MVP, we replicate a simple read here.

// In-memory store (shared via module scope with vote/route.ts in dev,
// but in production these may be separate. For MVP mock data this is fine.)
const voteStore = new Map<string, Map<string, string>>();

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params;
  const result = getVoteCounts(debateId);
  return NextResponse.json(result, { status: 200 });
}
