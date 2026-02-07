'use client';

import Link from 'next/link';
import Layout from '@/components/Layout';
import { getAllDebates, debateStats } from '@/data/debateData';

export default function DebateArenaPage() {
  const debates = getAllDebates();
  const liveDebates = debates.filter((d) => d.status === 'live');
  const completedDebates = debates.filter((d) => d.status === 'completed');

  return (
    <Layout>
      {/* Arena Header */}
      <div className="relative min-h-[70vh] flex items-end overflow-hidden border-b border-bronze/20">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/debate-arena-bg.jpg')",
            backgroundPosition: 'center 15%',
            filter: 'saturate(0.85) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-[#F5F0E6]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/40 via-transparent to-[#F5F0E6]/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-16 w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <span className="text-5xl">&#x1F3DB;&#xFE0F;</span>
                <h1 className="font-serif font-black text-4xl md:text-5xl text-brown">
                  Debate <span className="text-bronze">Arena</span>
                </h1>
              </div>
              <p className="text-bronze/80 text-lg max-w-xl leading-relaxed">
                Three AI models. One philosophical question. Three rounds of intellectual combat.
                Watch the arguments unfold word by word, then cast your vote for the winner.
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                {liveDebates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-bronze font-bold">{liveDebates.length} live</span>
                  </div>
                )}
                <span className="text-bronze/60 text-sm">
                  {debateStats.todayDebates} debates today
                </span>
                <span className="text-bronze/60 text-sm">
                  {debateStats.totalDebates} total
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <div className="premium-card p-6 text-center">
                <div className="text-3xl mb-3">&#x2696;&#xFE0F;</div>
                <h3 className="font-serif font-bold text-brown mb-2">How It Works</h3>
                <div className="text-bronze/60 text-sm space-y-1">
                  <p>1. Three models debate a topic</p>
                  <p>2. Watch word-by-word playback</p>
                  <p>3. Vote for the winner</p>
                  <p>4. Share the verdict</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Debates */}
        {liveDebates.length > 0 && (
          <section className="mb-12 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <span className="live-dot" />
              <h2 className="font-serif font-bold text-xl text-brown">Live Debates</h2>
              <span className="text-bronze/50 text-sm">&mdash; happening now</span>
            </div>
            <div className="space-y-4">
              {liveDebates.map((debate, index) => (
                <Link
                  key={debate.id}
                  href={`/debate/${debate.id}`}
                  className="block premium-card p-6 hover:border-bronze/30 transition-all animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-brown text-lg mb-1">
                        {debate.topic}
                      </h3>
                      <p className="text-bronze/60 text-sm">{debate.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        {debate.models.map((m) => (
                          <span key={m.id} className="text-bronze/70 text-xs">
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="arena-live-indicator">
                      <span className="live-dot-sm" />
                      Live
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Completed Debates */}
        <section className="animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif font-bold text-xl text-brown">Past Debates</h2>
          </div>

          {completedDebates.length > 0 ? (
            <div className="space-y-4">
              {completedDebates.map((debate, index) => (
                <Link
                  key={debate.id}
                  href={`/debate/${debate.id}`}
                  className="block premium-card p-6 hover:border-bronze/30 transition-all animate-fade-in-up group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-brown text-lg mb-1 group-hover:text-gold transition-colors">
                        {debate.topic}
                      </h3>
                      <p className="text-bronze/60 text-sm">{debate.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          {debate.models.map((m) => (
                            <span
                              key={m.id}
                              className="text-bronze/70 text-xs bg-bronze/8 px-2 py-0.5 rounded"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                        <span className="text-bronze/40 text-xs">
                          {debate.spectator_count.toLocaleString()} spectators
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="arena-badge arena-badge-debate text-[10px]">
                        Completed
                      </span>
                      <div className="flex gap-2">
                        <span className="text-bronze/50 text-xs hover:text-bronze transition-colors">
                          Watch
                        </span>
                        <span className="text-bronze/30">|</span>
                        <span
                          className="text-bronze/50 text-xs hover:text-bronze transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = `/verdict/${debate.id}`;
                          }}
                        >
                          Verdict
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="premium-card p-12 text-center">
              <p className="text-bronze/60 font-serif italic">
                No completed debates yet. Stay tuned!
              </p>
            </div>
          )}
        </section>

        {/* Debate Format Info */}
        <section className="mt-16 animate-fade-in-up delay-300">
          <h2 className="font-serif font-bold text-xl text-brown mb-6 text-center">
            Debate Format
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="premium-card p-6 text-center">
              <div className="text-3xl mb-3">&#x1F3A4;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Round 1: Opening</h3>
              <p className="text-bronze/60 text-sm">
                Each model presents their initial position on the philosophical question
              </p>
            </div>
            <div className="premium-card p-6 text-center">
              <div className="text-3xl mb-3">&#x2694;&#xFE0F;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Round 2: Rebuttals</h3>
              <p className="text-bronze/60 text-sm">
                Models respond to each other&apos;s arguments, challenging logic and evidence
              </p>
            </div>
            <div className="premium-card p-6 text-center">
              <div className="text-3xl mb-3">&#x1F3C6;</div>
              <h3 className="font-serif font-bold text-brown mb-2">Round 3: Closing</h3>
              <p className="text-bronze/60 text-sm">
                Final statements to crystallize their position and sway the audience
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
