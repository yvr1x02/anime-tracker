import { describe, expect, it } from "vitest";
import { applyListRules, savedStatusAndScore, today } from "./list-rules";

const day = { year: 2026, month: 11, day: 20 };
const empty = { year: null, month: null, day: null };

describe("today", () => {
  it("is the date in the given time zone", () => {
    const lateEvening = Date.parse("2026-11-20T23:30:00Z");
    expect(today(lateEvening, "Europe/Rome")).toEqual({ year: 2026, month: 11, day: 21 });
    expect(today(lateEvening, "America/New_York")).toEqual({ year: 2026, month: 11, day: 20 });
  });
});

describe("applyListRules", () => {
  it("fills an empty start date when moving to Sto guardando", () => {
    const current = { status: "PLANNING" as const, startedAt: empty };
    expect(applyListRules(current, { status: "CURRENT" }, day, 12)).toEqual({ status: "CURRENT", startedAt: day });
  });

  it("keeps a start date already there", () => {
    const current = { status: "PAUSED" as const, startedAt: { year: 2025, month: 1, day: 2 } };
    expect(applyListRules(current, { status: "CURRENT" }, day, 12)).toEqual({ status: "CURRENT" });
  });

  it("fills the start date for an anime added straight to Sto guardando", () => {
    expect(applyListRules(null, { status: "CURRENT" }, day, 12)).toEqual({ status: "CURRENT", startedAt: day });
  });

  it("fills the end date and the episodes when moving to Completato", () => {
    const current = { status: "CURRENT" as const, startedAt: day };
    expect(applyListRules(current, { status: "COMPLETED" }, day, 12)).toEqual({
      status: "COMPLETED",
      completedAt: day,
      progress: 12,
    });
  });

  it("leaves the episodes alone when the total is unknown", () => {
    expect(applyListRules(null, { status: "COMPLETED" }, day, null)).toEqual({ status: "COMPLETED", completedAt: day });
  });

  it("does nothing when the status does not change, or for other changes", () => {
    const current = { status: "COMPLETED" as const, startedAt: day };
    expect(applyListRules(current, { status: "COMPLETED", score: 8 }, day, 12)).toEqual({
      status: "COMPLETED",
      score: 8,
    });
    expect(applyListRules(current, { progress: 3 }, day, 12)).toEqual({ progress: 3 });
  });
});

describe("savedStatusAndScore", () => {
  const entry = { status: "CURRENT" as const, progress: 11, score: 8, media: { episodes: 12 } };

  it("takes the changed status and score, or keeps the current ones", () => {
    expect(savedStatusAndScore(entry, { status: "PAUSED" })).toEqual({ status: "PAUSED", score: 8 });
    expect(savedStatusAndScore(entry, { score: 0 })).toEqual({ status: "CURRENT", score: 0 });
    expect(savedStatusAndScore(entry, { notes: "x" })).toEqual({ status: "CURRENT", score: 8 });
  });

  it("is Completato when a change takes Sto guardando to the last episode, as AniList does", () => {
    expect(savedStatusAndScore(entry, { progress: 12 })).toEqual({ status: "COMPLETED", score: 8 });
    // Already at the last episode, but the change is not about episodes: no completion predicted.
    const atLast = { ...entry, progress: 12 };
    expect(savedStatusAndScore(atLast, { notes: "x" }).status).toBe("CURRENT");
  });

  it("does not complete before the last episode, other statuses, or without a total", () => {
    expect(savedStatusAndScore(entry, { progress: 11 }).status).toBe("CURRENT");
    expect(savedStatusAndScore(entry, { status: "REPEATING", progress: 12 }).status).toBe("REPEATING");
    expect(savedStatusAndScore({ ...entry, media: { episodes: null } }, { progress: 40 }).status).toBe("CURRENT");
  });
});
