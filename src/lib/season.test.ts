import { describe, expect, it } from "vitest";
import { currentSeason } from "./season";

describe("currentSeason", () => {
  it.each([
    ["2026-01-01T00:00:00Z", "WINTER", 2026],
    ["2026-03-31T23:59:59Z", "WINTER", 2026],
    ["2026-04-01T00:00:00Z", "SPRING", 2026],
    ["2026-07-15T12:00:00Z", "SUMMER", 2026],
    ["2026-10-01T00:00:00Z", "FALL", 2026],
    ["2026-11-20T10:00:00Z", "FALL", 2026],
    ["2026-12-31T23:59:59Z", "FALL", 2026],
  ])("%s is %s %s", (iso, season, year) => {
    expect(currentSeason(new Date(iso))).toEqual({ season, year });
  });
});
