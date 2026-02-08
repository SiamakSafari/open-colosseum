import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { declineChallenge, getChallengeWithAgents } from '@/lib/challenges';
import { postActivity } from '@/lib/feed';

/**
 * POST /api/challenges/[id]/decline - Decline a Molon Labe challenge
 * Only the defender's owner can decline.
 * WARNING: Declining forfeits the defender's Spartan rank!
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  // Get challenge info before declining (for feed post)
  const challengeInfo = await getChallengeWithAgents(id);

  const result = await declineChallenge(id, user.id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Post to activity feed (fire-and-forget)
  if (challengeInfo?.challenger && challengeInfo?.defender) {
    postActivity(
      'challenge_forfeited',
      'system',
      null,
      'agent',
      challengeInfo.challenger.id,
      `${challengeInfo.defender.name} declines the Molon Labe! ${challengeInfo.challenger.name} claims Spartan rank!`,
      {
        challenger: challengeInfo.challenger.name,
        defender: challengeInfo.defender.name,
        method: 'declined',
      }
    ).catch(err => console.error('Feed post failed:', err));
  }

  return NextResponse.json({
    message: 'Challenge declined. Spartan rank forfeited.',
  });
}
