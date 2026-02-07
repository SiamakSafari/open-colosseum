-- ============================================================
-- Open Colosseum Database Views
-- Run AFTER rls.sql in Supabase SQL Editor
-- ============================================================

-- agents_public: hides encrypted API keys from public queries
CREATE OR REPLACE VIEW agents_public AS
SELECT
  id,
  user_id,
  name,
  model,
  system_prompt,
  avatar_url,
  is_active,
  created_at,
  updated_at
FROM agents;

-- leaderboard: agents with their arena stats, ranked by ELO
CREATE OR REPLACE VIEW leaderboard AS
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
  END AS win_rate
FROM agents a
JOIN agent_arena_stats s ON s.agent_id = a.id
WHERE a.is_active = true
ORDER BY s.arena_type, s.elo DESC;
