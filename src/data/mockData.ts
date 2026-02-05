import { Agent, Match, Move, ModelStats, AgentWithStats, MatchWithAgents, ModelRanking, GameCandidate } from '@/types/database';

// Mock agents with diverse models and realistic names
export const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'NeuralKnight',
    model: 'Claude 3.5 Sonnet',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_1',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1847,
    wins: 23,
    losses: 12,
    draws: 5,
    peak_elo: 1875,
    streak: 3,
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-02-01T15:30:00Z'
  },
  {
    id: '2',
    name: 'GambitAgent',
    model: 'GPT-4o',
    endpoint_url: 'https://api.openai.com/v1/chat/completions',
    api_key: 'hashed_key_2',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1923,
    wins: 31,
    losses: 8,
    draws: 7,
    peak_elo: 1945,
    streak: 5,
    is_active: true,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-02-01T14:20:00Z'
  },
  {
    id: '3',
    name: 'PawnStorm-3B',
    model: 'Llama-3.1 405B',
    endpoint_url: 'https://api.meta.llama.com/v1/chat',
    api_key: 'hashed_key_3',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1756,
    wins: 18,
    losses: 15,
    draws: 4,
    peak_elo: 1789,
    streak: -2,
    is_active: true,
    created_at: '2024-01-20T12:00:00Z',
    updated_at: '2024-02-01T16:45:00Z'
  },
  {
    id: '4',
    name: 'ChessGPT-Ultra',
    model: 'GPT-4 Turbo',
    endpoint_url: 'https://api.openai.com/v1/chat/completions',
    api_key: 'hashed_key_4',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1689,
    wins: 14,
    losses: 18,
    draws: 6,
    peak_elo: 1734,
    streak: 1,
    is_active: true,
    created_at: '2024-01-25T09:30:00Z',
    updated_at: '2024-02-01T13:15:00Z'
  },
  {
    id: '5',
    name: 'Socrates',
    model: 'Claude 3 Opus',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_5',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 2012,
    wins: 42,
    losses: 6,
    draws: 8,
    peak_elo: 2034,
    streak: 7,
    is_active: true,
    created_at: '2024-01-05T07:00:00Z',
    updated_at: '2024-02-01T17:00:00Z'
  },
  {
    id: '6',
    name: 'ClaudeChess',
    model: 'Claude 3.5 Sonnet',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_6',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1812,
    wins: 25,
    losses: 11,
    draws: 8,
    peak_elo: 1834,
    streak: 2,
    is_active: true,
    created_at: '2024-01-12T11:00:00Z',
    updated_at: '2024-02-01T12:30:00Z'
  },
  {
    id: '7',
    name: 'DeepThought-X1',
    model: 'Grok-3',
    endpoint_url: 'https://api.x.ai/v1/chat/completions',
    api_key: 'hashed_key_7',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1934,
    wins: 28,
    losses: 9,
    draws: 5,
    peak_elo: 1967,
    streak: 4,
    is_active: true,
    created_at: '2024-01-08T14:00:00Z',
    updated_at: '2024-02-01T18:20:00Z'
  },
  {
    id: '8',
    name: 'QuantumQueen',
    model: 'Gemini Ultra',
    endpoint_url: 'https://api.google.ai/v1/generate',
    api_key: 'hashed_key_8',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1678,
    wins: 16,
    losses: 17,
    draws: 7,
    peak_elo: 1721,
    streak: -1,
    is_active: true,
    created_at: '2024-01-18T16:00:00Z',
    updated_at: '2024-02-01T14:45:00Z'
  },
  {
    id: '9',
    name: 'MistralMind',
    model: 'Mistral Large 2',
    endpoint_url: 'https://api.mistral.ai/v1/chat/completions',
    api_key: 'hashed_key_9',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1723,
    wins: 19,
    losses: 14,
    draws: 3,
    peak_elo: 1756,
    streak: 1,
    is_active: true,
    created_at: '2024-01-22T13:00:00Z',
    updated_at: '2024-02-01T15:10:00Z'
  },
  {
    id: '10',
    name: 'AlphaChess-V2',
    model: 'Claude 3.5 Haiku',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_10',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1543,
    wins: 12,
    losses: 19,
    draws: 4,
    peak_elo: 1598,
    streak: -3,
    is_active: true,
    created_at: '2024-01-28T10:30:00Z',
    updated_at: '2024-02-01T11:20:00Z'
  },
  {
    id: '11',
    name: 'RookieAI',
    model: 'GPT-4o Mini',
    endpoint_url: 'https://api.openai.com/v1/chat/completions',
    api_key: 'hashed_key_11',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1456,
    wins: 8,
    losses: 22,
    draws: 2,
    peak_elo: 1512,
    streak: -4,
    is_active: true,
    created_at: '2024-01-30T09:00:00Z',
    updated_at: '2024-02-01T10:15:00Z'
  },
  {
    id: '12',
    name: 'GrandMasterGPT',
    model: 'GPT-4o',
    endpoint_url: 'https://api.openai.com/v1/chat/completions',
    api_key: 'hashed_key_12',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1867,
    wins: 26,
    losses: 10,
    draws: 6,
    peak_elo: 1889,
    streak: 3,
    is_active: true,
    created_at: '2024-01-14T15:00:00Z',
    updated_at: '2024-02-01T16:30:00Z'
  },
  {
    id: '13',
    name: 'TitanThink',
    model: 'Grok-3',
    endpoint_url: 'https://api.x.ai/v1/chat/completions',
    api_key: 'hashed_key_13',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1789,
    wins: 21,
    losses: 13,
    draws: 4,
    peak_elo: 1812,
    streak: 2,
    is_active: true,
    created_at: '2024-01-16T12:30:00Z',
    updated_at: '2024-02-01T17:45:00Z'
  },
  {
    id: '14',
    name: 'PhilosophyBot',
    model: 'Claude 3 Opus',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_14',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1998,
    wins: 38,
    losses: 7,
    draws: 9,
    peak_elo: 2018,
    streak: 6,
    is_active: true,
    created_at: '2024-01-06T08:30:00Z',
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    id: '15',
    name: 'StrategistAI',
    model: 'Llama-3.1 405B',
    endpoint_url: 'https://api.meta.llama.com/v1/chat',
    api_key: 'hashed_key_15',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1634,
    wins: 15,
    losses: 16,
    draws: 5,
    peak_elo: 1678,
    streak: 1,
    is_active: true,
    created_at: '2024-01-24T14:20:00Z',
    updated_at: '2024-02-01T13:40:00Z'
  },
  {
    id: '16',
    name: 'ChessMaster3000',
    model: 'Mistral Large 2',
    endpoint_url: 'https://api.mistral.ai/v1/chat/completions',
    api_key: 'hashed_key_16',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1712,
    wins: 17,
    losses: 15,
    draws: 6,
    peak_elo: 1743,
    streak: -1,
    is_active: true,
    created_at: '2024-01-19T11:45:00Z',
    updated_at: '2024-02-01T15:25:00Z'
  },
  {
    id: '17',
    name: 'VisionaryAI',
    model: 'Gemini Ultra',
    endpoint_url: 'https://api.google.ai/v1/generate',
    api_key: 'hashed_key_17',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1745,
    wins: 20,
    losses: 14,
    draws: 4,
    peak_elo: 1768,
    streak: 2,
    is_active: true,
    created_at: '2024-01-17T13:15:00Z',
    updated_at: '2024-02-01T14:10:00Z'
  },
  {
    id: '18',
    name: 'LogicLord',
    model: 'Claude 3.5 Sonnet',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_18',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1823,
    wins: 24,
    losses: 12,
    draws: 7,
    peak_elo: 1845,
    streak: 1,
    is_active: true,
    created_at: '2024-01-13T16:20:00Z',
    updated_at: '2024-02-01T12:45:00Z'
  },
  {
    id: '19',
    name: 'IntuitionEngine',
    model: 'GPT-4 Turbo',
    endpoint_url: 'https://api.openai.com/v1/chat/completions',
    api_key: 'hashed_key_19',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1567,
    wins: 13,
    losses: 18,
    draws: 3,
    peak_elo: 1612,
    streak: -2,
    is_active: true,
    created_at: '2024-01-26T10:10:00Z',
    updated_at: '2024-02-01T11:35:00Z'
  },
  {
    id: '20',
    name: 'ThinkingMachine',
    model: 'Claude 3 Opus',
    endpoint_url: 'https://api.anthropic.com/v1/messages',
    api_key: 'hashed_key_20',
    avatar_url: '/images/openclaw-gladiator.jpg',
    elo: 1943,
    wins: 33,
    losses: 9,
    draws: 6,
    peak_elo: 1976,
    streak: 4,
    is_active: true,
    created_at: '2024-01-07T09:45:00Z',
    updated_at: '2024-02-01T17:15:00Z'
  }
];

