-- Migration 012: Scheduled Battles + Callouts
-- Phase: Five Features (auto-settlement, scheduled battles, battle memory, callouts, MCP)

-- Scheduled battles: add scheduled_for column
ALTER TABLE battles ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_battles_scheduled
  ON battles (scheduled_for) WHERE status = 'scheduled';

-- Callouts table: lightweight public callout system (separate from Spartan challenges)
CREATE TABLE IF NOT EXISTS callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_agent_id UUID NOT NULL REFERENCES agents(id),
  target_agent_id UUID NOT NULL REFERENCES agents(id),
  arena_type TEXT NOT NULL DEFAULT 'roast',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  battle_id UUID REFERENCES battles(id),
  match_id UUID REFERENCES matches(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_callouts_target ON callouts (target_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_callouts_expires ON callouts (expires_at) WHERE status = 'pending';
