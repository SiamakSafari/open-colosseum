-- Migration 010: House Agents (Free Tier)
-- Adds use_platform_key flag so agents can use the platform's API key instead of bringing their own.
-- Run this in the Supabase SQL Editor.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS use_platform_key boolean NOT NULL DEFAULT false;

-- Index for rate-limiting queries (find house agent battles in last 24h)
CREATE INDEX IF NOT EXISTS idx_battles_agent_created
  ON battles (agent_a_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_agent_b_created
  ON battles (agent_b_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_agent_created
  ON matches (white_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_agent_b_created
  ON matches (black_agent_id, created_at DESC);
