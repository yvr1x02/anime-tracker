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
  5: { id: 5, title: { romaji: "AniList al limite" } },
  6: { id: 6, title: { romaji: "Errore passeggero" } },
  // Adult anime: the app must never show it, so queries ask for isAdult: false.
  3: { id: 3, isAdult: true, title: { romaji: "Solo per adulti" } },
};

// OAuth values come from playwright.config.ts (e2e/secrets.ts), so tests and fake agree.
const oauth = {
  clientId: process.env.E2E_CLIENT_ID,
  clientSecret: process.env.E2E_CLIENT_SECRET,
  accessToken: process.env.E2E_ACCESS_TOKEN,
  code: "e2e-code",
};
const viewer = { id: 7, name: "UtenteDiProva" };
const unauthorized = { data: { Viewer: null }, errors: [{ message: "Invalid token", status: 401 }] };

const notFound = { data: { Media: null }, errors: [{ message: "Not Found.", status: 404 }] };
// Anime 4 comes with a Date two hours old, as if served from a cache that has not been refreshed.
const staleDates = { 4: new Date((startedAt - 2 * HOUR) * 1000).toUTCString() };
// Anime 5: AniList always over the limit. Anime 6: the first request fails, the next ones work.
const failures = { 5: Infinity, 6: 1 };

http
  .createServer((request, response) => {
    const url = new URL(request.url, `http://localhost:${PORT}`);
    // Like AniList after the user approves: straight back to the app with a code and the same state.
    if (request.method === "GET" && url.pathname === "/oauth/authorize") {
      const redirect = new URL(url.searchParams.get("redirect_uri"));
      const known = url.searchParams.get("client_id") === oauth.clientId;
      redirect.searchParams.set(known ? "code" : "error", known ? oauth.code : "invalid_client");
      if (url.searchParams.has("state")) redirect.searchParams.set("state", url.searchParams.get("state"));
      response.writeHead(302, { Location: redirect.toString() });
      response.end();
      return;
    }
    if (request.method !== "POST") {
      response.end("fake AniList");
      return;
    }
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      if (url.pathname === "/oauth/token") {
        const grant = JSON.parse(body);
        const valid =
          grant.grant_type === "authorization_code" &&
          grant.client_id === oauth.clientId &&
          grant.client_secret === oauth.clientSecret &&
          grant.code === oauth.code;
        response.writeHead(valid ? 200 : 400, { "Content-Type": "application/json" });
        response.end(JSON.stringify(valid ? { token_type: "Bearer", access_token: oauth.accessToken } : { error: "invalid_grant" }));
        return;
      }
      const { query, variables } = JSON.parse(body);
      if (query.includes("query Viewer")) {
        const authorized = request.headers.authorization === `Bearer ${oauth.accessToken}`;
        response.writeHead(authorized ? 200 : 401, { "Content-Type": "application/json" });
        response.end(JSON.stringify(authorized ? { data: { Viewer: viewer } } : unauthorized));
        return;
      }
      if (failures[variables?.id] > 0) {
        failures[variables.id]--;
        response.writeHead(429, { "Retry-After": "60" });
        response.end();
        return;
      }
      const found = query.includes("query AnimeDetail") ? anime[variables?.id] : undefined;
      // Like AniList: with isAdult: false an adult anime is simply not found.
      const media = found?.isAdult && query.includes("isAdult: false") ? undefined : found;
      const date = staleDates[variables?.id];
      response.writeHead(media ? 200 : 404, { "Content-Type": "application/json", ...(date && { Date: date }) });
      response.end(JSON.stringify(media ? { data: { Media: media } } : notFound));
    });
  })
  .listen(PORT, "localhost");
