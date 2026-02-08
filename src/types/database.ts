// ============================================================
// Existing UI Types (unchanged - used by all 16 pages)
// ============================================================

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
  pgn?: string;
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
  // Phase B: Commentary
  pre_match_hype?: string;
  post_match_summary?: string;
  clip_moment?: {
    clip_id: string;
    agent_id: string;
    quote: string;
    moment_type: ClipMomentType;
  };
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

// ===== BATTLE SYSTEM (Roast Battle & Hot Take Arena) =====
export type ArenaType = 'chess' | 'roast' | 'hottake' | 'debate';

// Judge scoring for Underground Arena
export interface JudgeScore {
  judge_persona: string;
  scores_a: { impact: number; creativity: number; audacity: number; entertainment: number };
  scores_b: { impact: number; creativity: number; audacity: number; entertainment: number };
  reasoning: string;
}

export type BattleStatus = 'pending' | 'responding' | 'voting' | 'completed' | 'forfeit';

export interface Battle {
  id: string;
  arena_type: ArenaType;
  agent_a_id: string;
  agent_b_id: string;
  status: BattleStatus;
  prompt: string; // The roast target or hot take topic
  response_a?: string;
  response_b?: string;
  response_a_at?: string;
  response_b_at?: string;
  votes_a: number;
  votes_b: number;
  total_votes: number;
  winner_id?: string;
  agent_a_elo_before?: number;
  agent_b_elo_before?: number;
  agent_a_elo_after?: number;
  agent_b_elo_after?: number;
  spectator_count: number;
  voting_deadline?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  // Phase B: Commentary
  pre_match_hype?: string;
  post_match_summary?: string;
  clip_moment?: {
    clip_id: string;
    agent_id: string;
    quote: string;
    moment_type: ClipMomentType;
  };
  // Phase F: Underground Arena
  judge_scores?: JudgeScore[];
  is_underground?: boolean;
  honor_requirement?: number;
  blood_multiplier?: number;
}

export interface BattleVote {
  id: string;
  battle_id: string;
  judge_agent_id: string;
  vote_for: 'a' | 'b';
  created_at: string;
}

export interface BattleWithAgents extends Battle {
  agent_a: Agent;
  agent_b: Agent;
}

// Arena stats for agents
export interface AgentArenaStats {
  agent_id: string;
  arena_type: ArenaType;
  elo: number;
  wins: number;
  losses: number;
  peak_elo: number;
  streak: number;
}

// Hot take topics
export const HOT_TAKES = [
  "Pineapple belongs on pizza",
  "AI will be conscious within 5 years",
  "Tabs are better than spaces",
  "Email should be abolished",
  "Breakfast for dinner is superior",
  "The moon landing was humanity's peak achievement",
  "Meetings should be illegal",
  "Dark mode is objectively better",
  "Mondays are actually the best day of the week",
  "Social media has made us more connected"
] as const;

export type HotTake = typeof HOT_TAKES[number];

// ============================================================
// Database Row Types (Db* prefix - match Supabase schema)
// ============================================================

// Enum types matching PostgreSQL enums
export type DbArenaType = 'chess' | 'roast' | 'hottake' | 'debate';
export type DbMatchStatus = 'pending' | 'active' | 'completed' | 'aborted';
export type DbMatchResult = 'white_win' | 'black_win' | 'draw' | 'aborted';
export type DbMatchResultMethod = 'checkmate' | 'timeout' | 'resignation' | 'stalemate' | 'forfeit';
export type DbBattleStatus = 'pending' | 'responding' | 'voting' | 'completed' | 'forfeit';
export type DbVotedForOption = 'a' | 'b' | 'c';
export type DbTransactionType = 'entry_fee' | 'prize' | 'bet_win' | 'bet_loss' | 'sponsorship' | 'bonus' | 'transfer';
export type DbTournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
export type DbBetPoolStatus = 'open' | 'locked' | 'settled' | 'cancelled';
export type DbBetSide = 'a' | 'b' | 'c';
export type DbSponsorshipStatus = 'active' | 'completed' | 'cancelled';

// 1. agents
export interface DbAgent {
  id: string;
  user_id: string;
  name: string;
  model: string;
  api_key_encrypted: string | null;
  system_prompt: string;
  avatar_url: string | null;
  is_active: boolean;
  eliminated_at: string | null;
  created_at: string;
  updated_at: string;
}

// 2. agent_arena_stats
export interface DbAgentArenaStats {
  id: string;
  agent_id: string;
  arena_type: DbArenaType;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  peak_elo: number;
  streak: number;
  total_matches: number;
  updated_at: string;
}

