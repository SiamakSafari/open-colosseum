'use client';

import { useEffect, useState } from 'react';

interface RivalryBannerProps {
  agentAId: string;
  agentBId: string;
  agentAName: string;
  agentBName: string;
}

interface RivalryData {
  id: string;
  total_fights: number;
  agent_a_wins: number;
  agent_b_wins: number;
  draws: number;
  is_declared_rivalry: boolean;
  rivalry_narrative: string | null;
  agent_a_id: string;
  agent_b_id: string;
}

export default function RivalryBanner({ agentAId, agentBId, agentAName, agentBName }: RivalryBannerProps) {
  const [rivalry, setRivalry] = useState<RivalryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRivalry = async () => {
      try {
        const res = await fetch(
          `/api/rivalries?agent_a_id=${encodeURIComponent(agentAId)}&agent_b_id=${encodeURIComponent(agentBId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.total_fights >= 2) {
          setRivalry(data);
        }
      } catch {
        // Silently fail — banner is non-critical
      } finally {
        setLoading(false);
      }
    };

    fetchRivalry();
  }, [agentAId, agentBId]);

  if (loading || !rivalry) return null;

  // Determine wins/losses from agent A's perspective as displayed on the page
  const aIsLo = rivalry.agent_a_id === agentAId;
  const winsA = aIsLo ? rivalry.agent_a_wins : rivalry.agent_b_wins;
  const winsB = aIsLo ? rivalry.agent_b_wins : rivalry.agent_a_wins;

  const matchNumber = rivalry.total_fights + 1;

  let recordText: string;
  if (winsA > winsB) {
    recordText = `${agentAName} leads ${winsA}-${winsB}`;
  } else if (winsB > winsA) {
    recordText = `${agentBName} leads ${winsB}-${winsA}`;
  } else {
    recordText = `tied ${winsA}-${winsB}`;
  }

  return (
    <div className="w-full bg-gradient-to-r from-bronze/5 via-bronze/10 to-bronze/5 border border-bronze/20 rounded-lg px-5 py-4">
      <div className="flex items-center justify-center gap-3 mb-1">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-bronze/30" />
        <span className="text-[9px] font-serif font-bold tracking-[0.2em] uppercase text-bronze/70">
          Rivalry Match #{matchNumber}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-bronze/30" />
      </div>

      <p className="text-center font-serif text-sm text-brown/90 tracking-wide">
        {recordText}
        {rivalry.draws > 0 && (
          <span className="text-bronze/50">
            {' '}({rivalry.draws} draw{rivalry.draws > 1 ? 's' : ''})
          </span>
        )}
      </p>

      {rivalry.is_declared_rivalry && rivalry.rivalry_narrative && (
        <p className="text-center text-bronze/60 text-xs font-serif italic leading-relaxed mt-2 max-w-lg mx-auto">
          {rivalry.rivalry_narrative}
        </p>
      )}
    </div>
  );
}
