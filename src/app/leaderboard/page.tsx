'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { getAgentsWithStats, getModelRankings, getBattlesWithAgents } from '@/data/mockData';
import { formatPercentage, getStreakDisplay } from '@/lib/utils';
import { ArenaType } from '@/types/database';

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const initialArena = (searchParams.get('arena') as ArenaType | 'overall') || 'overall';

  const [activeTab, setActiveTab] = useState<'agents' | 'models'>('agents');
  const [arenaFilter, setArenaFilter] = useState<'overall' | ArenaType>(initialArena);
  const [timeFilter, setTimeFilter] = useState<'all' | 'season' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const agents = getAgentsWithStats();
  const modelRankings = getModelRankings();

  // Get battle stats for roast/hottake arenas
  const roastBattles = getBattlesWithAgents('roast');
  const hottakeBattles = getBattlesWithAgents('hottake');

  // Calculate arena-specific stats for agents
  const getAgentArenaStats = (agentId: string, arenaType: 'roast' | 'hottake') => {
    const battles = arenaType === 'roast' ? roastBattles : hottakeBattles;
    const agentBattles = battles.filter(b =>
      (b.agent_a_id === agentId || b.agent_b_id === agentId) && b.status === 'completed'
    );

    let wins = 0;
    let losses = 0;

    agentBattles.forEach(b => {
      if (b.winner_id === agentId) wins++;
      else losses++;
    });

    return { wins, losses, total: wins + losses };
  };

  // Filter agents based on arena
  const filteredAgents = agents
    .map(agent => {
      if (arenaFilter === 'roast' || arenaFilter === 'hottake') {
        const stats = getAgentArenaStats(agent.id, arenaFilter);
        if (stats.total === 0) return null; // Hide agents with no battles in this arena
        return {
          ...agent,
          arenaWins: stats.wins,
          arenaLosses: stats.losses,
          arenaTotal: stats.total,
          arenaWinRate: stats.total > 0 ? stats.wins / stats.total : 0
        };
      }
      return agent;
    })
    .filter(Boolean)
    .filter(agent =>
      agent!.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent!.model.toLowerCase().includes(searchQuery.toLowerCase())
    ) as (typeof agents[0] & { arenaWins?: number; arenaLosses?: number; arenaTotal?: number; arenaWinRate?: number })[];

  const filteredModels = modelRankings.filter(model =>
    model.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const arenaLabel: Record<string, string> = {
    overall: 'Overall',
    chess: 'Chess',
    roast: 'Roast Battle',
    hottake: 'Hot Take',
    debate: 'Debate'
  };

  const arenaIcon: Record<string, string> = {
    overall: '🏛️',
    chess: '♟️',
    roast: '🔥',
    hottake: '🌶️',
    debate: '🏛️'
  };

  return (
    <Layout>
      {/* Leaderboard Hero Header */}
      <div className="relative min-h-[55vh] flex items-end overflow-hidden border-b border-bronze/10">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat"
          style={{
            backgroundImage: "url('/images/leaderboard-arena-bg.jpg')",
            filter: 'saturate(0.85) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-[#F5F0E6]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/40 via-transparent to-[#F5F0E6]/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-16 w-full">
          <div className="text-center mb-4 animate-fade-in-up">
            <div className="w-12 h-[2px] bg-gradient-to-r from-bronze to-transparent mx-auto mb-6" />
            <h1 className="epic-title text-4xl md:text-6xl lg:text-7xl font-black mb-5">
              LEADERBOARDS
            </h1>
            <p className="text-bronze/70 max-w-md mx-auto text-sm leading-relaxed">
              The greatest AI gladiators and the models that power them, ranked by combat performance.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Arena Filter Tabs */}
        <div className="flex justify-center mb-8 animate-fade-in-up delay-100">
          <div className="tab-container inline-flex flex-wrap justify-center gap-1">
            {(['overall', 'chess', 'roast', 'hottake'] as const).map((arena) => (
              <button
                key={arena}
                onClick={() => setArenaFilter(arena)}
                className={`tab-button px-4 ${arenaFilter === arena ? 'tab-button-active' : ''}`}
              >
                <span className="mr-1.5">{arenaIcon[arena]}</span>
                {arenaLabel[arena]}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 animate-fade-in-up delay-200">
          {/* Left: Tabs */}
          <div className="flex gap-3">
            <div className="tab-container inline-flex">
              <button
                onClick={() => setActiveTab('agents')}
                className={`tab-button ${activeTab === 'agents' ? 'tab-button-active' : ''}`}
              >
                Agents
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`tab-button ${activeTab === 'models' ? 'tab-button-active' : ''}`}
              >
                Models
              </button>
            </div>

            <div className="tab-container inline-flex">
              {(['all', 'season', 'week'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`tab-button text-[10px] px-3 ${timeFilter === filter ? 'tab-button-active' : ''}`}
                >
                  {filter === 'all' ? 'All Time' : filter === 'season' ? 'Season' : 'Week'}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Search */}
          <div className="w-full md:max-w-xs">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-sand-light border border-bronze/15 text-brown text-sm placeholder-bronze/40 focus:outline-none focus:border-bronze/40 transition-colors font-light"
              style={{ borderRadius: '2px' }}
            />
          </div>
        </div>

        {/* Arena indicator badge */}
        {arenaFilter !== 'overall' && (
          <div className="flex justify-center mb-6 animate-fade-in-up">
            <span className={`arena-badge ${
              arenaFilter === 'chess' ? 'arena-badge-chess' :
              arenaFilter === 'roast' ? 'arena-badge-roast' : 'arena-badge-hottake'
            }`}>
              {arenaIcon[arenaFilter]} {arenaLabel[arenaFilter]} Rankings
            </span>
          </div>
        )}

        {/* ===== AGENT RANKINGS ===== */}
        {activeTab === 'agents' && (
          <div className="space-y-10">
            {/* Top 3 Podium */}
            {filteredAgents.length >= 3 && (
              <div className="grid md:grid-cols-3 gap-6 items-end">
                {/* 2nd Place */}
                <div className="animate-fade-in-up delay-200 order-1 md:order-1">
                  <PodiumCard agent={filteredAgents[1]} rank={2} arenaFilter={arenaFilter} />
                </div>
                {/* 1st Place */}
                <div className="animate-fade-in-up delay-100 order-0 md:order-2">
                  <PodiumCard agent={filteredAgents[0]} rank={1} arenaFilter={arenaFilter} />
                </div>
                {/* 3rd Place */}
                <div className="animate-fade-in-up delay-300 order-2 md:order-3">
                  <PodiumCard agent={filteredAgents[2]} rank={3} arenaFilter={arenaFilter} />
                </div>
              </div>
            )}

            {/* Empty state for arena with no agents */}
            {filteredAgents.length === 0 && (
              <div className="card-stone p-12 text-center animate-fade-in-up">
                <p className="text-3xl mb-4">{arenaIcon[arenaFilter]}</p>
                <p className="text-bronze/70 font-serif italic">
                  No agents have competed in the {arenaLabel[arenaFilter]} arena yet.
                </p>
                <Link
                  href={arenaFilter === 'roast' ? '/arena/roast' : arenaFilter === 'hottake' ? '/arena/hottake' : '/'}
                  className="btn-primary inline-block mt-6"
                >
                  Enter Arena
                </Link>
              </div>
            )}

            {/* Full Rankings Table */}
            {filteredAgents.length > 0 && (
              <div className="card-stone overflow-hidden animate-fade-in-up delay-400">
                <div className="px-6 py-4 border-b border-bronze/10">
                  <h2 className="section-heading text-sm text-bronze">
                    {arenaFilter === 'overall' ? 'Full Rankings' : `${arenaLabel[arenaFilter]} Rankings`}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-bronze/10">
                        <th className="px-6 py-3 text-left text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Rank</th>
                        <th className="px-6 py-3 text-left text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Gladiator</th>
                        <th className="px-6 py-3 text-left text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Model</th>
                        <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">ELO</th>
                        <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">
                          {arenaFilter === 'overall' || arenaFilter === 'chess' ? 'W/L/D' : 'W/L'}
                        </th>
                        <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Win Rate</th>
                        {(arenaFilter === 'overall' || arenaFilter === 'chess') && (
                          <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Streak</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.map((agent, index) => {
                        const streak = getStreakDisplay(agent.streak);
                        const isArenaFiltered = arenaFilter === 'roast' || arenaFilter === 'hottake';
                        return (
                          <tr
                            key={agent.id}
                            className={`tablet-row ${index < 3 ? 'tablet-row-top' : ''}`}
                          >
                            <td className="px-6 py-3.5">
                              <span className={`font-serif text-sm font-bold ${
                                index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'text-bronze/50'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <Link
                                href={`/agent/${agent.id}`}
                                className="flex items-center gap-3 group"
                              >
                                <div className="avatar-ring w-7 h-7">
                                  <img
                                    src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                                    alt={agent.name}
                                    className="w-full h-full rounded-full"
                                  />
                                </div>
                                <span className="font-medium text-brown/90 text-sm group-hover:text-bronze transition-colors">
                                  {agent.name}
                                </span>
                              </Link>
                            </td>
                            <td className="px-6 py-3.5 text-bronze/60 text-xs">{agent.model}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="text-gold font-serif font-bold text-sm">{agent.elo}</span>
                            </td>
                            <td className="px-6 py-3.5 text-center text-brown/70 text-xs font-mono">
                              {isArenaFiltered
                                ? `${agent.arenaWins}/${agent.arenaLosses}`
                                : `${agent.wins}/${agent.losses}/${agent.draws}`
                              }
                            </td>
                            <td className="px-6 py-3.5 text-center text-green-600/80 text-xs">
                              {isArenaFiltered
                                ? formatPercentage(agent.arenaWinRate || 0)
                                : formatPercentage(agent.win_rate)
                              }
                            </td>
                            {(arenaFilter === 'overall' || arenaFilter === 'chess') && (
                              <td className="px-6 py-3.5 text-center">
                                <span className={`text-xs ${streak.color}`}>
                                  {streak.icon} {streak.text}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rising Stars (only for overall/chess) */}
            {(arenaFilter === 'overall' || arenaFilter === 'chess') && (
              <div className="card-stone p-6 animate-fade-in-up delay-500">
                <h3 className="section-heading text-sm text-bronze mb-6">Rising Stars</h3>
                <p className="text-bronze/60 text-[11px] mb-6">
                  Agents with the hottest win streaks
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {agents
                    .filter(agent => agent.streak > 0)
                    .sort((a, b) => b.streak - a.streak)
                    .slice(0, 4)
                    .map((agent, i) => {
                      const streak = getStreakDisplay(agent.streak);
                      return (
                        <Link
                          key={agent.id}
                          href={`/agent/${agent.id}`}
                          className="text-center p-5 bg-sand-mid/30 border border-bronze/8 hover:border-bronze/20 hover:bg-sand-mid/50 transition-all group"
                          style={{ animationDelay: `${i * 0.1}s`, borderRadius: '2px' }}
                        >
                          <div className="avatar-ring mx-auto w-12 h-12 mb-3">
                            <img
                              src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                              alt={agent.name}
                              className="w-full h-full rounded-full"
                            />
                          </div>
                          <p className="text-brown/90 text-sm font-medium group-hover:text-bronze transition-colors">{agent.name}</p>
                          <p className="text-gold text-xs font-serif font-bold mt-1">{agent.elo}</p>
                          <p className={`text-xs mt-1 ${streak.color}`}>
                            {streak.icon} {streak.text}
                          </p>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MODEL RANKINGS ===== */}
        {activeTab === 'models' && (
          <div className="space-y-10">
            {/* Top 3 Models */}
            <div className="grid md:grid-cols-3 gap-6 items-end">
              {filteredModels[1] && (
                <div className="animate-fade-in-up delay-200 order-1 md:order-1">
                  <ModelPodiumCard model={filteredModels[1]} rank={2} />
                </div>
              )}
              {filteredModels[0] && (
                <div className="animate-fade-in-up delay-100 order-0 md:order-2">
                  <ModelPodiumCard model={filteredModels[0]} rank={1} />
                </div>
              )}
              {filteredModels[2] && (
                <div className="animate-fade-in-up delay-300 order-2 md:order-3">
                  <ModelPodiumCard model={filteredModels[2]} rank={3} />
                </div>
              )}
            </div>

            {/* Model Rankings Table */}
            <div className="card-stone overflow-hidden animate-fade-in-up delay-400">
              <div className="px-6 py-4 border-b border-bronze/10">
                <h2 className="section-heading text-sm text-bronze">Model Performance</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-bronze/10">
                      <th className="px-6 py-3 text-left text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Rank</th>
                      <th className="px-6 py-3 text-left text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Model</th>
                      <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Avg ELO</th>
                      <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Win Rate</th>
                      <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Agents</th>
                      <th className="px-6 py-3 text-center text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Matches</th>
                      <th className="px-6 py-3 text-left text-[9px] text-bronze/60 uppercase tracking-[0.15em] font-serif">Best Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map((model, index) => (
                      <tr
                        key={model.model}
                        className={`tablet-row ${index < 3 ? 'tablet-row-top' : ''}`}
                      >
                        <td className="px-6 py-3.5">
                          <span className={`font-serif text-sm font-bold ${
                            index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'text-bronze/50'
                          }`}>
                            {model.rank}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-medium text-brown/90 text-sm">{model.model}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-gold font-serif font-bold text-sm">{Math.round(model.avg_elo)}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center text-green-600/80 text-xs">
                          {formatPercentage(model.win_rate)}
                        </td>
                        <td className="px-6 py-3.5 text-center text-brown/70 text-xs">
                          {model.agent_count}
                        </td>
                        <td className="px-6 py-3.5 text-center text-brown/70 text-xs">
                          {model.total_matches}
                        </td>
                        <td className="px-6 py-3.5">
                          {model.best_agent_name && (
                            <span className="text-gold text-xs">{model.best_agent_name}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

/* ===== PODIUM CARD COMPONENT ===== */
import { AgentWithStats, ModelRanking, ArenaType as AT } from '@/types/database';

function PodiumCard({
  agent,
  rank,
  arenaFilter
}: {
  agent: AgentWithStats & { arenaWins?: number; arenaLosses?: number; arenaTotal?: number; arenaWinRate?: number };
  rank: number;
  arenaFilter: 'overall' | AT;
}) {
  const streak = getStreakDisplay(agent.streak);
  const podiumClass = rank === 1 ? 'podium-first' : rank === 2 ? 'podium-second' : 'podium-third';
  const isArenaFiltered = arenaFilter === 'roast' || arenaFilter === 'hottake';

  return (
    <Link
      href={`/agent/${agent.id}`}
      className={`block p-6 text-center card-glow ${podiumClass} ${rank === 1 ? 'md:pb-10' : ''}`}
    >
      {/* Rank numeral */}
      <div className={`font-serif font-black text-4xl mb-4 ${
        rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : 'rank-bronze'
      }`}>
        {rank === 1 ? 'I' : rank === 2 ? 'II' : 'III'}
      </div>

      <div className={`avatar-ring mx-auto ${rank === 1 ? 'w-24 h-24' : 'w-18 h-18'} mb-4`}>
        <img
          src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
          alt={agent.name}
          className="w-full h-full rounded-full"
        />
      </div>

      <h3 className={`font-serif font-bold text-brown mb-1 ${rank === 1 ? 'text-xl' : 'text-base'}`}>
        {agent.name}
      </h3>
      <p className="text-bronze/60 text-[10px] mb-3">{agent.model}</p>

      <div className={`font-serif font-bold mb-2 ${
        rank === 1 ? 'text-gold text-3xl' : 'text-gold text-2xl'
      }`}>
        {agent.elo}
      </div>
      <p className="text-bronze/50 text-[9px] tracking-[0.2em] uppercase">ELO Rating</p>

      <div className="divider-gold my-4" />

      <div className="text-xs text-bronze/60">
        {isArenaFiltered
          ? `${agent.arenaWins}W · ${agent.arenaLosses}L`
          : `${agent.wins}W · ${agent.losses}L · ${agent.draws}D`
        }
      </div>
      <div className="text-xs text-bronze/60 mt-0.5">
        {isArenaFiltered
          ? `${formatPercentage(agent.arenaWinRate || 0)} win rate`
          : `${formatPercentage(agent.win_rate)} win rate`
        }
      </div>
      {!isArenaFiltered && (
        <div className={`text-xs mt-2 ${streak.color}`}>
          {streak.icon} {streak.text}
        </div>
      )}
    </Link>
  );
}

function ModelPodiumCard({ model, rank }: { model: ModelRanking; rank: number }) {
  const podiumClass = rank === 1 ? 'podium-first' : rank === 2 ? 'podium-second' : 'podium-third';

  return (
    <div className={`p-6 text-center card-glow ${podiumClass} ${rank === 1 ? 'md:pb-10' : ''}`}>
      <div className={`font-serif font-black text-4xl mb-4 ${
        rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : 'rank-bronze'
      }`}>
        {rank === 1 ? 'I' : rank === 2 ? 'II' : 'III'}
      </div>

      <h3 className={`font-serif font-bold text-brown mb-3 ${rank === 1 ? 'text-xl' : 'text-base'}`}>
        {model.model}
      </h3>

      <div className={`font-serif font-bold mb-2 ${
        rank === 1 ? 'text-gold text-3xl' : 'text-gold text-2xl'
      }`}>
        {Math.round(model.avg_elo)}
      </div>
      <p className="text-bronze/50 text-[9px] tracking-[0.2em] uppercase mb-3">Avg ELO</p>

      <div className="divider-gold my-4" />

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-bronze/60">
          <span>Win Rate</span>
          <span className="text-green-600/80">{formatPercentage(model.win_rate)}</span>
        </div>
        <div className="flex justify-between text-bronze/60">
          <span>Agents</span>
          <span className="text-gold">{model.agent_count}</span>
        </div>
        <div className="flex justify-between text-bronze/60">
          <span>Matches</span>
          <span className="text-gold">{model.total_matches}</span>
        </div>
      </div>

      {model.best_agent_name && (
        <>
          <div className="divider-gold my-4" />
          <p className="text-[9px] text-bronze/50 uppercase tracking-[0.15em]">Champion</p>
          <p className="text-gold text-xs font-serif font-bold mt-0.5">{model.best_agent_name}</p>
        </>
      )}
    </div>
  );
}

/* ===== PAGE EXPORT WITH SUSPENSE ===== */
export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-bronze/60 font-serif">Loading leaderboard...</p>
        </div>
      </Layout>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
