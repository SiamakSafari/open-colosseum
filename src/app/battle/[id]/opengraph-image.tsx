import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Battle Result — The Open Colosseum';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Query Supabase REST API directly (no supabase-js dependency for edge compat)
async function fetchBattleData(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // Fetch battle
  const battleRes = await fetch(
    `${supabaseUrl}/rest/v1/battles?id=eq.${id}&select=*&limit=1`,
    { headers, cache: 'no-store' }
  );
  if (!battleRes.ok) return null;
  const battles = await battleRes.json();
  if (!battles.length) return null;
  const raw = battles[0];

  // Fetch agents
  const agentIds = [raw.agent_a_id, raw.agent_b_id].filter(Boolean);
  const agentsRes = await fetch(
    `${supabaseUrl}/rest/v1/agents?id=in.(${agentIds.map((i: string) => `"${i}"`).join(',')})&select=id,name,model`,
    { headers, cache: 'no-store' }
  );
  const agents = agentsRes.ok ? await agentsRes.json() : [];

  const buildAgent = (agentId: string) => {
    const agent = agents.find((a: { id: string }) => a.id === agentId);
    return {
      name: agent?.name || 'Unknown',
      model: agent?.model || 'Unknown',
      elo: 1200,
    };
  };

  return {
    ...raw,
    agent_a: buildAgent(raw.agent_a_id),
    agent_b: buildAgent(raw.agent_b_id),
  };
}

export default async function BattleOGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let battle: {
    arena_type: string;
    prompt?: string;
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
    response_a?: string;
    response_b?: string;
    clip_moment?: { quote: string };
    post_match_summary?: string;
  } | null = null;

  try {
    battle = await fetchBattleData(id);
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

  const arenaLabel = isUnderground ? 'UNDERGROUND' : battle.arena_type === 'roast' ? 'ROAST BATTLE' : 'HOT TAKE';
  const arenaColor = isUnderground ? '#dc2626' : '#c4a265';

  // Extract best quote for the winner
  let winnerQuote = '';
  if (isCompleted && battle.winner_id) {
    if (battle.clip_moment?.quote) {
      winnerQuote = battle.clip_moment.quote;
    } else {
      const response = winnerIsA ? battle.response_a : battle.response_b;
      if (response) winnerQuote = response;
    }
    if (winnerQuote.length > 140) winnerQuote = winnerQuote.slice(0, 137) + '...';
  }

  const winnerName = isCompleted && battle.winner_id
    ? (winnerIsA ? battle.agent_a.name : battle.agent_b.name)
    : null;

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
          padding: '40px 48px',
          border: '2px solid rgba(196, 162, 101, 0.3)',
        }}
      >
        {/* Top bar: arena badge + branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: arenaColor,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              padding: '6px 20px',
              border: `2px solid ${arenaColor}`,
              borderRadius: 2,
              fontWeight: 900,
            }}
          >
            {arenaLabel}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(196, 162, 101, 0.5)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            THE OPEN COLOSSEUM
          </div>
        </div>

        {/* Main matchup */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 50,
          }}
        >
          {/* Agent A */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              flex: 1,
            }}
          >
            {isCompleted && winnerIsA && (
              <div style={{ fontSize: 36 }}>&#128081;</div>
            )}
            <div
              style={{
                fontSize: winnerIsA ? 38 : 32,
                fontWeight: 900,
                color: isCompleted && winnerIsA ? '#c4a265' : isCompleted && !winnerIsA ? 'rgba(212, 196, 168, 0.4)' : '#d4c4a8',
                textAlign: 'center',
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {battle.agent_a.name}
            </div>
            <div style={{ fontSize: 15, color: 'rgba(139, 115, 85, 0.6)' }}>
              {battle.agent_a.model}
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: 'rgba(139, 115, 85, 0.25)',
                letterSpacing: '0.1em',
              }}
            >
              VS
            </div>
          </div>

          {/* Agent B */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              flex: 1,
            }}
          >
            {isCompleted && winnerIsB && (
              <div style={{ fontSize: 36 }}>&#128081;</div>
            )}
            <div
              style={{
                fontSize: winnerIsB ? 38 : 32,
                fontWeight: 900,
                color: isCompleted && winnerIsB ? '#c4a265' : isCompleted && !winnerIsB ? 'rgba(212, 196, 168, 0.4)' : '#d4c4a8',
                textAlign: 'center',
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {battle.agent_b.name}
            </div>
            <div style={{ fontSize: 15, color: 'rgba(139, 115, 85, 0.6)' }}>
              {battle.agent_b.model}
            </div>
          </div>
        </div>

        {/* Winner announcement + quote */}
        {isCompleted && winnerName && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: '#c4a265',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              WINNER: {winnerName}
            </div>
            {winnerQuote && (
              <div
                style={{
                  fontSize: 16,
                  color: 'rgba(235, 225, 200, 0.7)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  maxWidth: 800,
                  lineHeight: 1.5,
                }}
              >
                &ldquo;{winnerQuote}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* Bottom line + CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(196, 162, 101, 0.2)',
            paddingTop: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'rgba(196, 162, 101, 0.4)',
              letterSpacing: '0.15em',
            }}
          >
            opencolosseum.ai
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(196, 162, 101, 0.4)',
              letterSpacing: '0.15em',
            }}
          >
            Watch the full battle
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
