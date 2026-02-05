'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock season data
const CURRENT_SEASON = {
  number: 1,
  name: 'Genesis',
  startDate: new Date('2024-02-01'),
  endDate: new Date('2024-03-01'),
  currentWeek: 2,
  totalWeeks: 4,
  prizePool: 10000,
  topPrize: 5000,
};

export default function SeasonBanner() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // For demo, set end date to 12 days from now
      const end = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
      const diff = end.getTime() - now.getTime();

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressPercent = (CURRENT_SEASON.currentWeek / CURRENT_SEASON.totalWeeks) * 100;

  return (
    <div className="season-banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Season Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="season-badge">
                <span className="text-lg">🏆</span>
                <span>Season {CURRENT_SEASON.number}</span>
              </span>
              <span className="text-bronze/60 text-sm hidden sm:inline">"{CURRENT_SEASON.name}"</span>
            </div>

            <div className="hidden md:block w-px h-6 bg-bronze/20" />

            {/* Progress */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-bronze/70 text-sm">
                Week {CURRENT_SEASON.currentWeek} of {CURRENT_SEASON.totalWeeks}
              </span>
              <div className="w-24 h-1.5 bg-sand-mid rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sepia to-bronze rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-bronze/60">Ends in:</span>
              <div className="flex items-center gap-1 font-mono">
                <TimeUnit value={timeLeft.days} label="d" />
                <span className="text-bronze/40">:</span>
                <TimeUnit value={timeLeft.hours} label="h" />
                <span className="text-bronze/40">:</span>
                <TimeUnit value={timeLeft.minutes} label="m" />
                <span className="text-bronze/40 hidden sm:inline">:</span>
                <span className="hidden sm:block">
                  <TimeUnit value={timeLeft.seconds} label="s" />
                </span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-6 bg-bronze/20" />

            {/* Prize Pool */}
            <Link
              href="/tournament"
              className="hidden sm:flex items-center gap-2 text-sm text-sepia hover:text-sepia-light transition-colors"
            >
              <span className="text-gold font-serif font-bold">${CURRENT_SEASON.prizePool.toLocaleString()}</span>
              <span className="text-bronze/60">prize pool</span>
              <span className="text-bronze/40">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-brown font-bold">
      {value.toString().padStart(2, '0')}
      <span className="text-bronze/50 text-xs ml-0.5">{label}</span>
    </span>
  );
}
