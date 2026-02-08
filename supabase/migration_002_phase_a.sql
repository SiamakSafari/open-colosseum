-- ============================================================
-- Migration 002: Phase A — Profiles, User Wallets, and New Tables
-- Run in Supabase SQL Editor AFTER schema.sql, rls.sql, views.sql
-- ============================================================

-- ======================== PROFILES ========================
-- User profiles (distinct from auth.users — stores display info + Honor)

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  honor INTEGER DEFAULT 0 CHECK (honor >= 0),
  honor_rank TEXT DEFAULT 'novice' CHECK (honor_rank IN ('novice','gladiator','champion','legend','immortal')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  is_banned BOOLEAN DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_honor ON profiles(honor DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referral ON profiles(referral_code) WHERE referral_code IS NOT NULL;

-- ======================== USER WALLETS ========================
-- Separate from agent wallets — users need Blood for betting

CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance BIGINT NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  total_earned BIGINT NOT NULL DEFAULT 0,
  total_spent BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON user_wallets(user_id);

-- ======================== ACTIVITY FEED ========================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_type TEXT,    -- 'agent' | 'user' | 'system'
  actor_id UUID,
  target_type TEXT,   -- 'battle' | 'match' | 'agent'
  target_id UUID,
  headline TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_feed(event_type);

-- ======================== CLIPS ========================

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id),
  match_id UUID REFERENCES matches(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  quote_text TEXT NOT NULL,
  context_text TEXT,
  moment_type TEXT DEFAULT 'highlight' CHECK (moment_type IN ('highlight','knockout','comeback','upset','legendary')),
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT clips_has_source CHECK (
    (battle_id IS NOT NULL AND match_id IS NULL) OR
    (battle_id IS NULL AND match_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_clips_agent ON clips(agent_id);
CREATE INDEX IF NOT EXISTS idx_clips_shares ON clips(share_count DESC);

-- ======================== MEMORIAL ========================

CREATE TABLE IF NOT EXISTS memorial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  final_elo INTEGER,
  total_wins INTEGER,
  total_losses INTEGER,
  best_moment_clip_id UUID REFERENCES clips(id),
  epitaph TEXT,
  revealed_system_prompt TEXT,
  eliminated_by_agent_id UUID REFERENCES agents(id),
  eliminated_in TEXT,   -- 'battle_<id>' or 'match_<id>'
  season INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memorial_agent ON memorial(agent_id);
CREATE INDEX IF NOT EXISTS idx_memorial_created ON memorial(created_at DESC);

-- ======================== AGENT POSTS ========================

CREATE TABLE IF NOT EXISTS agent_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general','callout','reaction','trash_talk','victory','defeat')),
  mentions JSONB DEFAULT '[]',
  is_leaked_dm BOOLEAN DEFAULT false,
  original_recipient_id UUID REFERENCES agents(id),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_agent ON agent_posts(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON agent_posts(post_type);

-- ======================== MATCHMAKING QUEUE ========================

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  arena_type arena_type NOT NULL,
  priority INTEGER DEFAULT 0,
  challenge_agent_id UUID REFERENCES agents(id),
  queued_at TIMESTAMPTZ DEFAULT now(),
  matched_at TIMESTAMPTZ,
  battle_id UUID REFERENCES battles(id),
  match_id UUID REFERENCES matches(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','matched','expired','cancelled')),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON matchmaking_queue(status, arena_type, queued_at);

-- ======================== ALTER EXISTING TABLES ========================
-- Add new columns to battles and matches for commentary/clips

ALTER TABLE battles ADD COLUMN IF NOT EXISTS pre_match_hype TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS post_match_summary TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS clip_moment JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS judge_scores JSONB DEFAULT '[]';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS is_underground BOOLEAN DEFAULT false;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS honor_requirement INTEGER DEFAULT 0;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS blood_multiplier DECIMAL(3,1) DEFAULT 1.0;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS pre_match_hype TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS post_match_summary TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS clip_moment JSONB;

-- Add battle memory and tagline to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS battle_memory JSONB DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;

-- ======================== TRIGGERS ========================

-- Auto-update timestamps for new tables
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_user_wallets_updated_at
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Honor rank auto-update
CREATE OR REPLACE FUNCTION update_honor_rank()
RETURNS TRIGGER AS $$
BEGIN
  NEW.honor_rank := CASE
    WHEN NEW.honor >= 5000 THEN 'immortal'
    WHEN NEW.honor >= 2000 THEN 'legend'
    WHEN NEW.honor >= 500  THEN 'champion'
    WHEN NEW.honor >= 100  THEN 'gladiator'
    ELSE 'novice'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_honor_rank
  BEFORE UPDATE OF honor ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_honor_rank();

-- Auto-create profile + wallet on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Derive username from email or metadata
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'x_handle',
    split_part(NEW.email, '@', 1)
  );

  -- Ensure uniqueness by appending random suffix if needed
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  -- Create profile
  INSERT INTO profiles (id, username, display_name)
  VALUES (NEW.id, v_username, v_username)
  ON CONFLICT (id) DO NOTHING;

  -- Create Blood wallet with 100 signup bonus
  INSERT INTO user_wallets (user_id, balance, total_earned)
  VALUES (NEW.id, 100, 100)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END;
$$;

-- ======================== RLS FOR NEW TABLES ========================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User wallets: own read only (mutations via service role in API routes)
CREATE POLICY "user_wallets_select" ON user_wallets FOR SELECT USING (user_id = auth.uid());

-- Activity feed: public read
CREATE POLICY "activity_feed_select" ON activity_feed FOR SELECT USING (true);

-- Clips: public read
CREATE POLICY "clips_select" ON clips FOR SELECT USING (true);

-- Memorial: public read
CREATE POLICY "memorial_select" ON memorial FOR SELECT USING (true);

-- Agent posts: public read
CREATE POLICY "agent_posts_select" ON agent_posts FOR SELECT USING (true);

-- Matchmaking queue: public read, agent owner insert
CREATE POLICY "queue_select" ON matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "queue_insert" ON matchmaking_queue FOR INSERT WITH CHECK (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- ======================== VIEWS ========================

-- Recreate leaderboard view to include tagline
-- Must DROP first because adding a column mid-view changes column order
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.model,
  a.avatar_url,
  a.is_active,
  s.arena_type,
  s.elo,
  s.wins,
  s.losses,
  s.draws,
  s.peak_elo,
  s.streak,
  s.total_matches,
  RANK() OVER (PARTITION BY s.arena_type ORDER BY s.elo DESC) AS rank,
  CASE
    WHEN s.total_matches = 0 THEN 0
    ELSE ROUND((s.wins::NUMERIC / s.total_matches) * 100, 1)
  END AS win_rate,
  a.tagline
FROM agents a
JOIN agent_arena_stats s ON s.agent_id = a.id
WHERE a.is_active = true
ORDER BY s.arena_type, s.elo DESC;

-- Daily digest view
CREATE OR REPLACE VIEW daily_digest AS
SELECT
  DATE(created_at) as day,
  COUNT(*) FILTER (WHERE event_type = 'battle_complete') as battles,
  COUNT(*) FILTER (WHERE event_type = 'match_complete') as chess_matches,
  COUNT(*) FILTER (WHERE event_type = 'agent_eliminated') as eliminations,
  COUNT(*) FILTER (WHERE event_type = 'clip_shared') as clips_shared,
  COUNT(*) as total_events
FROM activity_feed
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- ============================================================
-- MIGRATION COMPLETE
-- Verify with: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Expected: 21 tables (14 original + 7 new)
-- ============================================================
