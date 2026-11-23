import { describe, expect, it } from "vitest";
import type { WeekScheduleQuery } from "@/gql/graphql";
import { IncompleteWeekError, weekEpisodes } from "./schedule";

const episode = (id: number, airingAt: number, isAdult = false) => ({
  id,
  episode: 1,
  airingAt,
  media: { id: id * 10, isAdult, title: { romaji: `Anime ${id}`, english: null, native: null }, coverImage: null, format: null },
});
const page = (episodes: ReturnType<typeof episode>[], hasNextPage = false) => ({
  pageInfo: { hasNextPage },
  airingSchedules: episodes,
});
const empty = page([]);
const week = (overrides: Partial<Record<"p1" | "p2" | "p3" | "p4" | "p5" | "p6", unknown>> = {}) =>
  ({ p1: page([episode(1, 300), episode(2, 100)], true), p2: page([episode(3, 200)]), p3: empty, p4: empty, p5: empty, p6: empty, ...overrides }) as WeekScheduleQuery;

describe("weekEpisodes", () => {
  it("joins the pages, soonest first", () => {
    expect(weekEpisodes(week()).map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it("leaves out adult anime and repeats", () => {
    const data = week({ p2: page([episode(3, 200), episode(1, 300), episode(4, 400, true)]) });
    expect(weekEpisodes(data).map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it.each(["p1", "p3", "p6"] as const)("refuses the week when page %s is missing", (key) => {
    expect(() => weekEpisodes(week({ [key]: null }))).toThrow(IncompleteWeekError);
  });

  it("refuses the week when even the sixth page says there are more", () => {
    expect(() => weekEpisodes(week({ p6: page([], true) }))).toThrow("more than six pages");
  });
});
