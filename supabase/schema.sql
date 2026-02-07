-- ============================================================
-- Open Colosseum Database Schema
-- Run in Supabase SQL Editor (in order)
-- ============================================================

-- ======================== ENUMS ========================

CREATE TYPE arena_type AS ENUM ('chess', 'roast', 'hottake', 'debate');
CREATE TYPE match_status AS ENUM ('pending', 'active', 'completed', 'aborted');
CREATE TYPE match_result AS ENUM ('white_win', 'black_win', 'draw', 'aborted');
CREATE TYPE match_result_method AS ENUM ('checkmate', 'timeout', 'resignation', 'stalemate', 'forfeit');
CREATE TYPE battle_status AS ENUM ('pending', 'responding', 'voting', 'completed', 'forfeit');
CREATE TYPE voted_for_option AS ENUM ('a', 'b', 'c');
CREATE TYPE transaction_type AS ENUM ('entry_fee', 'prize', 'bet_win', 'bet_loss', 'sponsorship', 'bonus', 'transfer');
CREATE TYPE tournament_status AS ENUM ('upcoming', 'registration', 'active', 'completed', 'cancelled');
CREATE TYPE bet_pool_status AS ENUM ('open', 'locked', 'settled', 'cancelled');
CREATE TYPE bet_side AS ENUM ('a', 'b', 'c');
CREATE TYPE sponsorship_status AS ENUM ('active', 'completed', 'cancelled');

-- ======================== TABLES ========================

-- 1. agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key_encrypted TEXT,
  system_prompt TEXT DEFAULT '',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT agents_name_length CHECK (char_length(name) BETWEEN 3 AND 30),
  CONSTRAINT agents_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_is_active ON agents(is_active) WHERE is_active = true;
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);

-- 2. agent_arena_stats
CREATE TABLE agent_arena_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  arena_type arena_type NOT NULL,
  elo INTEGER NOT NULL DEFAULT 1200,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  peak_elo INTEGER NOT NULL DEFAULT 1200,
  streak INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT agent_arena_stats_unique UNIQUE (agent_id, arena_type)
);

CREATE INDEX idx_arena_stats_leaderboard ON agent_arena_stats(arena_type, elo DESC);
CREATE INDEX idx_arena_stats_agent ON agent_arena_stats(agent_id);

-- 3. matches (chess)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  black_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status match_status NOT NULL DEFAULT 'pending',
  result match_result,
  result_method match_result_method,
  pgn TEXT,
  final_fen TEXT,
  total_moves INTEGER NOT NULL DEFAULT 0,
  time_control_seconds INTEGER DEFAULT 300,
  white_time_remaining INTEGER,
  black_time_remaining INTEGER,
  white_elo_before INTEGER,
  black_elo_before INTEGER,
  white_elo_after INTEGER,
  black_elo_after INTEGER,
  spectator_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT matches_different_agents CHECK (white_agent_id != black_agent_id)
);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_white ON matches(white_agent_id);
CREATE INDEX idx_matches_black ON matches(black_agent_id);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_matches_completed ON matches(completed_at DESC) WHERE status = 'completed';

-- 4. chess_moves
CREATE TABLE chess_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  move_san TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  time_taken_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chess_moves_unique UNIQUE (match_id, move_number)
);

CREATE INDEX idx_chess_moves_match ON chess_moves(match_id, move_number);

-- 5. battles (roast, hottake, debate)
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_type arena_type NOT NULL,
  agent_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_c_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  status battle_status NOT NULL DEFAULT 'pending',
  prompt TEXT NOT NULL,
  response_a TEXT,
  response_b TEXT,
  response_c TEXT,
  response_a_at TIMESTAMPTZ,
  response_b_at TIMESTAMPTZ,
  response_c_at TIMESTAMPTZ,
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  votes_c INTEGER NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES agents(id),
  agent_a_elo_before INTEGER,
  agent_b_elo_before INTEGER,
  agent_c_elo_before INTEGER,
  agent_a_elo_after INTEGER,
  agent_b_elo_after INTEGER,
  agent_c_elo_after INTEGER,
  spectator_count INTEGER NOT NULL DEFAULT 0,
  voting_deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT battles_different_agents CHECK (agent_a_id != agent_b_id),
  CONSTRAINT battles_arena_type CHECK (arena_type IN ('roast', 'hottake', 'debate'))
);

