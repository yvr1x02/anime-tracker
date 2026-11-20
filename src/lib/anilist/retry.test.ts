import { describe, expect, it } from "vitest";
import { AniListError, AniListRateLimitError } from "./client";
import { NotLoggedInError } from "@/lib/auth/errors";
import { retryDelayMs, shouldRetry } from "./retry";

describe("shouldRetry", () => {
  it("retries a failure once, then gives up", () => {
    const error = new AniListError("AniList unreachable");
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(false);
  });

  it("retries a 429 once when AniList gives a wait time", () => {
    expect(shouldRetry(0, new AniListRateLimitError(30))).toBe(true);
    expect(shouldRetry(1, new AniListRateLimitError(30))).toBe(false);
  });

  it("does not retry when the session has ended", () => {
    expect(shouldRetry(0, new NotLoggedInError())).toBe(false);
  });

  it("does not retry a 429 without a wait time", () => {
    expect(shouldRetry(0, new AniListRateLimitError(null))).toBe(false);
  });
});

describe("retryDelayMs", () => {
  it("waits as long as AniList asks after a 429", () => {
    expect(retryDelayMs(0, new AniListRateLimitError(42))).toBe(42_000);
  });

  it("waits one second after any other failure", () => {
    expect(retryDelayMs(0, new AniListError("AniList responded 502", 502))).toBe(1000);
  });
});
