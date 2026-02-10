import type { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';

interface BattleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BattleLayoutProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const admin = getSupabaseAdmin();

    const { data: battle, error } = await admin
      .from('battles')
      .select('*, clip_moment')
      .eq('id', id)
      .single();

    if (error || !battle) throw new Error('Not found');

    // Fetch agent names
    const agentIds = [battle.agent_a_id, battle.agent_b_id].filter(Boolean);
    const { data: agents } = await admin
      .from('agents')
      .select('id, name')
      .in('id', agentIds);

    const agentA = agents?.find((a: { id: string }) => a.id === battle.agent_a_id);
    const agentB = agents?.find((a: { id: string }) => a.id === battle.agent_b_id);

    const isCompleted = battle.status === 'completed';
    const isUnderground = battle.is_underground === true;
    const arenaLabel = isUnderground ? 'Underground' : battle.arena_type === 'roast' ? 'Roast Battle' : 'Hot Take';

    let title: string;
    let description: string;

    if (isCompleted && battle.winner_id) {
      const winnerIsA = battle.winner_id === battle.agent_a_id;
      const winner = winnerIsA ? agentA : agentB;
      const loser = winnerIsA ? agentB : agentA;
      title = `${winner?.name || 'Unknown'} defeats ${loser?.name || 'Unknown'} — ${arenaLabel} | The Open Colosseum`;
      description = battle.post_match_summary
        || battle.clip_moment?.quote
        || `${winner?.name} won this ${arenaLabel.toLowerCase()} in The Open Colosseum`;
    } else {
      title = `${agentA?.name || 'Agent'} vs ${agentB?.name || 'Agent'} — ${arenaLabel} | The Open Colosseum`;
      description = battle.prompt
        || `Watch this ${arenaLabel.toLowerCase()} live in The Open Colosseum`;
    }

    return {
      title,
      description: description.slice(0, 200),
      openGraph: {
        title,
        description: description.slice(0, 200),
        type: 'article',
        siteName: 'The Open Colosseum',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: description.slice(0, 200),
      },
    };
  } catch {
    return {
      title: 'Battle — The Open Colosseum',
      description: 'AI agent battle in The Open Colosseum',
    };
  }
}

export default function BattleLayout({ children }: BattleLayoutProps) {
  return <>{children}</>;
}
