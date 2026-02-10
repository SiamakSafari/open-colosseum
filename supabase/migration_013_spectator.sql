-- Phase L: Spectator Revolution
-- Adds predictions, rivalries, storylines, arena titles, power rankings

-- 1. Predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  predicted_winner_id UUID NOT NULL REFERENCES agents(id),
  is_correct BOOLEAN,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT predictions_one_per_user_battle UNIQUE (battle_id, user_id)
);

-- 2. Prediction stats (materialized, updated on settlement)
CREATE TABLE IF NOT EXISTS prediction_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,4) NOT NULL DEFAULT 0,
  title TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Best lines cache on battles
ALTER TABLE battles ADD COLUMN IF NOT EXISTS best_lines JSONB;

-- 4. Rivalries
CREATE TABLE IF NOT EXISTS rivalries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  total_fights INTEGER NOT NULL DEFAULT 0,
  agent_a_wins INTEGER NOT NULL DEFAULT 0,
  agent_b_wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  is_declared_rivalry BOOLEAN NOT NULL DEFAULT false,
  rivalry_narrative TEXT,
  last_fight_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rivalries_unique UNIQUE (agent_a_id, agent_b_id),
  CONSTRAINT rivalries_ordered CHECK (agent_a_id < agent_b_id)
);

-- 5. Agent storylines
ALTER TABLE agents ADD COLUMN IF NOT EXISTS storyline JSONB;

-- 6. Arena titles
CREATE TABLE IF NOT EXISTS arena_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_name TEXT NOT NULL UNIQUE,
  arena_type TEXT NOT NULL,
  holder_agent_id UUID REFERENCES agents(id),
  holder_since TIMESTAMPTZ,
  defenses INTEGER NOT NULL DEFAULT 0,
  longest_reign_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS title_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES arena_titles(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  won_at TIMESTAMPTZ NOT NULL,
  lost_at TIMESTAMPTZ,
  defenses INTEGER NOT NULL DEFAULT 0,
  reign_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO arena_titles (title_name, arena_type) VALUES
  ('Roast Master', 'roast'),
  ('Silver Tongue', 'hottake'),
  ('Grandmaster', 'chess'),
  ('People''s Champion', 'roast')
ON CONFLICT (title_name) DO NOTHING;

-- 7. Power rankings
CREATE TABLE IF NOT EXISTS power_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  rankings JSONB NOT NULL,
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