// Mock matches
export const mockMatches: Match[] = [
  {
    id: 'match_1',
    white_agent_id: '5', // Socrates
    black_agent_id: '14', // PhilosophyBot
    status: 'active',
    total_moves: 24,
    white_time_remaining: 540000, // 9 minutes
    black_time_remaining: 480000, // 8 minutes
    white_elo_before: 2012,
    black_elo_before: 1998,
    spectator_count: 47,
    started_at: '2024-02-05T01:00:00Z',
    created_at: '2024-02-05T00:58:00Z'
  },
  {
    id: 'match_2',
    white_agent_id: '7', // DeepThought-X1
    black_agent_id: '2', // GambitAgent
    status: 'completed',
    result: 'white_win',
    result_method: 'checkmate',
    final_fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
    total_moves: 38,
    white_time_remaining: 320000,
    black_time_remaining: 0,
    white_elo_before: 1934,
    black_elo_before: 1923,
    white_elo_after: 1946,
    black_elo_after: 1911,
    spectator_count: 23,
    started_at: '2024-02-04T22:30:00Z',
    completed_at: '2024-02-04T23:45:00Z',
    created_at: '2024-02-04T22:28:00Z'
  },
  {
    id: 'match_3',
    white_agent_id: '1', // NeuralKnight
    black_agent_id: '6', // ClaudeChess
    status: 'completed',
    result: 'draw',
    result_method: 'stalemate',
    final_fen: '8/8/8/8/8/8/8/k1K5 w - - 0 73',
    total_moves: 146,
    white_time_remaining: 45000,
    black_time_remaining: 12000,
    white_elo_before: 1847,
    black_elo_before: 1812,
    white_elo_after: 1849,
    black_elo_after: 1810,
    spectator_count: 15,
    started_at: '2024-02-04T20:00:00Z',
    completed_at: '2024-02-04T21:30:00Z',
    created_at: '2024-02-04T19:58:00Z'
  }
];

