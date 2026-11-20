// Fake AniList for the e2e tests: the app server points here through ANILIST_API_URL,
// so tests never spend the real rate limit. All data is invented.
import http from "node:http";

const PORT = 3999;
const HOUR = 3600;
const startedAt = Math.floor(Date.now() / 1000);
// Unsorted on purpose, with one episode that has already aired: the app must sort and drop it.
const schedule = [
  { episode: 15, airingAt: startedAt + 14 * 24 * HOUR },
  { episode: 12, airingAt: startedAt - HOUR },
  { episode: 13, airingAt: startedAt + 2 * HOUR },
  { episode: 16, airingAt: startedAt + 21 * 24 * HOUR },
  { episode: 14, airingAt: startedAt + 7 * 24 * HOUR },
];

const anime = {
  1: {
    id: 1,
    title: { romaji: "Hoshi no Kioku", english: "Memory of the Stars", native: "星の記憶" },
    coverImage: { medium: null, large: null, extraLarge: null, color: "#e4a15d" },
    description:
      'Una storia inventata per i test &amp; nient&#39;altro.<br><br>\nSecondo paragrafo<script>alert("x")</script> con <i>corsivo</i><img src=x onerror="alert(1)">.',
    genres: ["Adventure", "Sci-Fi", "Isekai"],
    studios: { nodes: [{ id: 10, name: "Studio di Prova" }] },
    format: "TV",
    status: "FINISHED",
    episodes: 12,
    duration: 24,
    season: "FALL",
    seasonYear: 2026,
    airingSchedule: { nodes: schedule },
  },
  4: {
    id: 4,
    title: { romaji: "Senza palinsesto", english: null, native: null },
    coverImage: null,
    description: null,
    genres: [],
    studios: { nodes: [] },
    format: "MOVIE",
    status: "FINISHED",
    episodes: 1,
    duration: 90,
    season: null,
    seasonYear: 2025,
    airingSchedule: { nodes: [] },
  },
  // Adult anime: the app must never show it, so queries ask for isAdult: false.
  3: { id: 3, isAdult: true, title: { romaji: "Solo per adulti" } },
};

const notFound = { data: { Media: null }, errors: [{ message: "Not Found.", status: 404 }] };

http
  .createServer((request, response) => {
    if (request.method !== "POST") {
      response.end("fake AniList");
      return;
    }
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      const { query, variables } = JSON.parse(body);
      const found = query.includes("query AnimeDetail") ? anime[variables?.id] : undefined;
      // Like AniList: with isAdult: false an adult anime is simply not found.
      const media = found?.isAdult && query.includes("isAdult: false") ? undefined : found;
      response.writeHead(media ? 200 : 404, { "Content-Type": "application/json" });
      response.end(JSON.stringify(media ? { data: { Media: media } } : notFound));
    });
  })
  .listen(PORT, "localhost");
