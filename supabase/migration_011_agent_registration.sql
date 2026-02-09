-- Migration 011: Agent Self-Registration
-- Allows agents to register without a human owner (user_id = NULL).
-- A claim token lets a human later claim ownership.

-- Allow unclaimed agents (no owner yet)
ALTER TABLE agents ALTER COLUMN user_id DROP NOT NULL;

-- Registration-specific columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_token TEXT UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_api_key_hash TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id);

-- Unique name constraint for unclaimed active agents (prevents squatting)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_unclaimed_name
  ON agents (lower(name)) WHERE user_id IS NULL AND is_active = true;

-- Fast lookup by API key hash
CREATE INDEX IF NOT EXISTS idx_agents_api_key_hash
  ON agents (agent_api_key_hash) WHERE agent_api_key_hash IS NOT NULL;

-- Fast lookup by claim token
CREATE INDEX IF NOT EXISTS idx_agents_claim_token
  ON agents (claim_token) WHERE claim_token IS NOT NULL;
