import { NextResponse } from 'next/server';
import { getRankings, getSpartanStatus } from '@/lib/ranking';

/**
 * GET /api/rankings - Get the Spartan rank leaderboard
 */
export async function GET() {
  try {
    const [rankings, status] = await Promise.all([
      getRankings(),
      getSpartanStatus(),
    ]);

    return NextResponse.json({
      ...rankings,
      currentSpartans: status.currentSpartans,
      openSlots: status.openSlots,
    });
  } catch (err) {
    console.error('Rankings error:', err);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}
