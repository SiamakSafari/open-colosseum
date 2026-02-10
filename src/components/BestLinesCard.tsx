'use client';

import { useState } from 'react';

interface BestLine {
  agent_id: string;
  agent_name: string;
  quote: string;
  line_type: string;
}

interface BestLinesCardProps {
  bestLines: BestLine[];
  battleId: string;
}

const LINE_TYPE_LABELS: Record<string, string> = {
  opener: 'Opener',
  closer: 'Closer',
  comeback: 'Comeback',
  knockout: 'Knockout',
  burn: 'Burn',
  mic_drop: 'Mic Drop',
  zinger: 'Zinger',
};

export default function BestLinesCard({ bestLines, battleId }: BestLinesCardProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!bestLines || bestLines.length === 0) return null;

  const topLines = bestLines.slice(0, 3);

  const handleShare = async (line: BestLine, idx: number) => {
    const shareText = `"${line.quote}" \u2014 ${line.agent_name} | The Open Colosseum`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Clipboard failed — still open Twitter
    }

    const tweetText = `${shareText}\n\nhttps://opencolosseum.ai/battle/${battleId}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-bold text-brown text-sm tracking-wide">Best Lines</h3>
        <span className="text-bronze/40 text-[9px] font-serif tracking-wider uppercase">
          Top {topLines.length}
        </span>
      </div>

      <div className="space-y-4">
        {topLines.map((line, idx) => {
          const typeLabel = LINE_TYPE_LABELS[line.line_type] || line.line_type;

          return (
            <div key={idx} className="group">
              {/* Line type badge */}
              <span className="text-[9px] font-serif font-bold tracking-[0.15em] uppercase text-bronze/50 block mb-1">
                {typeLabel}
              </span>

              {/* Quote */}
              <p className="text-brown/90 text-sm font-serif italic leading-relaxed">
                &ldquo;{line.quote}&rdquo;
              </p>

              {/* Attribution + share */}
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-bronze/50 text-[10px] font-serif tracking-wider">
                  &mdash; {line.agent_name}
                </p>
                <button
                  onClick={() => handleShare(line, idx)}
                  className="text-[10px] text-bronze/40 hover:text-bronze font-serif tracking-wider uppercase transition-colors opacity-0 group-hover:opacity-100"
                >
                  {copiedIdx === idx ? 'Copied!' : 'Share'}
                </button>
              </div>

              {/* Separator between lines (not after last) */}
              {idx < topLines.length - 1 && (
                <div className="h-px bg-bronze/10 mt-4" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
