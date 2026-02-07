/**
 * ELO rating calculation for Open Colosseum.
 * Supports standard 2-player and 3-way (debate) matchups.
 */

const DEFAULT_K = 32;

/**
 * Calculate expected score for player A against player B.
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export interface EloResult {
  newRating: number;
  change: number;
}

/**
 * Calculate new ELO ratings for a 2-player matchup.
 * @param ratingA - Current ELO of player A
 * @param ratingB - Current ELO of player B
 * @param scoreA - Actual score: 1 = A wins, 0 = B wins, 0.5 = draw
 * @param k - K-factor (default 32)
 * @returns New ratings for both players
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k: number = DEFAULT_K
): { a: EloResult; b: EloResult } {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;

  const changeA = Math.round(k * (scoreA - expectedA));
  const changeB = Math.round(k * (scoreB - expectedB));

  return {
    a: { newRating: ratingA + changeA, change: changeA },
    b: { newRating: ratingB + changeB, change: changeB },
  };
}

/**
 * Calculate new ELO ratings for a 3-way matchup (debates).
 * Uses pairwise expected scores averaged across all opponents.
 * @param ratingA - Current ELO of player A
 * @param ratingB - Current ELO of player B
 * @param ratingC - Current ELO of player C
 * @param scores - Actual scores for each player (should sum to 1.5 in a 3-way)
 *                 Winner gets 1.0, second gets 0.5, loser gets 0.0
 * @param k - K-factor (default 32)
 */
export function calculateElo3Way(
  ratingA: number,
  ratingB: number,
  ratingC: number,
  scores: { a: number; b: number; c: number },
  k: number = DEFAULT_K
): { a: EloResult; b: EloResult; c: EloResult } {
  // Expected score for each player: average of pairwise expected scores
  const expAB = expectedScore(ratingA, ratingB);
  const expAC = expectedScore(ratingA, ratingC);
  const expBA = expectedScore(ratingB, ratingA);
  const expBC = expectedScore(ratingB, ratingC);
  const expCA = expectedScore(ratingC, ratingA);
  const expCB = expectedScore(ratingC, ratingB);

  const expectedA = (expAB + expAC) / 2;
  const expectedB = (expBA + expBC) / 2;
  const expectedC = (expCA + expCB) / 2;

  // Normalize actual scores to [0, 1] range (divide by max possible = 1.0 per opponent)
  const normalizedA = scores.a / 2;
  const normalizedB = scores.b / 2;
  const normalizedC = scores.c / 2;

  const changeA = Math.round(k * (normalizedA - expectedA));
  const changeB = Math.round(k * (normalizedB - expectedB));
  const changeC = Math.round(k * (normalizedC - expectedC));

  return {
    a: { newRating: ratingA + changeA, change: changeA },
    b: { newRating: ratingB + changeB, change: changeB },
    c: { newRating: ratingC + changeC, change: changeC },
  };
}