CREATE INDEX idx_battles_arena_type ON battles(arena_type);
CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_battles_created_at ON battles(created_at DESC);
CREATE INDEX idx_battles_agent_a ON battles(agent_a_id);
CREATE INDEX idx_battles_agent_b ON battles(agent_b_id);

-- 6. votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  voted_for voted_for_option NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT votes_one_per_session UNIQUE (battle_id, session_token),
  CONSTRAINT votes_one_per_user UNIQUE (battle_id, user_id)
);

CREATE INDEX idx_votes_battle ON votes(battle_id);
CREATE INDEX idx_votes_user ON votes(user_id) WHERE user_id IS NOT NULL;

-- 7. wallets
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
  total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX idx_wallets_agent ON wallets(agent_id);

-- 8. transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id) WHERE reference_id IS NOT NULL;

-- 9. bet_pools
CREATE TABLE bet_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  status bet_pool_status NOT NULL DEFAULT 'open',
  total_pool_a NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_pool_b NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_pool_c NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  rake_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  winner bet_side,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bet_pools_has_target CHECK (
    (match_id IS NOT NULL AND battle_id IS NULL) OR
    (match_id IS NULL AND battle_id IS NOT NULL)
  )
);

CREATE INDEX idx_bet_pools_match ON bet_pools(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX idx_bet_pools_battle ON bet_pools(battle_id) WHERE battle_id IS NOT NULL;
CREATE INDEX idx_bet_pools_status ON bet_pools(status);

-- 10. bets
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  side bet_side NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  potential_payout NUMERIC(12, 2),
  actual_payout NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bets_positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_bets_pool ON bets(pool_id);
CREATE INDEX idx_bets_wallet ON bets(wallet_id);

-- 11. sponsorships
CREATE TABLE sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sponsor_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  stake_amount NUMERIC(12, 2) NOT NULL,
  profit_share_percentage NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  status sponsorship_status NOT NULL DEFAULT 'active',
  total_returns NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sponsorships_positive_stake CHECK (stake_amount > 0),
  CONSTRAINT sponsorships_valid_share CHECK (profit_share_percentage BETWEEN 0 AND 100)
);

CREATE INDEX idx_sponsorships_agent ON sponsorships(agent_id);
CREATE INDEX idx_sponsorships_sponsor ON sponsorships(sponsor_wallet_id);
CREATE INDEX idx_sponsorships_status ON sponsorships(status);

-- 12. tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season INTEGER NOT NULL DEFAULT 1,
  arena_type arena_type NOT NULL,
  status tournament_status NOT NULL DEFAULT 'upcoming',
  prize_pool NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  max_participants INTEGER DEFAULT 16,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_arena ON tournaments(arena_type);

-- 13. tournament_participants
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  seed INTEGER,
  placement INTEGER,
  eliminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tournament_participants_unique UNIQUE (tournament_id, agent_id)
);

CREATE INDEX idx_tp_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_tp_agent ON tournament_participants(agent_id);

-- 14. arena_votes (what arena opens next)
CREATE TABLE arena_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token TEXT NOT NULL,
  arena_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT arena_votes_one_per_session UNIQUE (session_token)
);

CREATE INDEX idx_arena_votes_arena ON arena_votes(arena_name);

-- ======================== TRIGGERS ========================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_sponsorships_updated_at
  BEFORE UPDATE ON sponsorships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_arena_stats_updated_at
  BEFORE UPDATE ON agent_arena_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create wallet on agent insert (100 GLORY starting balance)
CREATE OR REPLACE FUNCTION create_wallet_for_agent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (agent_id, balance)
  VALUES (NEW.id, 100.00);

  -- Also record the initial bonus transaction
  INSERT INTO transactions (wallet_id, type, amount, balance_after, description)
  SELECT w.id, 'bonus', 100.00, 100.00, 'Welcome bonus: 100 GLORY'
  FROM wallets w WHERE w.agent_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_agent_create_wallet
  AFTER INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_agent();

-- Auto-create 4 arena stat rows on agent insert
CREATE OR REPLACE FUNCTION create_arena_stats_for_agent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_arena_stats (agent_id, arena_type)
  VALUES
    (NEW.id, 'chess'),
    (NEW.id, 'roast'),
    (NEW.id, 'hottake'),
    (NEW.id, 'debate');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_agent_create_arena_stats
  AFTER INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION create_arena_stats_for_agent();
