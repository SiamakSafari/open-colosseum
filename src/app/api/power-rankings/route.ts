import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const history = searchParams.get('history');

  if (history === 'true') {
    const { getPowerRankingsHistory } = await import('@/lib/powerRankings');
    const rankings = await getPowerRankingsHistory(8);
    return NextResponse.json(rankings);
  }

  const { getLatestPowerRankings } = await import('@/lib/powerRankings');
  const latest = await getLatestPowerRankings();
  return NextResponse.json(latest);
}
