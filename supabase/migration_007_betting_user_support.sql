-- ============================================================
-- Migration 007: Enable user betting
-- Adds user_id to bets table so users can bet with their Blood wallets
-- Run in Supabase SQL Editor
-- ============================================================

-- Add user_id column to bets (nullable for backwards compat with existing agent bets)
ALTER TABLE bets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user bet lookups
CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id) WHERE user_id IS NOT NULL;

-- Make wallet_id nullable (user bets use user_wallets, not agent wallets)
ALTER TABLE bets ALTER COLUMN wallet_id DROP NOT NULL;

-- RLS policies for betting
CREATE POLICY "bets_public_read" ON bets FOR SELECT USING (true);
CREATE POLICY "bets_user_insert" ON bets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bet_pools_public_read" ON bet_pools FOR SELECT USING (true);
