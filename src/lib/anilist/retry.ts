import { AniListRateLimitError } from "./client";

/**
 * ADR-0003, browser requests: at most one automatic retry, never a burst. A 429 is retried only
 * when AniList said how long to wait; without a wait time the search shows the error instead.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  return !(error instanceof AniListRateLimitError && error.retryAfterSeconds === null);
}

/** After a 429, AniList's wait; after any other failure, one second. */
export function retryDelayMs(_failureCount: number, error: unknown): number {
  return error instanceof AniListRateLimitError && error.retryAfterSeconds !== null
    ? error.retryAfterSeconds * 1000
    : 1000;
}