// Calculate model stats from agents
export const mockModelStats: ModelStats[] = [
  {
    model: 'Claude 3 Opus',
    avg_elo: 2001,
    win_rate: 0.823,
    total_matches: 145,
    agent_count: 3,
    best_agent_id: '5', // Socrates
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'Grok-3',
    avg_elo: 1862,
    win_rate: 0.756,
    total_matches: 98,
    agent_count: 2,
    best_agent_id: '7', // DeepThought-X1
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'GPT-4o',
    avg_elo: 1895,
    win_rate: 0.734,
    total_matches: 112,
    agent_count: 2,
    best_agent_id: '2', // GambitAgent
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'Claude 3.5 Sonnet',
    avg_elo: 1827,
    win_rate: 0.687,
    total_matches: 156,
    agent_count: 3,
    best_agent_id: '1', // NeuralKnight
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'Llama-3.1 405B',
    avg_elo: 1695,
    win_rate: 0.623,
    total_matches: 89,
    agent_count: 2,
    best_agent_id: '3', // PawnStorm-3B
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'Mistral Large 2',
    avg_elo: 1718,
    win_rate: 0.642,
    total_matches: 76,
    agent_count: 2,
    best_agent_id: '9', // MistralMind
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'Gemini Ultra',
    avg_elo: 1712,
    win_rate: 0.589,
    total_matches: 67,
    agent_count: 2,
    best_agent_id: '17', // VisionaryAI
    updated_at: '2024-02-01T18:00:00Z'
  },
  {
    model: 'GPT-4 Turbo',
    avg_elo: 1628,
    win_rate: 0.567,
    total_matches: 72,
    agent_count: 2,
    best_agent_id: '4', // ChessGPT-Ultra
    updated_at: '2024-02-01T18:00:00Z'
  }
];

// Mock game candidates for voting
export const mockGameCandidates: GameCandidate[] = [
  {
    id: 'go',
    name: 'Go Arena',
    description: 'Ancient strategy game with infinite complexity. Watch AI agents master the game of Go.',
    vote_count: 1247,
    is_available: false
  },
  {
    id: 'poker',
    name: 'Texas Hold\'em Poker',
    description: 'Bluffing, psychology, and probability. See which AI can read opponents and maximize winnings.',
    vote_count: 2156,
    is_available: false
  },
  {
    id: 'starcraft',
    name: 'StarCraft II RTS',
    description: 'Real-time strategy combat. Multi-tasking, resource management, and tactical warfare.',
    vote_count: 3421,
    is_available: false
  }
];

// Helper functions to get processed data
export function getAgentsWithStats(): AgentWithStats[] {
  return mockAgents.map(agent => ({
    ...agent,
    total_matches: agent.wins + agent.losses + agent.draws,
    win_rate: agent.wins / (agent.wins + agent.losses + agent.draws)
  })).sort((a, b) => b.elo - a.elo).map((agent, index) => ({
    ...agent,
    rank: index + 1
  }));
}

export function getMatchesWithAgents(): MatchWithAgents[] {
  return mockMatches.map(match => ({
    ...match,
    white_agent: mockAgents.find(a => a.id === match.white_agent_id)!,
    black_agent: mockAgents.find(a => a.id === match.black_agent_id)!
  }));
}

export function getModelRankings(): ModelRanking[] {
  return mockModelStats.sort((a, b) => b.avg_elo - a.avg_elo).map((model, index) => ({
    ...model,
    rank: index + 1,
    best_agent_name: mockAgents.find(a => a.id === model.best_agent_id)?.name
  }));
}

// Platform stats
export const platformStats = {
  totalAgents: mockAgents.length,
  totalModels: mockModelStats.length,
  totalMatches: mockMatches.length + 247, // Adding some historical matches
  activeMatches: mockMatches.filter(m => m.status === 'active').length
};