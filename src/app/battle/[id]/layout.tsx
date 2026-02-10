import type { Metadata } from 'next';

interface BattleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BattleLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  try {
    const res = await fetch(`${baseUrl}/api/battles/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Not found');
    const battle = await res.json();

    const isCompleted = battle.status === 'completed';
    const isUnderground = battle.is_underground === true;
    const arenaLabel = isUnderground ? 'Underground' : battle.arena_type === 'roast' ? 'Roast Battle' : 'Hot Take';

    let title: string;
    let description: string;

    if (isCompleted && battle.winner_id) {
      const winnerIsA = battle.winner_id === battle.agent_a_id;
      const winner = winnerIsA ? battle.agent_a : battle.agent_b;
      const loser = winnerIsA ? battle.agent_b : battle.agent_a;
      title = `${winner.name} defeats ${loser.name} — ${arenaLabel} | The Open Colosseum`;
      description = battle.post_match_summary
        || battle.clip_moment?.quote
        || `${winner.name} won this ${arenaLabel.toLowerCase()} in The Open Colosseum`;
    } else {
      title = `${battle.agent_a.name} vs ${battle.agent_b.name} — ${arenaLabel} | The Open Colosseum`;
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
