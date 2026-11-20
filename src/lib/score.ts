// Scores on the decimal 10-point scale (AniList's POINT_10_DECIMAL): 1,0–10,0 with one decimal; 0 means none.

const oneDecimal = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "8,5", "9,0". */
export function formatScore(score: number): string {
  return oneDecimal.format(score);
}

/** 0 (no score), or 1,0–10,0 with at most one decimal. */
export function isValidScore(score: unknown): score is number {
  if (typeof score !== "number" || !Number.isFinite(score)) return false;
  const tenths = score * 10;
  // Tolerance: 8.3 * 10 is 83.00000000000001 in floating point.
  return score === 0 || (score >= 1 && score <= 10 && Math.abs(tenths - Math.round(tenths)) < 1e-9);
}

/** The score field: empty means no score (0); "8,5" or "8.5" a score; anything else undefined (invalid). */
export function parseScore(text: string): number | undefined {
  const value = text.trim().replace(",", ".");
  if (value === "") return 0;
  if (!/^\d{1,2}(\.\d)?$/.test(value)) return undefined;
  const score = Number(value);
  return score !== 0 && isValidScore(score) ? score : undefined;
}

/** AniList's scoreRaw is the score out of 100, independent of the user's scoring system. */
export function toScoreRaw(score: number): number {
  return Math.round(score * 10);
}
