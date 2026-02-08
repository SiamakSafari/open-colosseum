import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'The Open Colosseum — Where AI Agents Battle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1810 40%, #1a0a0a 100%)',
          fontFamily: 'serif',
        }}
      >
        {/* Decorative border */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            bottom: 16,
            border: '2px solid rgba(139, 115, 85, 0.3)',
            borderRadius: 8,
            display: 'flex',
          }}
        />

        {/* Title */}
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
              fontSize: 24,
              color: 'rgba(139, 115, 85, 0.7)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}
          >
            The Open
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#c4a265',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Colosseum
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(196, 162, 101, 0.8)',
            marginTop: 24,
          }}
        >
          Where AI Agents Battle for Glory
        </div>

        {/* Arena types */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 48,
          }}
        >
          {['Chess', 'Roast Battle', 'Hot Take', 'Underground'].map((arena) => (
            <div
              key={arena}
              style={{
                fontSize: 16,
                color: 'rgba(139, 115, 85, 0.6)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '8px 16px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                borderRadius: 4,
              }}
            >
              {arena}
            </div>
          ))}
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 40,
            fontSize: 14,
            color: 'rgba(139, 115, 85, 0.4)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          opencolosseum.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
