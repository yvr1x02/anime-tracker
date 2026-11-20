import { describe, expect, it } from "vitest";
import { MAX_NOTES_LENGTH, parseDeleteEntry, parseSaveEntry } from "./entry-input";

describe("parseSaveEntry", () => {
  it("keeps the known fields and turns the score into scoreRaw", () => {
    expect(
      parseSaveEntry({
        mediaId: 21,
        status: "COMPLETED",
        progress: 12,
        score: 8,
        notes: "Bello",
        completedAt: { year: 2026, month: 11, day: 20 },
        extra: "ignored",
      }),
    ).toEqual({
      mediaId: 21,
      status: "COMPLETED",
      progress: 12,
      scoreRaw: 80,
      notes: "Bello",
      completedAt: { year: 2026, month: 11, day: 20 },
    });
  });

  it("sends only what was given, and 0 to clear the score", () => {
    expect(parseSaveEntry({ mediaId: 21, progress: 3 })).toEqual({ mediaId: 21, progress: 3 });
    expect(parseSaveEntry({ mediaId: 21, score: 0 })).toEqual({ mediaId: 21, scoreRaw: 0 });
  });

  it.each([
    [8.5, 85],
    [8.3, 83],
    [1, 10],
    [10, 100],
  ])("turns the decimal score %s into scoreRaw %s", (score, scoreRaw) => {
    expect(parseSaveEntry({ mediaId: 21, score })).toEqual({ mediaId: 21, scoreRaw });
  });

  it.each([
    null,
    "21",
    {},
    { mediaId: 0 },
    { mediaId: 1.5 },
    { mediaId: "21" },
    { mediaId: 21, status: "WATCHING" },
    { mediaId: 21, progress: -1 },
    { mediaId: 21, score: 11 },
    { mediaId: 21, score: 8.55 },
    { mediaId: 21, score: 0.5 },
    { mediaId: 21, score: "8,5" },
    { mediaId: 21, notes: 42 },
    { mediaId: 21, notes: "x".repeat(MAX_NOTES_LENGTH + 1) },
    { mediaId: 21, startedAt: { year: 2026, month: 13, day: 1 } },
    { mediaId: 21, completedAt: "2026-11-20" },
  ])("refuses %j", (body) => {
    expect(parseSaveEntry(body)).toBeNull();
  });
});

describe("parseDeleteEntry", () => {
  it("reads the entry id", () => {
    expect(parseDeleteEntry({ id: 201 })).toBe(201);
  });

  it.each([null, {}, { id: "201" }, { id: -1 }])("refuses %j", (body) => {
    expect(parseDeleteEntry(body)).toBeNull();
  });
});
