import type { Page, Route } from "@playwright/test";

// Browser requests (the search) never reach the real AniList: page.route answers them. All data is invented.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
};

export const searchResults = [
  {
    id: 1,
    status: "FINISHED",
    title: { romaji: "Hoshi no Kioku", english: "Memory of the Stars", native: "星の記憶" },
    coverImage: null,
    format: "TV",
    season: "FALL",
    seasonYear: 2026,
    episodes: 12,
    duration: 24,
    nextAiringEpisode: null,
  },
  {
    id: 4,
    status: "FINISHED",
    title: { romaji: "Senza palinsesto", english: null, native: null },
    coverImage: null,
    format: "MOVIE",
    season: null,
    seasonYear: 2025,
    episodes: 1,
    duration: 90,
    nextAiringEpisode: null,
  },
];

type Reply = { status: number; headers?: Record<string, string>; media?: unknown[] };

/** Answers AniList requests with `replies` in order (the last one repeats) and records the search terms. */
export async function mockAniList(page: Page, replies: Reply[]) {
  const searches: string[] = [];
  await page.route("https://graphql.anilist.co/**", async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    searches.push(route.request().postDataJSON().variables.search);
    const reply = replies[Math.min(searches.length, replies.length) - 1];
    await route.fulfill({
      status: reply.status,
      headers: { ...cors, ...reply.headers },
      contentType: "application/json",
      body: reply.media ? JSON.stringify({ data: { Page: { media: reply.media } } }) : "",
    });
  });
  return searches;
}
