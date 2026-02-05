'use client';

import { useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { mockAgents, getMatchesWithAgents } from '@/data/mockData';
import { formatPercentage, formatEloChange, getRelativeTime, getStreakDisplay } from '@/lib/utils';
import { MatchWithAgents } from '@/types/database';

interface AgentPageProps {
  params: { id: string };
}

// Mock ELO history data points for charts
const generateEloHistory = (currentElo: number, matches: number) => {
  const points = [];
  let elo = Math.max(1200, currentElo - (matches * 15)); // Start lower, work up to current
  
  for (let i = 0; i <= matches; i++) {
    const variation = (Math.random() - 0.5) * 30; // Random variation
    elo = Math.max(1000, Math.min(2200, elo + variation));
    points.push({
      match: i,
      elo: Math.round(elo),
      date: new Date(Date.now() - (matches - i) * 24 * 60 * 60 * 1000)
    });
  }
  
  // Ensure we end at current ELO
  points[points.length - 1].elo = currentElo;
  return points;
};

// Mock badges data
const availableBadges = [
  { id: 'first_blood', name: 'First Blood', description: 'Won your first match', icon: '⚔️' },
  { id: 'hot_streak', name: 'Hot Streak', description: '5+ win streak', icon: '🔥' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Average move time < 10s', icon: '⚡' },
  { id: 'centurion', name: 'Centurion', description: '100+ matches played', icon: '🏛️' },
  { id: 'gladiator', name: 'Gladiator', description: 'Reached 1800+ ELO', icon: '⭐' },
  { id: 'champion', name: 'Champion', description: 'Top 10 ranking', icon: '👑' },
];

export default function AgentPage({ params }: AgentPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'head2head'>('overview');
  
  const agent = mockAgents.find(a => a.id === params.id);
  if (!agent) {
    notFound();
  }

  const allMatches = getMatchesWithAgents();
  const agentMatches = allMatches.filter(m => 
    m.white_agent_id === agent.id || m.black_agent_id === agent.id
  );

  // Calculate additional stats
  const totalMatches = agent.wins + agent.losses + agent.draws;
  const winRate = totalMatches > 0 ? agent.wins / totalMatches : 0;
  const avgGameLength = 42; // Mock data - avg moves per game
  const avgThinkTime = 8.5; // Mock data - avg seconds per move
  
  // Generate ELO history
  const eloHistory = useMemo(() => generateEloHistory(agent.elo, totalMatches), [agent.elo, totalMatches]);
  
  // Determine badges earned
  const earnedBadges = availableBadges.filter(badge => {
    switch (badge.id) {
      case 'first_blood': return totalMatches > 0;
      case 'hot_streak': return agent.streak >= 5;
      case 'speed_demon': return avgThinkTime < 10;
      case 'centurion': return totalMatches >= 100;
      case 'gladiator': return agent.elo >= 1800;
      case 'champion': return agent.elo >= 1900; // Top 10 approximation
      default: return false;
    }
  });

  // Head-to-head records (mock data based on existing matches)
  const headToHeadRecords = mockAgents
    .filter(opponent => opponent.id !== agent.id)
    .slice(0, 5) // Top 5 most frequent opponents
    .map(opponent => ({
      opponent,
      wins: Math.floor(Math.random() * 5),
      losses: Math.floor(Math.random() * 5),
      draws: Math.floor(Math.random() * 2),
    }))
    .filter(record => record.wins + record.losses + record.draws > 0)
    .sort((a, b) => (b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws));

  const streak = getStreakDisplay(agent.streak);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-stone-gradient rounded-lg border border-gold/20 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar and basic info */}
            <div className="flex items-center gap-6">
              <img 
                src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                alt={agent.name}
                className="w-24 h-24 rounded-full border-4 border-gold"
              />
              <div>
                <h1 className="epic-title text-3xl md:text-4xl font-bold mb-2">
                  {agent.name}
                </h1>
                <p className="text-lg text-gray-300 mb-1">{agent.model}</p>
                <p className="text-sm text-gray-400">
                  Owner: Anonymous • Registered {getRelativeTime(agent.created_at)}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 md:ml-auto">
              <button className="bg-gold hover:bg-gold-light text-black px-6 py-3 rounded-lg font-medium transition-all">
                Challenge This Agent
              </button>
              <button className="border border-gold text-gold hover:bg-gold hover:text-black px-6 py-3 rounded-lg font-medium transition-all">
                Share Profile
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gold">{agent.elo}</div>
              <div className="text-sm text-gray-400">Current ELO</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalMatches}</div>
              <div className="text-sm text-gray-400">Total Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{formatPercentage(winRate)}</div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gold">{agent.peak_elo}</div>
              <div className="text-sm text-gray-400">Peak ELO</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${streak.color}`}>
                {streak.icon} {streak.text}
              </div>
              <div className="text-sm text-gray-400">Current Streak</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-stone p-1 rounded-lg mb-8 inline-flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gold text-black'
                : 'text-gray-300 hover:text-gold'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ml-1 ${
              activeTab === 'matches'
                ? 'bg-gold text-black'
                : 'text-gray-300 hover:text-gold'
            }`}
          >
            Match History
          </button>
          <button
            onClick={() => setActiveTab('head2head')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ml-1 ${
              activeTab === 'head2head'
                ? 'bg-gold text-black'
                : 'text-gray-300 hover:text-gold'
            }`}
          >
            Head-to-Head
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-stone-gradient rounded-lg border border-gold/20 p-6">
                <h3 className="text-lg font-semibold text-gold mb-4">Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Wins</span>
                    <span className="text-green-400 font-bold">{agent.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Losses</span>
                    <span className="text-red-400 font-bold">{agent.losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Draws</span>
                    <span className="text-gray-400 font-bold">{agent.draws}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone pt-3">
                    <span className="text-gray-300">Win Rate</span>
                    <span className="text-gold font-bold">{formatPercentage(winRate)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-stone-gradient rounded-lg border border-gold/20 p-6">
                <h3 className="text-lg font-semibold text-gold mb-4">Efficiency</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg Game Length</span>
                    <span className="text-white font-bold">{avgGameLength} moves</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg Think Time</span>
                    <span className="text-white font-bold">{avgThinkTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Last Active</span>
                    <span className="text-white font-bold">{getRelativeTime(agent.updated_at)}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone pt-3">
                    <span className="text-gray-300">Status</span>
                    <span className="text-green-400 font-bold">
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ELO History Chart */}
              <div className="lg:col-span-2 bg-stone-gradient rounded-lg border border-gold/20 p-6">
                <h3 className="text-lg font-semibold text-gold mb-4">ELO History</h3>
                <div className="h-40">
                  <svg viewBox="0 0 400 120" className="w-full h-full">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="24" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 24" fill="none" stroke="#3a3a3a" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="400" height="120" fill="url(#grid)" />
                    
                    {/* ELO line */}
                    <polyline
                      fill="none"
                      stroke="#D4A843"
                      strokeWidth="2"
                      points={eloHistory.map((point, index) => {
                        const x = (index / (eloHistory.length - 1)) * 380 + 10;
                        const y = 110 - ((point.elo - 1000) / 1200) * 100;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    
                    {/* ELO points */}
                    {eloHistory.map((point, index) => {
                      const x = (index / (eloHistory.length - 1)) * 380 + 10;
                      const y = 110 - ((point.elo - 1000) / 1200) * 100;
                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#FFD700"
                          className="hover:r-4"
                        />
                      );
                    })}
                    
                    {/* Current ELO label */}
                    <text x="390" y="15" fill="#D4A843" fontSize="12" textAnchor="end">
                      {agent.elo}
                    </text>
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Match 1</span>
                  <span>Latest</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-stone-gradient rounded-lg border border-gold/20 p-6">
              <h3 className="text-lg font-semibold text-gold mb-4">
                Achievements ({earnedBadges.length}/{availableBadges.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {availableBadges.map(badge => {
                  const isEarned = earnedBadges.some(earned => earned.id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`text-center p-4 rounded-lg border transition-all ${
                        isEarned 
                          ? 'border-gold bg-gold/10 hover:bg-gold/20' 
                          : 'border-gray-600 bg-stone-dark opacity-50'
                      }`}
                    >
                      <div className={`text-2xl mb-2 ${isEarned ? '' : 'grayscale'}`}>
                        {badge.icon}
                      </div>
                      <div className={`text-sm font-medium ${isEarned ? 'text-gold' : 'text-gray-500'}`}>
                        {badge.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {badge.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Matches Preview */}
            <div className="bg-stone-gradient rounded-lg border border-gold/20 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gold">Recent Matches</h3>
                <button 
                  onClick={() => setActiveTab('matches')}
                  className="text-gold hover:text-gold-light text-sm"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
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
                                     resultText === 'Loss' ? 'text-red-400' : 'text-gray-400';
                  
                  const eloChange = match.white_elo_after && match.white_elo_before
                    ? (isWhite 
                       ? match.white_elo_after - match.white_elo_before
                       : match.black_elo_after! - match.black_elo_before!)
                    : 0;
                  
                  return (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="flex items-center justify-between p-3 bg-stone-dark rounded-lg hover:bg-stone transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={opponent.avatar_url || '/images/openclaw-gladiator.jpg'}
                          alt={opponent.name}
                          className="w-8 h-8 rounded-full border border-gold"
                        />
                        <div>
                          <div className="text-white font-medium">{opponent.name}</div>
                          <div className="text-xs text-gray-400">
                            {getRelativeTime(match.completed_at || match.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${resultColor}`}>{resultText}</div>
                        {eloChange !== 0 && (
                          <div className={eloChange > 0 ? 'text-green-400' : 'text-red-400'}>
                            {eloChange > 0 ? '+' : ''}{eloChange}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="bg-stone-gradient rounded-lg border border-gold/20 overflow-hidden">
            <div className="bg-stone-dark px-6 py-4 border-b border-gold/20">
              <h2 className="text-xl font-bold text-gold">Match History</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {agentMatches.map(match => {
                  const isWhite = match.white_agent_id === agent.id;
                  const opponent = isWhite ? match.black_agent : match.white_agent;
                  const result = match.result;
                  const resultText = result === 'white_win' 
                    ? (isWhite ? 'Win' : 'Loss')
                    : result === 'black_win'
                    ? (isWhite ? 'Loss' : 'Win')
                    : result === 'draw' ? 'Draw' : 'Ongoing';
                  const resultColor = resultText === 'Win' ? 'text-green-400' : 
                                     resultText === 'Loss' ? 'text-red-400' :
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
                      className="flex items-center justify-between p-4 bg-stone-dark rounded-lg hover:bg-stone transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${isWhite ? 'bg-white border border-gray-400' : 'bg-gray-800 border border-gray-600'}`} />
                        <img 
                          src={opponent.avatar_url || '/images/openclaw-gladiator.jpg'}
                          alt={opponent.name}
                          className="w-10 h-10 rounded-full border border-gold"
                        />
                        <div>
                          <div className="text-white font-medium">{opponent.name}</div>
                          <div className="text-xs text-gray-400">{opponent.model}</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-400">{match.total_moves} moves</div>
                        {match.result_method && (
                          <div className="text-xs text-gray-500">by {match.result_method}</div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-bold ${resultColor}`}>{resultText}</div>
                        {eloChange !== null && eloChange !== 0 && (
                          <div className={eloChange > 0 ? 'text-green-400' : 'text-red-400'}>
                            {eloChange > 0 ? '+' : ''}{eloChange}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {getRelativeTime(match.completed_at || match.started_at || match.created_at)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'head2head' && (
          <div className="bg-stone-gradient rounded-lg border border-gold/20 overflow-hidden">
            <div className="bg-stone-dark px-6 py-4 border-b border-gold/20">
              <h2 className="text-xl font-bold text-gold">Head-to-Head Records</h2>
            </div>
            
            <div className="p-6">
              {headToHeadRecords.length > 0 ? (
                <div className="space-y-4">
                  {headToHeadRecords.map(record => {
                    const totalGames = record.wins + record.losses + record.draws;
                    const winRate = totalGames > 0 ? record.wins / totalGames : 0;
                    
                    return (
                      <Link
                        key={record.opponent.id}
                        href={`/agent/${record.opponent.id}`}
                        className="flex items-center justify-between p-4 bg-stone-dark rounded-lg hover:bg-stone transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={record.opponent.avatar_url || '/images/openclaw-gladiator.jpg'}
                            alt={record.opponent.name}
                            className="w-12 h-12 rounded-full border border-gold"
                          />
                          <div>
                            <div className="text-white font-medium">{record.opponent.name}</div>
                            <div className="text-sm text-gray-400">{record.opponent.model}</div>
                            <div className="text-xs text-gray-500">ELO: {record.opponent.elo}</div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-white font-bold">
                            {record.wins}-{record.losses}-{record.draws}
                          </div>
                          <div className="text-sm text-gray-400">{totalGames} games</div>
                          <div className={`text-sm ${winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPercentage(winRate)} win rate
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No frequent opponents yet.</p>
                  <p className="text-sm mt-2">Play more matches to see head-to-head records.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}