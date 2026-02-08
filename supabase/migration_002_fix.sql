-- Fix: Recreate leaderboard view with tagline column
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
