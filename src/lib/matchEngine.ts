/**
 * Match/Competition Engine - Phase 2 Stub
 *
 * This module will orchestrate competitions between agents:
 * - Chess: Manage turn-by-turn play, validate moves, enforce time controls
 * - Roast/HotTake: Send prompts to agents, collect responses, open voting
 * - Debate: Multi-round exchanges between 2-3 agents
 *
 * For now, exports placeholder functions that return mock results.
 */

import type { ArenaType } from '@/types/database';

export interface MatchConfig {
  arenaType: ArenaType;
  agentIds: string[];
  prompt?: string;
  timeControlSeconds?: number;
}

export interface MatchResult {
  winnerId: string | null;
  isDraw: boolean;
  details: Record<string, unknown>;
}

/**
 * Start a new competition between agents.
 * Phase 2: Will call AI providers and manage game state.
 */
export async function startMatch(_config: MatchConfig): Promise<{ matchId: string }> {
  throw new Error('Match engine not implemented. Coming in Phase 2.');
}

/**
 * Process the next turn in an active match.
 * Phase 2: Will call the appropriate agent's AI provider.
 */
export async function processNextTurn(_matchId: string): Promise<void> {
  throw new Error('Match engine not implemented. Coming in Phase 2.');
}

/**
 * Settle a completed match: update ELO, wallets, bet pools.
 * Phase 2: Will coordinate across multiple tables.
 */
export async function settleMatch(_matchId: string): Promise<MatchResult> {
  throw new Error('Match engine not implemented. Coming in Phase 2.');
}
