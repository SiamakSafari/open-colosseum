'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import EnvelopeReveal from './EnvelopeReveal';

const Confetti = dynamic(() => import('./Confetti'), { ssr: false });

interface BattleReplayProps {
  battle: {
    id: string;
    agent_a: {
      id: string;
      name: string;
      model: string;
      avatar_url?: string | null;
      elo: number;
      wins: number;
      losses: number;
    };
    agent_b: {
      id: string;
      name: string;
      model: string;
      avatar_url?: string | null;
      elo: number;
      wins: number;
      losses: number;
    };
    response_a?: string | null;
    response_b?: string | null;
    pre_match_hype?: string | null;
    winner_id?: string | null;
    is_underground?: boolean;
    judge_scores?: Array<{
      judge_persona: string;
      scores_a: { impact: number; creativity: number; audacity: number; entertainment: number };
      scores_b: { impact: number; creativity: number; audacity: number; entertainment: number };
      reasoning: string;
    }> | null;
  };
  onPhaseChange?: (phase: string) => void;
}

type Phase = 'hype' | 'reveal_a' | 'pause' | 'reveal_b' | 'judges' | 'winner' | 'complete';

export default function BattleReplay({ battle, onPhaseChange }: BattleReplayProps) {
  const [phase, setPhase] = useState<Phase>('hype');
  const [showConfetti, setShowConfetti] = useState(false);
  const [hypeVisible, setHypeVisible] = useState(false);
  const [revealA, setRevealA] = useState(false);
  const [revealB, setRevealB] = useState(false);
  const [visibleJudges, setVisibleJudges] = useState<number>(0);
  const [winnerVisible, setWinnerVisible] = useState(false);

  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  const hypeRef = useRef<HTMLDivElement>(null);
  const revealARef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLDivElement>(null);
  const revealBRef = useRef<HTMLDivElement>(null);
  const judgesRef = useRef<HTMLDivElement>(null);
  const winnerRef = useRef<HTMLDivElement>(null);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Helper to clear all pending timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Helper to add a tracked timer
  const addTimer = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  // Scroll to a ref element
  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Change phase and notify parent
  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    onPhaseChangeRef.current?.(newPhase);
  }, []);

  // Check sessionStorage on mount
  useEffect(() => {
    const storageKey = `replay:${battle.id}`;
    if (sessionStorage.getItem(storageKey)) {
      // Already seen: jump to complete
      setRevealA(true);
      setRevealB(true);
      setWinnerVisible(true);
      setVisibleJudges(battle.judge_scores?.length ?? 0);
      goToPhase('complete');
      return;
    }

    // Start the replay from the beginning
    startHypePhase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.id]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // ---- Phase: Hype ----
  function startHypePhase() {
    if (battle.pre_match_hype) {
      goToPhase('hype');
      // Fade in hype text
      addTimer(() => {
        setHypeVisible(true);
        scrollTo(hypeRef);
      }, 100);
      // Hold for 3s then advance
      addTimer(() => {
        startRevealAPhase();
      }, 3200);
    } else {
      // No hype: skip directly to reveal_a
      startRevealAPhase();
    }
  }

  // ---- Phase: Reveal A ----
  function startRevealAPhase() {
    goToPhase('reveal_a');
    addTimer(() => {
      setRevealA(true);
      scrollTo(revealARef);
    }, 200);
  }

  // Called by EnvelopeReveal when agent A's typewriter completes
  function onRevealAComplete() {
    startPausePhase();
  }

  // ---- Phase: Pause ----
  function startPausePhase() {
    goToPhase('pause');
    scrollTo(pauseRef);
    // 2s dramatic pause
    addTimer(() => {
      startRevealBPhase();
    }, 2000);
  }

  // ---- Phase: Reveal B ----
  function startRevealBPhase() {
    goToPhase('reveal_b');
    addTimer(() => {
      setRevealB(true);
      scrollTo(revealBRef);
    }, 200);
  }

  // Called by EnvelopeReveal when agent B's typewriter completes
  function onRevealBComplete() {
    if (battle.is_underground && battle.judge_scores && battle.judge_scores.length > 0) {
      startJudgesPhase();
    } else {
      startWinnerPhase();
    }
  }

  // ---- Phase: Judges (underground only) ----
  function startJudgesPhase() {
    goToPhase('judges');
    scrollTo(judgesRef);

    const judgeCount = battle.judge_scores?.length ?? 0;
    for (let i = 0; i < judgeCount; i++) {
      addTimer(() => {
        setVisibleJudges(i + 1);
      }, 500 * (i + 1));
    }

    // After all judges revealed, advance to winner
    addTimer(() => {
      startWinnerPhase();
    }, 500 * judgeCount + 1000);
  }

  // ---- Phase: Winner ----
  function startWinnerPhase() {
    goToPhase('winner');
    addTimer(() => {
      setWinnerVisible(true);
      setShowConfetti(true);
      scrollTo(winnerRef);
    }, 300);

    // Advance to complete after confetti
    addTimer(() => {
      goToPhase('complete');
      sessionStorage.setItem(`replay:${battle.id}`, '1');
    }, 3500);
  }

  // ---- Skip to Result ----
  function handleSkipToResult() {
    clearAllTimers();
    setHypeVisible(true);
    setRevealA(true);
    setRevealB(true);
    setWinnerVisible(true);
    setVisibleJudges(battle.judge_scores?.length ?? 0);
    setShowConfetti(false);
    goToPhase('complete');
    sessionStorage.setItem(`replay:${battle.id}`, '1');
  }

  // ---- Watch Again ----
  function handleWatchAgain() {
    clearAllTimers();

    // Reset all state
    setHypeVisible(false);
    setRevealA(false);
    setRevealB(false);
    setVisibleJudges(0);
    setWinnerVisible(false);
    setShowConfetti(false);

    // Clear sessionStorage
    sessionStorage.removeItem(`replay:${battle.id}`);

    // Restart from hype
    addTimer(() => {
      startHypePhase();
    }, 100);
  }

  const isRevealPhase = phase === 'hype' || phase === 'reveal_a' || phase === 'pause' || phase === 'reveal_b' || phase === 'judges';
  const winnerIsA = battle.winner_id === battle.agent_a.id;
  const winnerName = winnerIsA ? battle.agent_a.name : battle.agent_b.name;

  return (
    <div className="relative space-y-6">
      {/* Skip to Result button — visible during reveal phases */}
      {isRevealPhase && (
        <div className="sticky top-4 z-50 flex justify-end">
          <button
            onClick={handleSkipToResult}
            className="px-4 py-2 text-xs font-serif tracking-wider uppercase
              bg-sand-light/90 backdrop-blur border border-bronze/20 rounded-lg
              text-bronze/70 hover:text-bronze hover:border-bronze/40
              transition-all shadow-sm hover:shadow-md"
          >
            Skip to Result
          </button>
        </div>
      )}

      {/* ---- Hype Phase ---- */}
      {battle.pre_match_hype && (
        <div ref={hypeRef}>
          <div
            className={`
              text-center transition-all duration-700 ease-out
              ${hypeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            <div className="inline-block max-w-2xl px-6 py-4 bg-gradient-to-r from-bronze/5 via-bronze/10 to-bronze/5 border border-bronze/20 rounded-lg">
              <p className="text-bronze/40 text-[9px] uppercase tracking-[0.2em] font-serif mb-2">The Announcer</p>
              <p className="text-brown/90 text-sm font-serif italic leading-relaxed">
                &ldquo;{battle.pre_match_hype}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- Reveal A ---- */}
      {(phase === 'reveal_a' || phase === 'pause' || phase === 'reveal_b' || phase === 'judges' || phase === 'winner' || phase === 'complete') && battle.response_a && (
        <div ref={revealARef}>
          <EnvelopeReveal
            agentName={battle.agent_a.name}
            agentAvatar={battle.agent_a.avatar_url}
            response={battle.response_a}
            isRevealed={revealA}
            onRevealComplete={onRevealAComplete}
            charSpeed={25}
          />
        </div>
      )}

      {/* ---- Pause Phase: Dramatic dots ---- */}
      {(phase === 'pause') && (
        <div ref={pauseRef} className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-bronze/40 animate-pulse" />
            <span className="w-3 h-3 rounded-full bg-bronze/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <span className="w-3 h-3 rounded-full bg-bronze/40 animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>
        </div>
      )}

      {/* ---- VS Divider (visible after reveal_a starts) ---- */}
      {(phase === 'pause' || phase === 'reveal_b' || phase === 'judges' || phase === 'winner' || phase === 'complete') && (
        <div className="flex items-center justify-center py-2">
          <span className="vs-badge text-xl">VS</span>
        </div>
      )}

      {/* ---- Reveal B ---- */}
      {(phase === 'reveal_b' || phase === 'judges' || phase === 'winner' || phase === 'complete') && battle.response_b && (
        <div ref={revealBRef}>
          <EnvelopeReveal
            agentName={battle.agent_b.name}
            agentAvatar={battle.agent_b.avatar_url}
            response={battle.response_b}
            isRevealed={revealB}
            onRevealComplete={onRevealBComplete}
            charSpeed={25}
          />
        </div>
      )}

      {/* ---- Judges Phase (Underground only) ---- */}
      {(phase === 'judges' || phase === 'winner' || phase === 'complete') &&
        battle.is_underground &&
        battle.judge_scores &&
        battle.judge_scores.length > 0 && (
        <div ref={judgesRef} className="max-w-2xl mx-auto">
          <h3 className="font-serif font-bold text-lg text-brown text-center mb-4">
            {'\u2696\uFE0F'} Judge Scores
          </h3>
          <div className="space-y-4">
            {battle.judge_scores.map((judge, idx) => {
              const avgA = (judge.scores_a.impact + judge.scores_a.creativity + judge.scores_a.audacity + judge.scores_a.entertainment) / 4;
              const avgB = (judge.scores_b.impact + judge.scores_b.creativity + judge.scores_b.audacity + judge.scores_b.entertainment) / 4;

              return (
                <div
                  key={idx}
                  className={`
                    card-stone p-4 border border-red-900/10
                    transition-all duration-500 ease-out
                    ${idx < visibleJudges ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-serif font-bold text-brown text-sm">{judge.judge_persona}</span>
                    <span className="text-bronze/50 text-xs font-mono">
                      {avgA.toFixed(1)} vs {avgB.toFixed(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-bronze/60 font-serif mb-1">{battle.agent_a.name}</p>
                      <div className="grid grid-cols-4 gap-1">
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">IMP</p>
                          <p className="text-brown font-bold">{judge.scores_a.impact}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">CRE</p>
                          <p className="text-brown font-bold">{judge.scores_a.creativity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">AUD</p>
                          <p className="text-brown font-bold">{judge.scores_a.audacity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">ENT</p>
                          <p className="text-brown font-bold">{judge.scores_a.entertainment}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-bronze/60 font-serif mb-1">{battle.agent_b.name}</p>
                      <div className="grid grid-cols-4 gap-1">
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">IMP</p>
                          <p className="text-brown font-bold">{judge.scores_b.impact}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">CRE</p>
                          <p className="text-brown font-bold">{judge.scores_b.creativity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">AUD</p>
                          <p className="text-brown font-bold">{judge.scores_b.audacity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-bronze/40 text-[9px]">ENT</p>
                          <p className="text-brown font-bold">{judge.scores_b.entertainment}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-bronze/50 text-xs mt-3 italic">{judge.reasoning}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Winner Phase ---- */}
      {(phase === 'winner' || phase === 'complete') && battle.winner_id && (
        <div ref={winnerRef}>
          <div
            className={`
              winner-banner text-center transition-all duration-700 ease-out
              ${winnerVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}
            `}
          >
            <p className="text-bronze/70 text-xs uppercase tracking-wider mb-2">Winner</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">{'\uD83D\uDC51'}</span>
              <span className="font-serif font-black text-2xl text-gold">
                {winnerName}
              </span>
              <span className="text-3xl">{'\uD83D\uDC51'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ---- Confetti ---- */}
      {showConfetti && phase === 'winner' && <Confetti />}

      {/* ---- Complete Phase: Watch Again button ---- */}
      {phase === 'complete' && (
        <div className="text-center pt-4 animate-fade-in-up">
          <button
            onClick={handleWatchAgain}
            className="inline-flex items-center gap-2 px-5 py-2 text-bronze/50 hover:text-bronze
              text-xs font-serif tracking-wider uppercase transition-colors
              border border-bronze/10 hover:border-bronze/30 rounded-lg"
          >
            {'\u25B6'} Watch Again
          </button>
        </div>
      )}
    </div>
  );
}
