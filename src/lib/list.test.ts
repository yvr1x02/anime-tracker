import { describe, expect, it } from "vitest";
import { entrySummary, listEntries } from "./list";

const media = (id: number, isAdult = false) => ({
  id,
  isAdult,
  status: null,
  title: { romaji: `Anime ${id}`, english: null, native: null },
  coverImage: null,
  format: null,
  season: null,
  seasonYear: null,
  episodes: 12,
  duration: 24,
  nextAiringEpisode: null,
});
const entry = (id: number, updatedAt: number, mediaId = id, isAdult = false) => ({
  id,
  status: null,
  progress: 0,
  score: 0,
  notes: null,
  updatedAt,
  createdAt: updatedAt,
  startedAt: null,
  completedAt: null,
  media: media(mediaId, isAdult),
});

describe("listEntries", () => {
  it("takes every group once, newest change first, without adult anime", () => {
    const collection = {
      lists: [
        { entries: [entry(1, 100), entry(2, 300)] },
        // A custom list repeating entry 1, and an entry only here (hidden from status lists).
        { entries: [entry(1, 100), entry(3, 200), null] },
        { entries: [entry(4, 400, 4, true)] },
        null,
      ],
    };

    expect(listEntries(collection).map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it("is empty for a missing collection", () => {
    expect(listEntries(null)).toEqual([]);
  });
});

describe("entrySummary", () => {
  it.each([
    [{ progress: 5, score: 8, media: { episodes: 12 } }, "5 visti · voto 8,0"],
    [{ progress: 5, score: 8.5, media: { episodes: 12 } }, "5 visti · voto 8,5"],
    [{ progress: 1, score: 0, media: { episodes: 12 } }, "1 visto"],
    [{ progress: 1, score: null, media: { episodes: null } }, "1 episodio visto"],
    [{ progress: null, score: null, media: { episodes: null } }, "0 episodi visti"],
  ])("%j → %s", (value, expected) => {
    expect(entrySummary(value)).toBe(expected);
  });
});
