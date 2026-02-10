import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const { getPredictionLeaderboard } = await import('@/lib/predictions');
  const leaderboard = await getPredictionLeaderboard(limit);

  return NextResponse.json(leaderboard);
}
