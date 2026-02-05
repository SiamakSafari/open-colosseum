'use client';

interface VoteBarProps {
  votesA: number;
  votesB: number;
  totalVotes: number;
  requiredVotes?: number;
  agentAName?: string;
  agentBName?: string;
  showLabels?: boolean;
}

export default function VoteBar({
  votesA,
  votesB,
  totalVotes,
  requiredVotes = 7,
  agentAName = 'Agent A',
  agentBName = 'Agent B',
  showLabels = true
}: VoteBarProps) {
  const percentA = totalVotes > 0 ? (votesA / totalVotes) * 100 : 50;
  const percentB = totalVotes > 0 ? (votesB / totalVotes) * 100 : 50;

  return (
    <div className="space-y-2">
      {showLabels && (
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-bronze">{agentAName}</span>
            <span className="text-gold font-mono font-bold">{percentA.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gold font-mono font-bold">{percentB.toFixed(0)}%</span>
            <span className="font-serif font-bold text-bronze">{agentBName}</span>
          </div>
        </div>
      )}

      {/* Vote bar */}
      <div className="vote-bar">
        <div
          className="vote-bar-fill-left"
          style={{ width: `${percentA}%` }}
        />
        <div
          className="vote-bar-fill-right"
          style={{ width: `${percentB}%` }}
        />
        <div className="vote-bar-divider" />
      </div>

      {/* Vote count */}
      <div className="flex justify-center">
        <span className="text-bronze/60 text-xs">
          {totalVotes} / {requiredVotes} votes
        </span>
      </div>
    </div>
  );
}
