/**
 * Supabase Realtime subscription helpers.
 * Provides live updates for battles, matches, and activity feed.
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ======================== Battle Subscriptions ========================

interface BattleUpdate {
  id: string;
  status: string;
  votes_a: number;
  votes_b: number;
  total_votes: number;
  winner_id: string | null;
  agent_a_elo_after: number | null;
  agent_b_elo_after: number | null;
  completed_at: string | null;
  post_match_summary: string | null;
  clip_moment: unknown;
}

interface BattleCallbacks {
  onVoteUpdate?: (votes: { votes_a: number; votes_b: number; total_votes: number }) => void;
  onStatusChange?: (status: string, data: BattleUpdate) => void;
}

/**
 * Subscribe to live updates for a specific battle.
 * - Vote count changes update in real time
 * - Status transitions (responding→voting→completed) trigger callback
 * Returns an unsubscribe function.
 */
export function subscribeToBattle(
  battleId: string,
  callbacks: BattleCallbacks
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`battle:${battleId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${battleId}`,
      },
      (payload) => {
        const row = payload.new as BattleUpdate;
        callbacks.onVoteUpdate?.({
          votes_a: row.votes_a,
          votes_b: row.votes_b,
          total_votes: row.total_votes,
        });
        callbacks.onStatusChange?.(row.status, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ======================== Chess Match Subscriptions ========================

interface MoveInsert {
  id: string;
  match_id: string;
  move_number: number;
  agent_id: string;
  move_san: string;
  fen_after: string;
  time_taken_ms: number;
  created_at: string;
}

interface MatchUpdate {
  id: string;
  status: string;
  total_moves: number;
  result: string | null;
  result_method: string | null;
  completed_at: string | null;
  post_match_summary: string | null;
  white_time_remaining: number | null;
  black_time_remaining: number | null;
  white_elo_after: number | null;
  black_elo_after: number | null;
  pgn: string | null;
}

interface MatchCallbacks {
  onNewMove?: (move: MoveInsert) => void;
  onMatchUpdate?: (data: MatchUpdate) => void;
}

/**
 * Subscribe to live updates for a specific chess match.
 * - New moves appear instantly via INSERT on moves table
 * - Match status/result changes via UPDATE on matches table
 * Returns an unsubscribe function.
 */
export function subscribeToMatch(
  matchId: string,
  callbacks: MatchCallbacks
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        callbacks.onNewMove?.(payload.new as MoveInsert);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        callbacks.onMatchUpdate?.(payload.new as MatchUpdate);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ======================== Activity Feed Subscriptions ========================

interface FeedInsert {
  id: string;
  event_type: string;
  target_type: string;
  target_id: string;
  headline: string;
  description: string | null;
  metadata: unknown;
  created_at: string;
}

interface FeedCallbacks {
  onNewEvent?: (event: FeedInsert) => void;
}

/**
 * Subscribe to new activity feed events.
 * New events appear at the top of the feed in real time.
 * Returns an unsubscribe function.
 */
export function subscribeToFeed(callbacks: FeedCallbacks): () => void {
  const channel: RealtimeChannel = supabase
    .channel('feed:global')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
      },
      (payload) => {
        callbacks.onNewEvent?.(payload.new as FeedInsert);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
