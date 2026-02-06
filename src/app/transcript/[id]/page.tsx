'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getDebateById } from '@/data/debateData';

export default function TranscriptPage() {
  const params = useParams();
  const debate = getDebateById(params.id as string);
  const [hash, setHash] = useState<string>('');
  const [hashError, setHashError] = useState(false);

  // Compute SHA-256 hash of transcript via Web Crypto API
  useEffect(() => {
    if (!debate) return;

    const transcriptText = debate.rounds
      .flatMap((round) =>
        round.statements.map(
          (stmt) =>
            `[Round ${round.round_number}: ${round.label}] [${stmt.model_id}]\n${stmt.text}`
        )
      )
      .join('\n\n---\n\n');

    const encoder = new TextEncoder();
    const data = encoder.encode(transcriptText);

    crypto.subtle
      .digest('SHA-256', data)
      .then((buffer) => {
        const hashArray = Array.from(new Uint8Array(buffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setHash(hashHex);
      })
      .catch(() => {
        setHashError(true);
      });
  }, [debate]);

  if (!debate) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-brown mb-4">Transcript Not Found</h1>
          <p className="text-bronze/70 mb-8">This debate transcript doesn&apos;t exist.</p>
          <Link href="/arena/debate" className="btn-primary">
            Back to Debates
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-bronze/15">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{
            backgroundImage: "url('/images/debate-arena-bg.jpg')",
            filter: 'saturate(0.85) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-[#F5F0E6]/80 to-[#F5F0E6]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/50 via-transparent to-[#F5F0E6]/50" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/debate/${debate.id}`}
              className="text-bronze/60 hover:text-bronze text-sm transition-colors"
            >
              &larr; Back to Debate
            </Link>
            <span className="arena-badge arena-badge-debate">Transcript</span>
          </div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-brown leading-tight">
            {debate.topic}
          </h1>
          <p className="text-bronze/70 text-sm mt-2">
            Full transcript of the debate between{' '}
            {debate.models.map((m) => m.name).join(', ')}
          </p>

          {/* Navigation links */}
          <div className="flex items-center gap-4 mt-4">
            <Link
              href={`/debate/${debate.id}`}
              className="text-bronze text-xs hover:underline font-serif uppercase tracking-wider"
            >
              Watch Debate
            </Link>
            <span className="text-bronze/30">|</span>
            <Link
              href={`/verdict/${debate.id}`}
              className="text-bronze text-xs hover:underline font-serif uppercase tracking-wider"
            >
              View Verdict
            </Link>
            <span className="text-bronze/30">|</span>
            <a
              href={`/transcripts/${debate.id}.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bronze text-xs hover:underline font-serif uppercase tracking-wider"
            >
              Raw JSON
            </a>
          </div>
        </div>
      </div>

      {/* Transcript Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {debate.rounds.map((round) => (
          <div key={round.round_number} className="mb-12 animate-fade-in-up">
            {/* Round header */}
            <div className="debate-round-divider mb-8">
              <span className="debate-round-divider-text">
                Round {round.round_number}: {round.label}
              </span>
            </div>

            <div className="space-y-8">
              {round.statements.map((stmt, idx) => {
                const model = debate.models.find((m) => m.id === stmt.model_id);

                return (
                  <div key={idx} className="debate-statement">
                    {/* Model label */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="avatar-ring w-10 h-10">
                        <img
                          src={model?.avatar_url || '/images/openclaw-gladiator.jpg'}
                          alt={model?.name}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <div>
                        <span className="font-serif font-bold text-brown">{model?.name}</span>
                        <span className="text-bronze/50 text-xs ml-2">{model?.provider}</span>
                      </div>
                      <span className="text-bronze/40 text-[10px] ml-auto">
                        {stmt.word_count} words
                      </span>
                    </div>

                    {/* Statement text */}
                    <div className="pl-13 ml-[52px]">
                      {stmt.text.split('\n\n').map((paragraph, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-brown/85 leading-relaxed text-[15px] mb-4 last:mb-0"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Integrity hash */}
        <div className="mt-16 mb-8">
          <div className="divider-gold mb-8" />
          <div className="premium-card p-6">
            <h3 className="font-serif font-bold text-brown text-sm mb-3 uppercase tracking-wider">
              Transcript Integrity
            </h3>
            <p className="text-bronze/60 text-xs mb-3">
              SHA-256 hash computed client-side via Web Crypto API. You can verify this hash
              independently by hashing the transcript content.
            </p>
            {hash && !hashError ? (
              <code className="block bg-sand-mid/50 border border-bronze/10 p-3 text-[11px] text-brown/80 font-mono break-all rounded">
                sha256: {hash}
              </code>
            ) : hashError ? (
              <p className="text-terracotta text-xs">
                Unable to compute hash. Web Crypto API not available.
              </p>
            ) : (
              <div className="h-8 bg-bronze/10 rounded animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
