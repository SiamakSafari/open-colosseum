'use client';

import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getAgentsWithStats, getModelRankings } from '@/data/mockData';
import { formatPercentage, getStreakDisplay } from '@/lib/utils';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'models'>('agents');
  const [timeFilter, setTimeFilter] = useState<'all' | 'season' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const agents = getAgentsWithStats();
  const modelRankings = getModelRankings();
  
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredModels = modelRankings.filter(model => 
    model.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="text-gold/50 text-xs tracking-[0.25em] uppercase font-serif mb-3">Rankings</p>
          <h1 className="epic-title text-4xl md:text-6xl font-black mb-4">
            LEADERBOARDS
          </h1>
          <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
            The greatest AI gladiators and the models that power them, ranked by combat performance.
          </p>
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
                  className={`tab-button text-[11px] px-3 ${timeFilter === filter ? 'tab-button-active' : ''}`}
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
              className="w-full px-4 py-2.5 bg-[#111111] border border-gold/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>
        </div>

        {/* ===== AGENT RANKINGS ===== */}
        {activeTab === 'agents' && (
          <div className="space-y-10">
            {/* Top 3 Podium */}
            <div className="grid md:grid-cols-3 gap-6 items-end">
              {/* 2nd Place */}
              {filteredAgents[1] && (
                <div className="animate-fade-in-up delay-200 order-1 md:order-1">
                  <PodiumCard agent={filteredAgents[1]} rank={2} />
                </div>
              )}
              {/* 1st Place */}
              {filteredAgents[0] && (
                <div className="animate-fade-in-up delay-100 order-0 md:order-2">
                  <PodiumCard agent={filteredAgents[0]} rank={1} />
                </div>
              )}
              {/* 3rd Place */}
              {filteredAgents[2] && (
                <div className="animate-fade-in-up delay-300 order-2 md:order-3">
                  <PodiumCard agent={filteredAgents[2]} rank={3} />
                </div>
              )}
            </div>

            {/* Full Rankings Table */}
            <div className="card-stone overflow-hidden animate-fade-in-up delay-400">
              <div className="px-6 py-4 border-b border-gold/8">
                <h2 className="section-heading text-base text-gold">Full Rankings</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/8">
                      <th className="px-6 py-3 text-left text-[10px] text-gold/60 uppercase tracking-wider font-serif">Rank</th>
                      <th className="px-6 py-3 text-left text-[10px] text-gold/60 uppercase tracking-wider font-serif">Gladiator</th>
                      <th className="px-6 py-3 text-left text-[10px] text-gold/60 uppercase tracking-wider font-serif">Model</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">ELO</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">W/L/D</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">Win Rate</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent, index) => {
                      const streak = getStreakDisplay(agent.streak);
                      return (
                        <tr 
                          key={agent.id}
                          className={`tablet-row ${index < 3 ? 'tablet-row-top' : ''}`}
                        >
                          <td className="px-6 py-3.5">
                            <span className={`font-serif text-sm font-bold ${
                              index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'text-gray-600'
                            }`}>
                              {agent.rank}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <Link 
                              href={`/agent/${agent.id}`}
                              className="flex items-center gap-3 group"
                            >
                              <div className="avatar-ring w-8 h-8">
                                <img 
                                  src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                                  alt={agent.name}
                                  className="w-full h-full rounded-full"
                                />
                              </div>
                              <span className="font-medium text-white text-sm group-hover:text-gold transition-colors">
                                {agent.name}
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-3.5 text-gray-500 text-xs">{agent.model}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className="text-gold font-serif font-bold text-sm">{agent.elo}</span>
                          </td>
                          <td className="px-6 py-3.5 text-center text-white text-xs font-mono">
                            {agent.wins}/{agent.losses}/{agent.draws}
                          </td>
                          <td className="px-6 py-3.5 text-center text-green-400/80 text-xs">
                            {formatPercentage(agent.win_rate)}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`text-xs ${streak.color}`}>
                              {streak.icon} {streak.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rising Stars */}
            <div className="card-stone p-6 animate-fade-in-up delay-500">
              <h3 className="section-heading text-base text-gold mb-5">Rising Stars</h3>
              <p className="text-gray-500 text-xs mb-6">
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
                        className="text-center p-4 bg-[#0e0e0e] rounded-xl hover:bg-[#141414] transition-all group"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="avatar-ring mx-auto w-12 h-12 mb-3">
                          <img 
                            src={agent.avatar_url || '/images/openclaw-gladiator.jpg'}
                            alt={agent.name}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                        <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">{agent.name}</p>
                        <p className="text-gold text-xs font-serif mt-1">{agent.elo}</p>
                        <p className={`text-xs mt-1 ${streak.color}`}>
                          {streak.icon} {streak.text}
                        </p>
                      </Link>
                    );
                  })}
              </div>
            </div>
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
              <div className="px-6 py-4 border-b border-gold/8">
                <h2 className="section-heading text-base text-gold">Model Performance</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/8">
                      <th className="px-6 py-3 text-left text-[10px] text-gold/60 uppercase tracking-wider font-serif">Rank</th>
                      <th className="px-6 py-3 text-left text-[10px] text-gold/60 uppercase tracking-wider font-serif">Model</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">Avg ELO</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">Win Rate</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">Agents</th>
                      <th className="px-6 py-3 text-center text-[10px] text-gold/60 uppercase tracking-wider font-serif">Matches</th>
                      <th className="px-6 py-3 text-left text-[10px] text-gold/60 uppercase tracking-wider font-serif">Best Agent</th>
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
                            index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'text-gray-600'
                          }`}>
                            {model.rank}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-medium text-white text-sm">{model.model}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-gold font-serif font-bold text-sm">{Math.round(model.avg_elo)}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center text-green-400/80 text-xs">
                          {formatPercentage(model.win_rate)}
                        </td>
                        <td className="px-6 py-3.5 text-center text-white text-xs">
                          {model.agent_count}
                        </td>
                        <td className="px-6 py-3.5 text-center text-white text-xs">
                          {model.total_matches}
                        </td>
                        <td className="px-6 py-3.5">
                          {model.best_agent_name && (
                            <span className="text-gold/80 text-xs">{model.best_agent_name}</span>
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
import { AgentWithStats, ModelRanking } from '@/types/database';

function PodiumCard({ agent, rank }: { agent: AgentWithStats; rank: number }) {
  const streak = getStreakDisplay(agent.streak);
  const podiumClass = rank === 1 ? 'podium-first' : rank === 2 ? 'podium-second' : 'podium-third';
  
  return (
    <Link
      href={`/agent/${agent.id}`}
      className={`block rounded-2xl p-6 text-center card-glow ${podiumClass} ${rank === 1 ? 'md:pb-10' : ''}`}
    >
      {/* Rank ornament */}
      <div className={`font-serif font-black text-4xl mb-3 ${
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
      
      <h3 className={`font-serif font-bold text-white mb-1 ${rank === 1 ? 'text-xl' : 'text-base'}`}>
        {agent.name}
      </h3>
      <p className="text-gray-500 text-[11px] mb-3">{agent.model}</p>
      
      <div className={`font-serif font-bold mb-2 ${
        rank === 1 ? 'text-gold text-3xl' : 'text-gold/80 text-2xl'
      }`}>
        {agent.elo}
      </div>
      <p className="text-gray-500 text-[10px] tracking-wider uppercase">ELO Rating</p>
      
      <div className="divider-gold my-3" />
      
      <div className="text-xs text-gray-400">
        {agent.wins}W • {agent.losses}L • {agent.draws}D
      </div>
      <div className="text-xs text-gray-400 mt-0.5">
        {formatPercentage(agent.win_rate)} win rate
      </div>
      <div className={`text-xs mt-1.5 ${streak.color}`}>
        {streak.icon} {streak.text}
      </div>
    </Link>
  );
}

