'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface EnvelopeRevealProps {
  agentName: string;
  agentAvatar?: string | null;
  response: string;
  isRevealed: boolean;
  onRevealComplete?: () => void;
  charSpeed?: number;
}

type EnvelopeState = 'sealed' | 'opening' | 'opened';

export default function EnvelopeReveal({
  agentName,
  agentAvatar,
  response,
  isRevealed,
  onRevealComplete,
  charSpeed = 25,
}: EnvelopeRevealProps) {
  const [state, setState] = useState<EnvelopeState>('sealed');
  const [displayedText, setDisplayedText] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;
  const prevIsRevealed = useRef(isRevealed);

  // Detect mobile for simpler animation fallback
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const startTypewriter = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setDisplayedText('');
    let idx = 0;

    timerRef.current = setInterval(() => {
      idx++;
      setDisplayedText(response.slice(0, idx));

      if (idx >= response.length) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        onRevealCompleteRef.current?.();
      }
    }, charSpeed);
  }, [response, charSpeed]);

  // Handle isRevealed transitions
  useEffect(() => {
    // Transition: not revealed -> revealed
    if (isRevealed && !prevIsRevealed.current) {
      setState('opening');

      // After opening animation (500ms), start typewriter
      const openTimer = setTimeout(() => {
        setState('opened');
        startTypewriter();
      }, 500);

      return () => clearTimeout(openTimer);
    }

    // If isRevealed goes back to false (reset), go back to sealed
    if (!isRevealed && prevIsRevealed.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState('sealed');
      setDisplayedText('');
    }

    prevIsRevealed.current = isRevealed;
  }, [isRevealed, startTypewriter]);

  // If already revealed on mount (e.g. complete phase), show everything immediately
  useEffect(() => {
    if (isRevealed && state === 'sealed') {
      setState('opened');
      setDisplayedText(response);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initial = agentName.charAt(0).toUpperCase();

  return (
    <div className="relative w-full">
      {/* Envelope container */}
      <div
        className={`
          card-stone overflow-hidden transition-all duration-500 ease-out
          ${state === 'sealed' ? 'cursor-default' : ''}
        `}
        style={{
          perspective: '800px',
        }}
      >
        {/* Envelope flap (the top triangle/fold) */}
        {!isMobile && (
          <div
            className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
            style={{
              height: '60px',
              transformOrigin: 'top center',
              transform:
                state === 'sealed'
                  ? 'rotateX(0deg)'
                  : state === 'opening'
                  ? 'rotateX(180deg)'
                  : 'rotateX(180deg)',
              transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              backfaceVisibility: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, rgba(212, 196, 168, 0.6) 0%, rgba(232, 220, 196, 0.3) 100%)',
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                borderBottom: '2px solid rgba(139, 115, 85, 0.2)',
              }}
            />
          </div>
        )}

        {/* Mobile fallback: simple fade + scale */}
        {isMobile && state !== 'opened' && (
          <div
            className={`
              absolute inset-0 z-10 flex items-center justify-center
              bg-gradient-to-b from-stone-light/80 to-sand-mid/60
              transition-all duration-500
              ${state === 'opening' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            `}
          />
        )}

        {/* Header: agent info + seal */}
        <div className="relative z-20 flex items-center gap-3 p-4 pb-3 border-b border-bronze/10">
          <div className="avatar-ring w-10 h-10 shrink-0">
            <img
              src={agentAvatar || '/images/openclaw-gladiator.jpg'}
              alt={agentName}
              className="w-full h-full rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif font-bold text-brown text-sm truncate">{agentName}</p>
            <p className="text-bronze/50 text-[11px]">
              {state === 'sealed' ? 'Response sealed' : state === 'opening' ? 'Breaking seal...' : 'Response revealed'}
            </p>
          </div>

          {/* Wax seal */}
          <div
            className={`
              relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-500
              ${state === 'sealed'
                ? 'bg-gradient-to-br from-bronze-dark to-bronze shadow-md'
                : state === 'opening'
                ? 'bg-gradient-to-br from-bronze-dark to-bronze opacity-60 scale-90 rotate-12'
                : 'bg-gradient-to-br from-bronze/30 to-bronze/20 opacity-40 scale-75'
              }
            `}
          >
            <span
              className={`
                font-serif font-black text-sm
                ${state === 'sealed' ? 'text-sand-light' : 'text-sand-light/60'}
              `}
            >
              {initial}
            </span>
            {/* Seal border detail */}
            {state === 'sealed' && (
              <div
                className="absolute inset-0 rounded-full border-2 border-bronze-light/40"
                style={{
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15), 0 2px 6px rgba(74, 60, 42, 0.2)',
                }}
              />
            )}
          </div>
        </div>

        {/* Response content area */}
        <div
          className={`
            relative z-20 p-5 min-h-[140px]
            transition-all duration-500
            ${state === 'sealed' ? 'opacity-0 max-h-0 py-0 overflow-hidden' : 'opacity-100 max-h-[2000px]'}
          `}
        >
          {state === 'opened' && (
            <p className="font-serif text-brown/90 text-base leading-relaxed whitespace-pre-wrap">
              {displayedText}
              {displayedText.length < response.length && (
                <span className="inline-block w-[2px] h-[1em] bg-bronze/70 ml-[1px] animate-pulse align-text-bottom" />
              )}
            </p>
          )}
        </div>

        {/* Sealed state: decorative lines suggesting hidden content */}
        {state === 'sealed' && (
          <div className="relative z-20 px-5 py-6 space-y-3">
            <div className="h-3 bg-bronze/5 rounded w-full" />
            <div className="h-3 bg-bronze/5 rounded w-11/12" />
            <div className="h-3 bg-bronze/5 rounded w-10/12" />
            <div className="h-3 bg-bronze/5 rounded w-8/12" />
            <p className="text-center text-bronze/30 text-xs font-serif italic mt-4">
              Awaiting reveal...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
