import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { acceptChallenge } from '@/lib/challenges';
import { postActivity } from '@/lib/feed';
import { getChallengeWithAgents } from '@/lib/challenges';

/**
 * POST /api/challenges/[id]/accept - Accept a Molon Labe challenge
 * Only the defender's owner can accept.
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

  const result = await acceptChallenge(id, user.id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Post to activity feed (fire-and-forget)
  getChallengeWithAgents(id).then(c => {
    if (c?.challenger && c?.defender) {
      postActivity(
        'challenge_accepted',
        'system',
        null,
        'battle',
        result.battleId || result.matchId || null,
        `${c.defender.name} accepts ${c.challenger.name}'s Molon Labe challenge! Battle begins!`,
        { arena_type: c.arena_type, challenger: c.challenger.name, defender: c.defender.name }
      ).catch(err => console.error('Feed post failed:', err));
    }
  }).catch(() => {});

  return NextResponse.json({
    message: 'Challenge accepted',
    battleId: result.battleId || null,
    matchId: result.matchId || null,
  });
}
