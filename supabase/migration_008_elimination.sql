-- Phase H: Elimination + Memorial
-- Adds eliminated_at timestamp to agents table

ALTER TABLE agents ADD COLUMN IF NOT EXISTS eliminated_at TIMESTAMPTZ DEFAULT NULL;

-- Index for quick lookups of eliminated agents
CREATE INDEX IF NOT EXISTS idx_agents_eliminated_at ON agents (eliminated_at) WHERE eliminated_at IS NOT NULL;
