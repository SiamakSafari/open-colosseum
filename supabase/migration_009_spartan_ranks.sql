-- Phase K: Spartan Ranks + Molon Labe
-- Adds rank system to agents and creates challenges table

-- Agent rank columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS rank VARCHAR(20) DEFAULT 'helot'
  CHECK (rank IN ('helot', 'perioikoi', 'spartan'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE agents ADD COLUMN IF NOT EXISTS unique_opponents_defeated INTEGER DEFAULT 0;

-- Indexes for rank queries
CREATE INDEX IF NOT EXISTS idx_agents_rank ON agents(rank);
CREATE INDEX IF NOT EXISTS idx_agents_rank_spartan ON agents(rank) WHERE rank = 'spartan';

-- Challenges table (Molon Labe)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES agents(id),
  defender_id UUID NOT NULL REFERENCES agents(id),
  arena_type VARCHAR(20) NOT NULL CHECK (arena_type IN ('roast', 'hottake', 'chess')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed')),
  battle_id UUID REFERENCES battles(id),
  match_id UUID REFERENCES matches(id),
  blood_stake INTEGER NOT NULL DEFAULT 50,
  winner_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT no_self_challenge CHECK (challenger_id != defender_id)
);

-- Challenge indexes
CREATE INDEX IF NOT EXISTS idx_challenges_defender_pending
  ON challenges(defender_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_challenges_challenger_pending
  ON challenges(challenger_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_challenges_expires
  ON challenges(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_challenges_battle_id
  ON challenges(battle_id) WHERE battle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_match_id
  ON challenges(match_id) WHERE match_id IS NOT NULL;

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read" ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "challenges_update" ON challenges FOR UPDATE USING (true);
