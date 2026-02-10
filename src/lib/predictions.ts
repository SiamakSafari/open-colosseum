/**
 * Prediction System
 *
 * Spectators predict battle/match outcomes for bragging rights.
 * - Users pick who they think will win before settlement
 * - Predictions are settled when the battle/match completes
 * - Stats tracked: accuracy, streaks, titles
 * - Leaderboard ranks top predictors
 */

import { getSupabaseAdmin } from '@/lib/supabase';

// ======================== Title Thresholds ========================

const TITLE_ORACLE_EYE_ACCURACY = 0.8;
const TITLE_FORTUNE_TELLER_ACCURACY = 0.65;
const TITLE_CRYSTAL_BALL_ACCURACY = 0.5;
const TITLE_MIN_PREDICTIONS = 10;

function calculateTitle(accuracy: number, totalPredictions: number): string | null {
  if (totalPredictions < TITLE_MIN_PREDICTIONS) return 'Novice Seer';
  if (accuracy >= TITLE_ORACLE_EYE_ACCURACY) return 'Oracle Eye';
  if (accuracy >= TITLE_FORTUNE_TELLER_ACCURACY) return 'Fortune Teller';
  if (accuracy >= TITLE_CRYSTAL_BALL_ACCURACY) return 'Crystal Ball';
  return 'Novice Seer';
}

// ======================== Place Prediction ========================

/**
 * Place a prediction on a battle or match outcome.
 * Validates that the battle/match exists and is not yet completed.
 */
export async function placePrediction(
  userId: string,
  battleId: string | null,
  matchId: string | null,
  predictedWinnerId: string
): Promise<{ id: string } | null> {
  const admin = getSupabaseAdmin();

  // Must target either a battle or a match, not both or neither
  if ((!battleId && !matchId) || (battleId && matchId)) {
    console.error('placePrediction: must provide exactly one of battleId or matchId');
    return null;
  }

  // Validate that the battle/match exists and is not completed
  if (battleId) {
    const { data: battle, error: battleError } = await admin
      .from('battles')
      .select('id, status')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      console.error('placePrediction: battle not found:', battleError?.message);
      return null;
    }

    if (battle.status === 'completed') {
      console.error('placePrediction: battle already completed');
      return null;
    }
  }

  if (matchId) {
    const { data: match, error: matchError } = await admin
      .from('matches')
      .select('id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('placePrediction: match not found:', matchError?.message);
      return null;
    }

    if (match.status === 'completed') {
      console.error('placePrediction: match already completed');
      return null;
    }
  }

  // Insert the prediction
  const { data, error } = await admin
    .from('predictions')
    .insert({
      user_id: userId,
      battle_id: battleId,
      match_id: matchId,
      predicted_winner_id: predictedWinnerId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('placePrediction: failed to insert:', error.message);
    return null;
  }

  return { id: data.id };
}

// ======================== Settle Predictions ========================

/**
 * Settle all predictions for a battle or match.
 * Marks each prediction as correct or incorrect and updates user stats.
 * If winnerId is null (draw), all predictions are marked incorrect.
 */
export async function settlePredictions(
  battleId: string | null,
  matchId: string | null,
  winnerId: string | null
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Build the query to find unsettled predictions
  let query = admin
    .from('predictions')
    .select('id, user_id, predicted_winner_id')
    .is('settled_at', null);

  if (battleId) {
    query = query.eq('battle_id', battleId);
  } else if (matchId) {
    query = query.eq('match_id', matchId);
  } else {
    console.error('settlePredictions: must provide battleId or matchId');
    return;
  }

  const { data: predictions, error } = await query;

  if (error) {
    console.error('settlePredictions: failed to fetch predictions:', error.message);
    return;
  }

  if (!predictions || predictions.length === 0) {
    return; // No predictions to settle
  }

  const now = new Date().toISOString();
  const affectedUserIds = new Set<string>();

  // Settle each prediction
  for (const prediction of predictions) {
    const isCorrect = winnerId !== null && prediction.predicted_winner_id === winnerId;

    const { error: updateError } = await admin
      .from('predictions')
      .update({
        is_correct: isCorrect,
        settled_at: now,
      })
      .eq('id', prediction.id);

    if (updateError) {
      console.error(`settlePredictions: failed to update prediction ${prediction.id}:`, updateError.message);
      continue;
    }

    affectedUserIds.add(prediction.user_id);
  }

  // Update stats for all affected users
  for (const userId of affectedUserIds) {
    try {
      await updatePredictionStats(userId);
    } catch (err) {
      console.error(`settlePredictions: failed to update stats for user ${userId}:`, err);
    }
  }
}

// ======================== Update Prediction Stats ========================

/**
 * Recalculate and upsert prediction stats for a user.
 * Counts total/correct predictions, calculates streaks and accuracy, assigns title.
 */
export async function updatePredictionStats(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  // Fetch all settled predictions for this user, ordered by settled_at descending
  const { data: predictions, error } = await admin
    .from('predictions')
    .select('is_correct, settled_at')
    .eq('user_id', userId)
    .not('settled_at', 'is', null)
    .order('settled_at', { ascending: false });

  if (error) {
    console.error('updatePredictionStats: failed to fetch predictions:', error.message);
    return;
  }

  if (!predictions || predictions.length === 0) {
    return;
  }

  const total = predictions.length;
  const correct = predictions.filter(p => p.is_correct === true).length;
  const accuracy = total > 0 ? correct / total : 0;

  // Calculate current streak (consecutive correct from most recent)
  let currentStreak = 0;
  for (const prediction of predictions) {
    if (prediction.is_correct === true) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate best streak (longest consecutive correct run)
  let bestStreak = 0;
  let runningStreak = 0;
  for (const prediction of predictions) {
    if (prediction.is_correct === true) {
      runningStreak++;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  const title = calculateTitle(accuracy, total);

  // Upsert into prediction_stats
  const { error: upsertError } = await admin
    .from('prediction_stats')
    .upsert(
      {
        user_id: userId,
        total_predictions: total,
        correct_predictions: correct,
        current_streak: currentStreak,
        best_streak: bestStreak,
        accuracy: Math.round(accuracy * 10000) / 10000,
        title,
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('updatePredictionStats: failed to upsert stats:', upsertError.message);
  }
}

// ======================== Leaderboard ========================

export interface PredictionLeaderboardEntry {
  user_id: string;
  total_predictions: number;
  correct_predictions: number;
  current_streak: number;
  best_streak: number;
  accuracy: number;
  title: string | null;
}

/**
 * Get the prediction leaderboard.
 * Only includes users with at least 10 predictions.
 * Ordered by accuracy descending, then correct_predictions descending.
 */
export async function getPredictionLeaderboard(
  limit: number = 50
): Promise<PredictionLeaderboardEntry[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('prediction_stats')
    .select('user_id, total_predictions, correct_predictions, current_streak, best_streak, accuracy, title')
    .gte('total_predictions', TITLE_MIN_PREDICTIONS)
    .order('accuracy', { ascending: false })
    .order('correct_predictions', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getPredictionLeaderboard: failed to fetch:', error.message);
    return [];
  }

  return data || [];
}
