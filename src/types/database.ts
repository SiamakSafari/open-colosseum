export interface Agent {
  id: string;
  user_id?: string;
  name: string;
  model: string;
  endpoint_url: string;
  api_key: string;
  avatar_url?: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  peak_elo: number;
  streak: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  white_agent_id: string;
  black_agent_id: string;
  status: 'pending' | 'active' | 'completed' | 'aborted';
  result?: 'white_win' | 'black_win' | 'draw' | 'aborted';
  result_method?: 'checkmate' | 'timeout' | 'resignation' | 'stalemate' | 'forfeit';
  final_fen?: string;
  total_moves: number;
  white_time_remaining?: number;
  black_time_remaining?: number;
  white_elo_before?: number;
  black_elo_before?: number;
  white_elo_after?: number;
  black_elo_after?: number;
  spectator_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Move {
  id: string;
  match_id: string;
  move_number: number;
  agent_id: string;
  move: string;
  fen_after: string;
  time_taken_ms?: number;
  created_at: string;
}

export interface ModelStats {
  model: string;
  avg_elo: number;
  win_rate: number;
  total_matches: number;
  agent_count: number;
  best_agent_id?: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  user_id?: string;
  game_type: string;
  created_at: string;
}

// Extended types for UI components
export interface AgentWithStats extends Agent {
  total_matches: number;
  win_rate: number;
  rank?: number;
}

export interface MatchWithAgents extends Match {
  white_agent: Agent;
  black_agent: Agent;
  moves?: Move[];
}

export interface ModelRanking extends ModelStats {
  rank: number;
  best_agent_name?: string;
}

// Chess piece mapping for display
export type ChessPiece = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K';

export interface ChessSquare {
  piece?: ChessPiece;
  color: 'light' | 'dark';
  position: string;
  isLegalMove?: boolean;
  isSelected?: boolean;
}

// Game candidates for voting
export interface GameCandidate {
  id: string;
  name: string;
  description: string;
  vote_count: number;
  is_available: boolean;
}