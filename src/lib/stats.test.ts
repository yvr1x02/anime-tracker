import { describe, expect, it } from "vitest";
import type { MediaListStatus } from "@/gql/graphql";
import { listStats, parseScoreFilter, scoreBar, scoreCounts } from "./stats";

type Options = {
  progress?: number | null;
  score?: number | null;
  duration?: number | null;
  genres?: (string | null)[] | null;
  studios?: string[];
};

const entry = (status: MediaListStatus, { progress = 0, score = 0, duration = 24, genres = [], studios = [] }: Options = {}) => ({
  status,
  progress,
  score,
  // A name ending in "*" is a company that is not an animation studio, such as a publisher.
  media: {
    duration,
    genres,
    studios: {
      nodes: studios.map((name, id) => ({ id, name: name.replace("*", ""), isAnimationStudio: !name.endsWith("*") })),
    },
  },
});

describe("scoreBar", () => {
  it.each([
    [8, 8],
    [8.9, 8],
    [1, 1],
    [1.5, 1],
    [10, 10],
    [0, null],
    [null, null],
  ])("puts %s in bar %s", (score, bar) => {
    expect(scoreBar(score)).toBe(bar);
  });
});

describe("scoreCounts", () => {
  it("counts every bar from 1 to 10 and leaves out anime without a score", () => {
    const entries = [{ score: 8 }, { score: 8.9 }, { score: 10 }, { score: 1 }, { score: 0 }, { score: null }];
    expect(scoreCounts(entries)).toEqual([1, 0, 0, 0, 0, 0, 0, 2, 0, 1]);
  });

  it("is ten zeros for an empty list", () => {
    expect(scoreCounts([])).toEqual(Array(10).fill(0));
  });
});

describe("parseScoreFilter", () => {
  it.each(["1", "8", "10"])("takes %s", (value) => {
    expect(parseScoreFilter(value)).toBe(Number(value));
  });

  it.each(["0", "11", "8.5", "08", " 8", "abc", "", null, undefined])("ignores %j", (value) => {
    expect(parseScoreFilter(value)).toBeNull();
  });

  it("ignores a repeated parameter", () => {
    expect(parseScoreFilter(["8", "9"])).toBeNull();
  });
});

describe("listStats", () => {
  it("is all zeros and empty rankings for an empty list", () => {
    const stats = listStats([]);
    expect(stats.byStatus.map(({ count }) => count)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stats).toMatchObject({ episodes: 0, minutes: 0, withoutDuration: 0, averageScore: null, genres: [], studios: [] });
  });

  it("counts anime per status in the order of the filters", () => {
    const stats = listStats([entry("COMPLETED"), entry("COMPLETED"), entry("PLANNING"), entry("REPEATING")]);
    expect(stats.byStatus).toEqual([
      { status: "CURRENT", count: 0 },
      { status: "PLANNING", count: 1 },
      { status: "COMPLETED", count: 2 },
      { status: "PAUSED", count: 0 },
      { status: "DROPPED", count: 0 },
      { status: "REPEATING", count: 1 },
    ]);
  });

  it("adds up episodes and time, counting the anime without a duration apart", () => {
    const stats = listStats([
      entry("COMPLETED", { progress: 12, duration: 24 }),
      entry("CURRENT", { progress: 1, duration: 90 }),
      entry("CURRENT", { progress: 3, duration: null }),
      entry("PLANNING", { progress: 0, duration: null }),
      entry("CURRENT", { progress: null }),
    ]);
    expect(stats.episodes).toBe(16);
    expect(stats.minutes).toBe(12 * 24 + 90);
    expect(stats.withoutDuration).toBe(1);
  });

  it("averages only the scores that are set", () => {
    const stats = listStats([
      entry("COMPLETED", { score: 8 }),
      entry("COMPLETED", { score: 7.5 }),
      entry("COMPLETED", { score: 0 }),
      entry("COMPLETED", { score: null }),
    ]);
    expect(stats.averageScore).toBe(7.75);
  });

  it("ranks genres without Da vedere, ties in Italian alphabetical order, at most 10", () => {
    const stats = listStats([
      entry("COMPLETED", { genres: ["Action", "Drama", null] }),
      entry("CURRENT", { genres: ["Drama", "Music", "Mystery"] }),
      entry("DROPPED", { genres: ["Action"] }),
      entry("PLANNING", { genres: ["Romance", "Romance"] }),
      entry("PAUSED", { genres: null }),
    ]);
    // Ties go by the Italian name: Mistero (Mystery) before Musica (Music). Romance is only in Da vedere.
    expect(stats.genres).toEqual([
      { name: "Action", count: 2 },
      { name: "Drama", count: 2 },
      { name: "Mystery", count: 1 },
      { name: "Music", count: 1 },
    ]);

    const many = ["Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Mecha", "Music", "Mystery", "Psychological"];
    expect(listStats([entry("COMPLETED", { genres: many })]).genres).toHaveLength(10);
  });

  it("ranks the first 5 animation studios without Da vedere", () => {
    const stats = listStats([
      entry("COMPLETED", { studios: ["Madhouse", "Shueisha*", "Dentsu*"] }),
      entry("COMPLETED", { studios: ["Madhouse", "MAPPA", "Shueisha*"] }),
      entry("PLANNING", { studios: ["Bones", "Bones", "Bones"] }),
      ...["A-1", "Bones", "CloverWorks", "David Production", "Kyoto Animation"].map((name) => entry("CURRENT", { studios: [name] })),
    ]);
    expect(stats.studios).toEqual([
      { name: "Madhouse", count: 2 },
      { name: "A-1", count: 1 },
      { name: "Bones", count: 1 },
      { name: "CloverWorks", count: 1 },
      { name: "David Production", count: 1 },
    ]);
  });
});