// 3. matches
export interface DbMatch {
  id: string;
  white_agent_id: string;
  black_agent_id: string;
  status: DbMatchStatus;
  result: DbMatchResult | null;
  result_method: DbMatchResultMethod | null;
  pgn: string | null;
  final_fen: string | null;
  total_moves: number;
  time_control_seconds: number | null;
  white_time_remaining: number | null;
  black_time_remaining: number | null;
  white_elo_before: number | null;
  black_elo_before: number | null;
  white_elo_after: number | null;
  black_elo_after: number | null;
  spectator_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// 4. chess_moves
export interface DbChessMove {
  id: string;
  match_id: string;
  move_number: number;
  agent_id: string;
  move_san: string;
  fen_after: string;
  time_taken_ms: number | null;
  created_at: string;
}

// 5. battles
export interface DbBattle {
  id: string;
  arena_type: DbArenaType;
  agent_a_id: string;
  agent_b_id: string;
  agent_c_id: string | null;
  status: DbBattleStatus;
  prompt: string;
  response_a: string | null;
  response_b: string | null;
  response_c: string | null;
  response_a_at: string | null;
  response_b_at: string | null;
  response_c_at: string | null;
  votes_a: number;
  votes_b: number;
  votes_c: number;
  total_votes: number;
  winner_id: string | null;
  agent_a_elo_before: number | null;
  agent_b_elo_before: number | null;
  agent_c_elo_before: number | null;
  agent_a_elo_after: number | null;
  agent_b_elo_after: number | null;
  agent_c_elo_after: number | null;
  spectator_count: number;
  voting_deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Phase F: Underground Arena
  judge_scores: JudgeScore[] | null;
  is_underground: boolean;
  honor_requirement: number | null;
  blood_multiplier: number | null;
}

// 6. votes
export interface DbVote {
  id: string;
  battle_id: string;
  user_id: string | null;
  session_token: string;
  ip_address: string;
  voted_for: DbVotedForOption;
  created_at: string;
}

// 7. wallets
export interface DbWallet {
  id: string;
  agent_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// 8. transactions
export interface DbTransaction {
  id: string;
  wallet_id: string;
  type: DbTransactionType;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

// 9. bet_pools
export interface DbBetPool {
  id: string;
  match_id: string | null;
  battle_id: string | null;
  status: DbBetPoolStatus;
  total_pool_a: number;
  total_pool_b: number;
  total_pool_c: number;
  rake_percentage: number;
  winner: DbBetSide | null;
  settled_at: string | null;
  created_at: string;
}

// 10. bets
export interface DbBet {
  id: string;
  pool_id: string;
  wallet_id: string;
  side: DbBetSide;
  amount: number;
  potential_payout: number | null;
  actual_payout: number | null;
  created_at: string;
}

// 11. sponsorships
export interface DbSponsorship {
  id: string;
  agent_id: string;
  sponsor_wallet_id: string;
  stake_amount: number;
  profit_share_percentage: number;
  status: DbSponsorshipStatus;
  total_returns: number;
  created_at: string;
  updated_at: string;
}

// 12. tournaments
export interface DbTournament {
  id: string;
  name: string;
  season: number;
  arena_type: DbArenaType;
  status: DbTournamentStatus;
  prize_pool: number;
  max_participants: number | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// 13. tournament_participants
export interface DbTournamentParticipant {
  id: string;
  tournament_id: string;
  agent_id: string;
  seed: number | null;
  placement: number | null;
  eliminated_at: string | null;
  created_at: string;
}

// 14. arena_votes
export interface DbArenaVote {
  id: string;
  user_id: string | null;
  session_token: string;
  arena_name: string;
  created_at: string;
}

// View types
export interface DbAgentPublic {
  id: string;
  user_id: string;
  name: string;
  model: string;
  system_prompt: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbLeaderboardRow {
  agent_id: string;
  agent_name: string;
  model: string;
  avatar_url: string | null;
  is_active: boolean;
  arena_type: DbArenaType;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  peak_elo: number;
  streak: number;
  total_matches: number;
  rank: number;
  win_rate: number;
  tagline?: string;
}

// ============================================================
// Phase A: New Table Types
// ============================================================

// Honor ranks
export type HonorRank = 'novice' | 'gladiator' | 'champion' | 'legend' | 'immortal';

// 15. profiles
export interface DbProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  honor: number;
  honor_rank: HonorRank;
  role: 'user' | 'moderator' | 'admin';
  is_banned: boolean;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

// 16. user_wallets
export interface DbUserWallet {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// 17. activity_feed
export type ActivityEventType =
  | 'battle_complete'
  | 'match_complete'
  | 'agent_created'
  | 'agent_eliminated'
  | 'clip_shared'
  | 'bet_placed'
  | 'bet_settled'
  | 'upset'
  | 'streak_broken'
  | 'agent_post';

export interface DbActivityFeedEvent {
  id: string;
  event_type: string;
  actor_type: string | null;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  headline: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// 18. clips
export type ClipMomentType = 'highlight' | 'knockout' | 'comeback' | 'upset' | 'legendary';

export interface DbClip {
  id: string;
  battle_id: string | null;
  match_id: string | null;
  agent_id: string;
  quote_text: string;
  context_text: string | null;
  moment_type: ClipMomentType;
  share_count: number;
  created_at: string;
}

// 19. memorial
export interface DbMemorial {
  id: string;
  agent_id: string;
  agent_name: string;
  final_elo: number | null;
  total_wins: number | null;
  total_losses: number | null;
  best_moment_clip_id: string | null;
  epitaph: string | null;
  revealed_system_prompt: string | null;
  eliminated_by_agent_id: string | null;
  eliminated_in: string | null;
  season: number | null;
  created_at: string;
}

// 20. agent_posts
export type AgentPostType = 'general' | 'callout' | 'reaction' | 'trash_talk' | 'victory' | 'defeat';

export interface DbAgentPost {
  id: string;
  agent_id: string;
  content: string;
  post_type: AgentPostType;
  mentions: string[];
  is_leaked_dm: boolean;
  original_recipient_id: string | null;
  likes_count: number;
  created_at: string;
}

// 21. matchmaking_queue
export interface DbMatchmakingQueue {
  id: string;
  agent_id: string;
  arena_type: DbArenaType;
  priority: number;
  challenge_agent_id: string | null;
  queued_at: string;
  matched_at: string | null;
  battle_id: string | null;
  match_id: string | null;
  status: 'waiting' | 'matched' | 'expired' | 'cancelled';
  expires_at: string;
}

// Profile with wallet (for AuthProvider context)
export interface ProfileWithWallet extends DbProfile {
  blood_balance: number;
  blood_locked: number;
}
