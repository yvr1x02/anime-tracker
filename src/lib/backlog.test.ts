import { describe, expect, it } from "vitest";
import type { MediaListStatus, MediaStatus } from "@/gql/graphql";
import { airedEpisodes, backlogText, continueWatching, episodesBehind } from "./backlog";
import type { ListEntry } from "./list";

const now = Date.parse("2026-11-20T12:00:00Z");
const at = (iso: string) => Date.parse(iso) / 1000;
const media = (status: MediaStatus | null, episodes: number | null, next: [number, string] | null = null) => ({
  status,
  episodes,
  nextAiringEpisode: next && { episode: next[0], airingAt: at(next[1]) },
});

describe("airedEpisodes", () => {
  it("is the total for a finished or cancelled anime", () => {
    expect(airedEpisodes(media("FINISHED", 12), now)).toBe(12);
    expect(airedEpisodes(media("CANCELLED", 8), now)).toBe(8);
  });

  it("is the next episode minus one while airing", () => {
    expect(airedEpisodes(media("RELEASING", 24, [6, "2026-11-22T15:00:00Z"]), now)).toBe(5);
    expect(airedEpisodes(media("RELEASING", null, [1182, "2026-11-22T01:00:00Z"]), now)).toBe(1181);
  });

  it("counts the next episode too once its time has passed (list data a few hours old)", () => {
    expect(airedEpisodes(media("RELEASING", 24, [6, "2026-11-20T11:00:00Z"]), now)).toBe(6);
  });

  it("never goes past the total", () => {
    expect(airedEpisodes(media("RELEASING", 12, [12, "2026-11-20T11:00:00Z"]), now)).toBe(12);
  });

  it.each([
    ["airing without a schedule", media("RELEASING", 24)],
    ["on hiatus", media("HIATUS", 24)],
    ["not out yet", media("NOT_YET_RELEASED", 12, [1, "2027-01-05T15:00:00Z"])],
    ["finished without a total", media("FINISHED", null)],
    ["without a status", media(null, 12)],
  ])("is unknown for an anime %s", (_, item) => {
    expect(airedEpisodes(item, now)).toBeNull();
  });
});

describe("episodesBehind", () => {
  it("is aired minus seen", () => {
    expect(episodesBehind({ progress: 3, media: media("RELEASING", 24, [6, "2026-11-22T15:00:00Z"]) }, now)).toBe(2);
    expect(episodesBehind({ progress: null, media: media("FINISHED", 12) }, now)).toBe(12);
  });

  it("is 0 when up to date, ahead or unknown", () => {
    expect(episodesBehind({ progress: 12, media: media("FINISHED", 12) }, now)).toBe(0);
    expect(episodesBehind({ progress: 7, media: media("RELEASING", 24, [6, "2026-11-22T15:00:00Z"]) }, now)).toBe(0);
    expect(episodesBehind({ progress: 3, media: media("HIATUS", 24) }, now)).toBe(0);
  });
});

describe("backlogText", () => {
  it.each([
    [2, "RELEASING", "Sei indietro di 2 episodi"],
    [1, "RELEASING", "Sei indietro di 1 episodio"],
    [3, "FINISHED", "Ti mancano 3 episodi"],
    [1, "FINISHED", "Ti manca 1 episodio"],
    [1, "CANCELLED", "Ti manca 1 episodio"],
  ] as const)("%s episodes, %s: %s", (behind, status, text) => {
    expect(backlogText(behind, status)).toBe(text);
  });
});

describe("continueWatching", () => {
  const entry = (id: number, status: MediaListStatus, progress: number, updatedAt: number, total = 12) =>
    ({
      id,
      status,
      progress,
      updatedAt,
      createdAt: updatedAt,
      score: 0,
      notes: null,
      startedAt: null,
      completedAt: null,
      media: { id, isAdult: false, title: null, coverImage: null, format: null, season: null, seasonYear: null, duration: 24, ...media("FINISHED", total) },
    }) as ListEntry;

  it("keeps watching and rewatching with arrears, newest change first", () => {
    const entries = [
      entry(1, "CURRENT", 10, 100),
      entry(2, "REPEATING", 0, 300),
      entry(3, "CURRENT", 12, 400), // up to date
      entry(4, "PLANNING", 0, 500),
      entry(5, "PAUSED", 2, 600),
    ];
    expect(continueWatching(entries, now).map(({ entry: e, behind }) => [e.id, behind])).toEqual([
      [2, 12],
      [1, 2],
    ]);
  });

  it("shows at most 6", () => {
    const entries = Array.from({ length: 8 }, (_, index) => entry(index + 1, "CURRENT", 0, index));
    expect(continueWatching(entries, now).map(({ entry: e }) => e.id)).toEqual([8, 7, 6, 5, 4, 3]);
  });
});
