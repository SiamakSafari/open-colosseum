'use client';

import { useState, useMemo, use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { mockAgents, getMatchesWithAgents } from '@/data/mockData';
import { formatPercentage, formatEloChange, getRelativeTime, getStreakDisplay } from '@/lib/utils';

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

// Mock ELO history
const generateEloHistory = (currentElo: number, matches: number) => {
  const points = [];
  let elo = Math.max(1200, currentElo - (matches * 15));
  
  for (let i = 0; i <= matches; i++) {
    const variation = (Math.random() - 0.5) * 30;
    elo = Math.max(1000, Math.min(2200, elo + variation));
    points.push({
      match: i,
      elo: Math.round(elo),
      date: new Date(Date.now() - (matches - i) * 24 * 60 * 60 * 1000)
    });
  }
  
  points[points.length - 1].elo = currentElo;
  return points;
};

// Badge definitions
const availableBadges = [
  { id: 'first_blood', name: 'First Blood', description: 'Won your first match', icon: '⚔️', tier: 'bronze' },
  { id: 'hot_streak', name: 'Hot Streak', description: '5+ win streak', icon: '🔥', tier: 'gold' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Avg move time < 10s', icon: '⚡', tier: 'silver' },
  { id: 'centurion', name: 'Centurion', description: '100+ matches played', icon: '🏛️', tier: 'gold' },
  { id: 'gladiator', name: 'Gladiator', description: 'Reached 1800+ ELO', icon: '⭐', tier: 'silver' },
  { id: 'champion', name: 'Champion', description: 'Top 10 ranking', icon: '👑', tier: 'gold' },
];

export default function AgentPage({ params }: AgentPageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'head2head'>('overview');
  
  const agent = mockAgents.find(a => a.id === id);
  if (!agent) {
    notFound();
  }

  const allMatches = getMatchesWithAgents();
  const agentMatches = allMatches.filter(m => 
    m.white_agent_id === agent.id || m.black_agent_id === agent.id
  );

  const totalMatches = agent.wins + agent.losses + agent.draws;
  const winRate = totalMatches > 0 ? agent.wins / totalMatches : 0;
  const avgGameLength = 42;
  const avgThinkTime = 8.5;
  
  const eloHistory = useMemo(() => generateEloHistory(agent.elo, totalMatches), [agent.elo, totalMatches]);
  
  const earnedBadges = availableBadges.filter(badge => {
    switch (badge.id) {
      case 'first_blood': return totalMatches > 0;
      case 'hot_streak': return agent.streak >= 5;
      case 'speed_demon': return avgThinkTime < 10;
      case 'centurion': return totalMatches >= 100;
      case 'gladiator': return agent.elo >= 1800;
      case 'champion': return agent.elo >= 1900;
      default: return false;
    }
  });

  const headToHeadRecords = mockAgents
    .filter(opponent => opponent.id !== agent.id)
    .slice(0, 5)
    .map(opponent => ({
      opponent,
      wins: Math.floor(Math.random() * 5),
      losses: Math.floor(Math.random() * 5),
      draws: Math.floor(Math.random() * 2),
    }))
    .filter(record => record.wins + record.losses + record.draws > 0)
    .sort((a, b) => (b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws));

  const streak = getStreakDisplay(agent.streak);

  // ELO chart helpers
  const minElo = Math.min(...eloHistory.map(p => p.elo)) - 20;
  const maxElo = Math.max(...eloHistory.map(p => p.elo)) + 20;
  const chartWidth = 480;
  const chartHeight = 140;
  
  const eloToY = (elo: number) => chartHeight - 10 - ((elo - minElo) / (maxElo - minElo)) * (chartHeight - 20);
  const indexToX = (i: number) => 10 + (i / (eloHistory.length - 1)) * (chartWidth - 20);
  
  const linePath = eloHistory.map((point, i) => {
    const x = indexToX(i);
    const y = eloToY(point.elo);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  
  const areaPath = `${linePath} L${indexToX(eloHistory.length - 1)},${chartHeight} L${indexToX(0)},${chartHeight} Z`;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 animate-fade-in">
          <Link href="/leaderboard" className="text-gray-600 hover:text-gold text-xs font-serif tracking-wider uppercase transition-colors">
            ← Leaderboard
          </Link>
        </div>

        {/* Profile Header */}
        <div className="card-stone p-8 mb-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar + Info */}
            <div className="flex items-center gap-6">
              <div className="avatar-ring w-24 h-24">
                <img 
                  src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                  alt={agent.name}
                  className="w-full h-full rounded-full"
                />
              </div>
              <div>
                <h1 className="epic-title text-3xl md:text-4xl font-black mb-1">
                  {agent.name}
                </h1>
                <p className="text-gray-400 text-sm">{agent.model}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Registered {getRelativeTime(agent.created_at)}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 md:ml-auto">
              <button className="btn-primary text-xs py-2.5 px-5">
                Challenge
              </button>
              <button className="btn-secondary text-xs py-2.5 px-5">
                Share
              </button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-8 pt-6 border-t border-gold/8">
            <StatBlock value={agent.elo.toString()} label="Current ELO" color="text-gold" />
            <StatBlock value={totalMatches.toString()} label="Total Matches" color="text-white" />
            <StatBlock value={formatPercentage(winRate)} label="Win Rate" color="text-green-400" />
            <StatBlock value={agent.peak_elo.toString()} label="Peak ELO" color="text-gold" />
            <StatBlock 
              value={`${streak.icon} ${streak.text}`} 
              label="Streak" 
              color={streak.color} 
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 animate-fade-in-up delay-200">
          <div className="tab-container inline-flex">
            {(['overview', 'matches', 'head2head'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'tab-button-active' : ''}`}
              >
                {tab === 'head2head' ? 'Head-to-Head' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Performance */}
              <div className="card-stone p-6 animate-fade-in-up delay-100">
                <h3 className="section-heading text-sm text-gold mb-4">Performance</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Wins</span>
                    <span className="text-green-400 font-bold font-mono">{agent.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Losses</span>
                    <span className="text-red/80 font-bold font-mono">{agent.losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Draws</span>
                    <span className="text-gray-400 font-bold font-mono">{agent.draws}</span>
                  </div>
                  <div className="divider-gold" />
                  <div className="flex justify-between">
                    <span className="text-gray-500">Win Rate</span>
                    <span className="text-gold font-bold">{formatPercentage(winRate)}</span>
                  </div>
                </div>
              </div>

              {/* Efficiency */}
              <div className="card-stone p-6 animate-fade-in-up delay-200">
                <h3 className="section-heading text-sm text-gold mb-4">Efficiency</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Length</span>
                    <span className="text-white font-mono">{avgGameLength} moves</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Think Time</span>
                    <span className="text-white font-mono">{avgThinkTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Active</span>
                    <span className="text-white">{getRelativeTime(agent.updated_at)}</span>
                  </div>
                  <div className="divider-gold" />
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={agent.is_active ? 'text-green-400' : 'text-gray-600'}>
                      {agent.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ELO Chart */}
              <div className="lg:col-span-2 card-stone p-6 animate-fade-in-up delay-300">
                <h3 className="section-heading text-sm text-gold mb-4">ELO History</h3>
                <div className="h-40">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d4a843" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map(ratio => (
                      <line
                        key={ratio}
                        x1="10"
                        y1={10 + ratio * (chartHeight - 20)}
                        x2={chartWidth - 10}
                        y2={10 + ratio * (chartHeight - 20)}
                        stroke="#1a1a1a"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* Area fill */}
                    <path d={areaPath} className="elo-chart-area" />
                    
                    {/* Line */}
                    <path d={linePath} className="elo-chart-line" />
                    
                    {/* Data points */}
                    {eloHistory.map((point, index) => (
                      <circle
                        key={index}
                        cx={indexToX(index)}
                        cy={eloToY(point.elo)}
                        r="2.5"
                        className="elo-chart-dot"
                      />
                    ))}
                    
                    {/* Current ELO label */}
                    <text 
                      x={chartWidth - 12} 
                      y={eloToY(agent.elo) - 8} 
                      fill="#ffd700" 
                      fontSize="11" 
                      textAnchor="end"
                      fontFamily="Cinzel"
                      fontWeight="bold"
                    >
                      {agent.elo}
                    </text>
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>Match 1</span>
                  <span>Latest</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="card-stone p-6 animate-fade-in-up delay-400">
              <div className="flex items-center justify-between mb-5">
                <h3 className="section-heading text-sm text-gold">
                  Achievements
                </h3>
                <span className="text-xs text-gray-600">
                  {earnedBadges.length}/{availableBadges.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {availableBadges.map(badge => {
                  const isEarned = earnedBadges.some(earned => earned.id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`badge ${isEarned ? 'badge-earned' : 'badge-locked'}`}
                    >
                      <div className="badge-icon">
                        <span className="text-2xl">{badge.icon}</span>
                      </div>
                      <span className={`text-xs font-serif font-bold mt-1 ${isEarned ? 'text-gold' : 'text-gray-600'}`}>
                        {badge.name}
                      </span>
                      <span className="text-[10px] text-gray-500 text-center mt-0.5 leading-tight">
                        {badge.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Matches Preview */}
            <div className="card-stone p-6 animate-fade-in-up delay-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-heading text-sm text-gold">Recent Matches</h3>
                <button 
                  onClick={() => setActiveTab('matches')}
                  className="text-gold/60 hover:text-gold text-xs font-serif transition-colors"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-2">
                {agentMatches.slice(0, 3).map(match => {
                  const isWhite = match.white_agent_id === agent.id;
                  const opponent = isWhite ? match.black_agent : match.white_agent;
                  const result = match.result;
                  const resultText = result === 'white_win' 
                    ? (isWhite ? 'Win' : 'Loss')
                    : result === 'black_win'
                    ? (isWhite ? 'Loss' : 'Win')
                    : 'Draw';
                  const resultColor = resultText === 'Win' ? 'text-green-400' : 
                                     resultText === 'Loss' ? 'text-red/80' : 'text-gray-400';
                  
                  const eloChange = match.white_elo_after && match.white_elo_before
                    ? (isWhite 
                       ? match.white_elo_after - match.white_elo_before
                       : match.black_elo_after! - match.black_elo_before!)
                    : 0;
                  
                  return (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="flex items-center justify-between p-3 bg-[#0e0e0e] rounded-xl hover:bg-[#141414] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="avatar-ring w-8 h-8">
                          <img 
                            src={opponent.avatar_url || '/images/openclaw-gladiator.jpg'}
                            alt={opponent.name}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">{opponent.name}</p>
                          <p className="text-gray-600 text-[11px]">
                            {getRelativeTime(match.completed_at || match.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-serif font-bold text-sm ${resultColor}`}>{resultText}</p>
                        {eloChange !== 0 && (
                          <p className={`text-xs ${eloChange > 0 ? 'text-green-400/80' : 'text-red/60'}`}>
                            {eloChange > 0 ? '+' : ''}{eloChange}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== MATCHES TAB ===== */}
        {activeTab === 'matches' && (
          <div className="card-stone overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gold/8">
              <h2 className="section-heading text-base text-gold">Match History</h2>
            </div>
            <div className="p-6 space-y-2">
              {agentMatches.map(match => {
                const isWhite = match.white_agent_id === agent.id;
                const opponent = isWhite ? match.black_agent : match.white_agent;
                const result = match.result;
                const resultText = result === 'white_win' 
                  ? (isWhite ? 'Win' : 'Loss')
                  : result === 'black_win'
                  ? (isWhite ? 'Loss' : 'Win')
                  : result === 'draw' ? 'Draw' : 'Live';
                const resultColor = resultText === 'Win' ? 'text-green-400' : 
                                   resultText === 'Loss' ? 'text-red/80' :
                                   resultText === 'Draw' ? 'text-gray-400' : 'text-gold';
                
                const eloChange = match.white_elo_after && match.white_elo_before
                  ? (isWhite 
                     ? match.white_elo_after - match.white_elo_before
                     : match.black_elo_after! - match.black_elo_before!)
                  : null;
                
                return (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="flex items-center justify-between p-4 bg-[#0e0e0e] rounded-xl hover:bg-[#141414] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${isWhite ? 'bg-white/90' : 'bg-gray-700 border border-gray-600'}`} />
                      <div className="avatar-ring w-10 h-10">
                        <img 
                          src={opponent.avatar_url || '/images/openclaw-gladiator.jpg'}
                          alt={opponent.name}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm group-hover:text-gold transition-colors">{opponent.name}</p>
                        <p className="text-gray-600 text-[11px]">{opponent.model}</p>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{match.total_moves} moves</p>
                      {match.result_method && (
                        <p className="text-[10px] text-gray-600">by {match.result_method}</p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-serif font-bold text-sm ${resultColor}`}>{resultText}</p>
                      {eloChange !== null && eloChange !== 0 && (
                        <p className={`text-xs ${eloChange > 0 ? 'text-green-400/80' : 'text-red/60'}`}>
                          {eloChange > 0 ? '+' : ''}{eloChange}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600">
                        {getRelativeTime(match.completed_at || match.started_at || match.created_at)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== HEAD-TO-HEAD TAB ===== */}
        {activeTab === 'head2head' && (
          <div className="card-stone overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gold/8">
              <h2 className="section-heading text-base text-gold">Head-to-Head Records</h2>
            </div>
            <div className="p-6">
              {headToHeadRecords.length > 0 ? (
                <div className="space-y-3">
                  {headToHeadRecords.map(record => {
                    const totalGames = record.wins + record.losses + record.draws;
                    const h2hWinRate = totalGames > 0 ? record.wins / totalGames : 0;
                    
                    return (
                      <Link
                        key={record.opponent.id}
                        href={`/agent/${record.opponent.id}`}
                        className="flex items-center justify-between p-4 bg-[#0e0e0e] rounded-xl hover:bg-[#141414] transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="avatar-ring w-12 h-12">
                            <img 
                              src={record.opponent.avatar_url || '/images/openclaw-gladiator.jpg'}
                              alt={record.opponent.name}
                              className="w-full h-full rounded-full"
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm group-hover:text-gold transition-colors">
                              {record.opponent.name}
                            </p>
                            <p className="text-gray-600 text-[11px]">{record.opponent.model}</p>
                            <p className="text-gold/60 text-[11px] font-serif">{record.opponent.elo} ELO</p>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-white font-mono font-bold text-sm">
                            {record.wins}-{record.losses}-{record.draws}
                          </p>
                          <p className="text-gray-600 text-[10px]">{totalGames} games</p>
                          <p className={`text-xs ${h2hWinRate >= 0.5 ? 'text-green-400/80' : 'text-red/60'}`}>
                            {formatPercentage(h2hWinRate)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-serif text-sm">No frequent opponents yet.</p>
                  <p className="text-gray-700 text-xs mt-1">Play more matches to see head-to-head records.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatBlock({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`stat-value text-2xl ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
