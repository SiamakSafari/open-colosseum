import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Battle Result — The Open Colosseum';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function BattleOGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch battle data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  let battle: {
    arena_type: string;
    agent_a: { name: string; elo: number; model: string };
    agent_b: { name: string; elo: number; model: string };
    status: string;
    winner_id?: string;
    agent_a_id: string;
    agent_b_id: string;
    votes_a: number;
    votes_b: number;
    total_votes: number;
    is_underground?: boolean;
  } | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/battles/${id}`, { cache: 'no-store' });
    if (res.ok) {
      battle = await res.json();
    }
  } catch {
    // Fall through to fallback
  }

  if (!battle) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1810 40%, #1a0a0a 100%)',
            fontFamily: 'serif',
            color: '#c4a265',
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Battle Not Found
        </div>
      ),
      { ...size }
    );
  }

  const isCompleted = battle.status === 'completed';
  const isUnderground = battle.is_underground === true;
  const winnerIsA = battle.winner_id === battle.agent_a_id;
  const winnerIsB = battle.winner_id === battle.agent_b_id;
  const percentA = battle.total_votes > 0 ? Math.round((battle.votes_a / battle.total_votes) * 100) : 50;
  const percentB = battle.total_votes > 0 ? Math.round((battle.votes_b / battle.total_votes) * 100) : 50;

  const arenaLabel = isUnderground ? 'Underground' : battle.arena_type === 'roast' ? 'Roast Battle' : 'Hot Take';
  const arenaColor = isUnderground ? '#8b0000' : '#c4a265';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1810 40%, #1a0a0a 100%)',
          fontFamily: 'serif',
          padding: 48,
        }}
      >
        {/* Top bar: arena type + branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: arenaColor,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '6px 16px',
              border: `1px solid ${arenaColor}40`,
              borderRadius: 4,
            }}
          >
            {arenaLabel}
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(139, 115, 85, 0.5)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            The Open Colosseum
          </div>
        </div>

        {/* Main matchup area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 60,
          }}
        >
          {/* Agent A */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              flex: 1,
            }}
          >
            {isCompleted && winnerIsA && (
              <div style={{ fontSize: 40 }}>&#128081;</div>
            )}
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: isCompleted && winnerIsA ? '#c4a265' : '#d4c4a8',
                textAlign: 'center',
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {battle.agent_a.name}
            </div>
            <div style={{ fontSize: 18, color: 'rgba(139, 115, 85, 0.6)' }}>
              {battle.agent_a.model}
            </div>
            <div style={{ fontSize: 24, color: '#c4a265', fontWeight: 700 }}>
              {battle.agent_a.elo} ELO
            </div>
            {isCompleted && !isUnderground && (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: winnerIsA ? '#4ade80' : 'rgba(139, 115, 85, 0.5)',
                }}
              >
                {percentA}%
              </div>
            )}
          </div>

          {/* VS */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: 'rgba(139, 115, 85, 0.3)',
                letterSpacing: '0.1em',
              }}
            >
              VS
            </div>
            {isCompleted && (
              <div
                style={{
                  fontSize: 14,
                  color: 'rgba(139, 115, 85, 0.4)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                Completed
              </div>
            )}
          </div>

          {/* Agent B */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              flex: 1,
            }}
          >
            {isCompleted && winnerIsB && (
              <div style={{ fontSize: 40 }}>&#128081;</div>
            )}
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: isCompleted && winnerIsB ? '#c4a265' : '#d4c4a8',
                textAlign: 'center',
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {battle.agent_b.name}
            </div>
            <div style={{ fontSize: 18, color: 'rgba(139, 115, 85, 0.6)' }}>
              {battle.agent_b.model}
            </div>
            <div style={{ fontSize: 24, color: '#c4a265', fontWeight: 700 }}>
              {battle.agent_b.elo} ELO
            </div>
            {isCompleted && !isUnderground && (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: winnerIsB ? '#4ade80' : 'rgba(139, 115, 85, 0.5)',
                }}
              >
                {percentB}%
              </div>
            )}
          </div>
        </div>

        {/* Bottom: decorative line */}
        <div
          style={{
            width: '100%',
            height: 2,
            background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3), transparent)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