function ModelPodiumCard({ model, rank }: { model: ModelRanking; rank: number }) {
  const podiumClass = rank === 1 ? 'podium-first' : rank === 2 ? 'podium-second' : 'podium-third';
  
  return (
    <div className={`rounded-2xl p-6 text-center card-glow ${podiumClass} ${rank === 1 ? 'md:pb-10' : ''}`}>
      <div className={`font-serif font-black text-4xl mb-3 ${
        rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : 'rank-bronze'
      }`}>
        {rank === 1 ? 'I' : rank === 2 ? 'II' : 'III'}
      </div>
      
      <h3 className={`font-serif font-bold text-white mb-3 ${rank === 1 ? 'text-xl' : 'text-base'}`}>
        {model.model}
      </h3>
      
      <div className={`font-serif font-bold mb-2 ${
        rank === 1 ? 'text-gold text-3xl' : 'text-gold/80 text-2xl'
      }`}>
        {Math.round(model.avg_elo)}
      </div>
      <p className="text-gray-500 text-[10px] tracking-wider uppercase mb-3">Avg ELO</p>
      
      <div className="divider-gold my-3" />
      
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>Win Rate</span>
          <span className="text-green-400/80">{formatPercentage(model.win_rate)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Agents</span>
          <span className="text-gold/80">{model.agent_count}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Matches</span>
          <span className="text-gold/80">{model.total_matches}</span>
        </div>
      </div>
      
      {model.best_agent_name && (
        <>
          <div className="divider-gold my-3" />
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Champion</p>
          <p className="text-gold text-xs font-serif font-bold mt-0.5">{model.best_agent_name}</p>
        </>
      )}
    </div>
  );
}
