-- ============================================================
-- Open Colosseum Row Level Security Policies
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_arena_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_votes ENABLE ROW LEVEL SECURITY;

-- ======================== agents ========================
-- Public read
CREATE POLICY "agents_select" ON agents
  FOR SELECT USING (true);

-- Owner insert
CREATE POLICY "agents_insert" ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owner update
CREATE POLICY "agents_update" ON agents
  FOR UPDATE USING (auth.uid() = user_id);

-- Owner delete (soft delete via is_active = false)
CREATE POLICY "agents_delete" ON agents
  FOR DELETE USING (auth.uid() = user_id);

-- ======================== agent_arena_stats ========================
-- Public read
CREATE POLICY "arena_stats_select" ON agent_arena_stats
  FOR SELECT USING (true);

-- Service role only for mutations (no INSERT/UPDATE/DELETE policies for anon/authenticated)

-- ======================== matches ========================
-- Public read
CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (true);

-- ======================== chess_moves ========================
-- Public read
CREATE POLICY "chess_moves_select" ON chess_moves
  FOR SELECT USING (true);

-- ======================== battles ========================
-- Public read
CREATE POLICY "battles_select" ON battles
  FOR SELECT USING (true);

-- ======================== votes ========================
-- Public read
CREATE POLICY "votes_select" ON votes
  FOR SELECT USING (true);

-- Anyone can insert (uniqueness enforced by constraints)
CREATE POLICY "votes_insert" ON votes
  FOR INSERT WITH CHECK (true);

-- ======================== wallets ========================
-- Owner read only (via agent ownership)
CREATE POLICY "wallets_select" ON wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = wallets.agent_id
        AND agents.user_id = auth.uid()
    )
  );

-- ======================== transactions ========================
-- Owner read (via wallet -> agent -> user chain)
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wallets
      JOIN agents ON agents.id = wallets.agent_id
      WHERE wallets.id = transactions.wallet_id
        AND agents.user_id = auth.uid()
    )
  );

-- ======================== bet_pools ========================
-- Public read
CREATE POLICY "bet_pools_select" ON bet_pools
  FOR SELECT USING (true);

-- ======================== bets ========================
-- Participant read only (via wallet ownership)
CREATE POLICY "bets_select" ON bets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wallets
      JOIN agents ON agents.id = wallets.agent_id
      WHERE wallets.id = bets.wallet_id
        AND agents.user_id = auth.uid()
    )
  );

-- Authenticated insert (via own wallet)
CREATE POLICY "bets_insert" ON bets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wallets
      JOIN agents ON agents.id = wallets.agent_id
      WHERE wallets.id = bets.wallet_id
        AND agents.user_id = auth.uid()
    )
  );

-- ======================== sponsorships ========================
-- Participant read (sponsor or agent owner)
CREATE POLICY "sponsorships_select" ON sponsorships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = sponsorships.agent_id
        AND agents.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM wallets
      JOIN agents ON agents.id = wallets.agent_id
      WHERE wallets.id = sponsorships.sponsor_wallet_id
        AND agents.user_id = auth.uid()
    )
  );

-- Authenticated insert (via own wallet as sponsor)
CREATE POLICY "sponsorships_insert" ON sponsorships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wallets
      JOIN agents ON agents.id = wallets.agent_id
      WHERE wallets.id = sponsorships.sponsor_wallet_id
        AND agents.user_id = auth.uid()
    )
  );

-- ======================== tournaments ========================
-- Public read
CREATE POLICY "tournaments_select" ON tournaments
  FOR SELECT USING (true);

-- ======================== tournament_participants ========================
-- Public read
CREATE POLICY "tournament_participants_select" ON tournament_participants
  FOR SELECT USING (true);

-- ======================== arena_votes ========================
-- Public read
CREATE POLICY "arena_votes_select" ON arena_votes
  FOR SELECT USING (true);

-- Anyone can insert (uniqueness enforced by session_token constraint)
CREATE POLICY "arena_votes_insert" ON arena_votes
  FOR INSERT WITH CHECK (true);
