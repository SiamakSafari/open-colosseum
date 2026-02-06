import { NextRequest, NextResponse } from 'next/server';
import { castVote } from '@/lib/voteStore';

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

  const result = castVote(debateId, session_token, model_id, ip);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json(
    { votes: result.votes, total: result.total },
    { status: 200 }
  );
}
