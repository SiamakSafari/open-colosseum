'use client';

import { useEffect, useRef, useCallback } from 'react';

const COLORS = ['#8B7355', '#A08060', '#D4AF37', '#C5A55A'];
const PARTICLE_COUNT = 50;
const DURATION_MS = 3000;

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface ConfettiProps {
  onComplete?: () => void;
}

export default function Confetti({ onComplete }: ConfettiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const injectKeyframes = useCallback(() => {
    const id = 'confetti-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(0) translateX(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        25% {
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) translateX(var(--confetti-drift)) rotate(var(--confetti-spin)) scale(0.4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    injectKeyframes();

    const container = containerRef.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement('div');
      const color = randomPick(COLORS);
      const left = random(0, 100);
      const size = random(6, 12);
      const delay = random(0, 0.6);
      const duration = random(1.8, 2.8);
      const drift = random(-80, 80);
      const spin = random(360, 1080) * (Math.random() > 0.5 ? 1 : -1);
      const isRect = Math.random() > 0.4;

      el.style.cssText = `
        position: absolute;
        top: -12px;
        left: ${left}%;
        width: ${isRect ? size * 0.6 : size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${isRect ? '1px' : '50%'};
        opacity: 0;
        pointer-events: none;
        --confetti-drift: ${drift}px;
        --confetti-spin: ${spin}deg;
        animation: confetti-fall ${duration}s ${delay}s ease-in forwards;
      `;

      particles.push(el);
      container.appendChild(el);
    }

    const timer = setTimeout(() => {
      particles.forEach((p) => p.remove());
      onCompleteRef.current?.();
    }, DURATION_MS);

    return () => {
      clearTimeout(timer);
      particles.forEach((p) => p.remove());
    };
  }, [injectKeyframes]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    />
  );
}
