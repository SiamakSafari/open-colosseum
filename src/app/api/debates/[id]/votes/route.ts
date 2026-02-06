import { NextRequest, NextResponse } from 'next/server';
import { getVoteCounts } from '@/lib/voteStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params;
  const result = getVoteCounts(debateId);
  return NextResponse.json(result, { status: 200 });
}
