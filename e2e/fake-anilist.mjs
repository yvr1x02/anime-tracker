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
  // Only in a custom list of the demo profile. Not 5 or 6: cards get prefetched, which would use up their failures.
  8: { id: 8, title: { romaji: "Lista personalizzata" }, format: "OVA", episodes: 2 },
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
// What the real AniList answers to a bad token (checked on 2026-11-20).
const invalidToken = { data: null, errors: [{ message: "Invalid token", status: 400 }] };

// The demo profile's public list (ANILIST_DEMO_USERNAME=UtenteDemo in playwright.config.ts). On purpose:
// an entry repeated in a custom list, one only in a custom list, and an adult anime the app must hide.
const listMedia = (id) => {
  const { title, coverImage = null, format = null, season = null, seasonYear = null, episodes = null } = anime[id];
  return { id, isAdult: Boolean(anime[id].isAdult), title, coverImage, format, season, seasonYear, episodes, nextAiringEpisode: null };
};
const listEntry = (id, mediaId, status, progress, score, updatedAt) => ({
  id,
  status,
  progress,
  score,
  notes: null,
  updatedAt,
  startedAt: { year: null, month: null, day: null },
  completedAt: { year: null, month: null, day: null },
  media: listMedia(mediaId),
});
const demoLists = [
  { entries: [listEntry(101, 1, "CURRENT", 5, 8, 300)] },
  { entries: [listEntry(102, 4, "COMPLETED", 1, 0, 200)] },
  { entries: [listEntry(103, 3, "PLANNING", 0, 0, 500)] },
  { isCustomList: true, entries: [listEntry(101, 1, "CURRENT", 5, 8, 300), listEntry(104, 8, "PLANNING", 0, 0, 100)] },
];

// The logged-in test user's own list (Viewer id 7). Changes go here; POST /__reset restores it.
const initialMyLists = () => [
  { entries: [listEntry(201, 4, "CURRENT", 0, 0, 600)] },
  { entries: [listEntry(202, 1, "COMPLETED", 12, 9, 500)] },
];
let myLists = initialMyLists();
// Each login gets its own token, all starting with the fake one the tests look for in leaks.
// POST /__revoke with {"token"} stops one, as when a user revokes the app: other tests' logins keep working.
let tokensIssued = 0;
const revokedTokens = new Set();
// POST /__fail-saves with {"count"}: the next saves answer 500, to test going back to the previous value.
let failingSaves = 0;
let nextEntryId = 300;

// Like AniList: one entry per anime; only the variables sent change; scoreRaw is out of 100 and the list
// reads it back as POINT_10_DECIMAL.
function saveEntry({ mediaId, scoreRaw, ...changes }) {
  let entry = myLists.flatMap((list) => list.entries).find((item) => item.media.id === mediaId);
  if (!entry) {
    entry = listEntry(nextEntryId++, mediaId, "PLANNING", 0, 0, 0);
    myLists[0].entries.push(entry);
  }
  Object.assign(entry, changes, { updatedAt: Math.floor(Date.now() / 1000) });
  if (scoreRaw !== undefined) entry.score = scoreRaw / 10;
  // Like AniList (seen on 2026-11-20): watching the last episode completes the entry and fills the end date.
  if (entry.status === "CURRENT" && entry.media.episodes && entry.progress >= entry.media.episodes) {
    const today = new Date();
    entry.status = "COMPLETED";
    entry.completedAt = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate() };
  }
  return { SaveMediaListEntry: entry };
}

function deleteEntry({ id }) {
  for (const list of myLists) list.entries = list.entries.filter((entry) => entry.id !== id);
  return { DeleteMediaListEntry: { deleted: true } };
}

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
    if (url.pathname === "/__reset") {
      myLists = initialMyLists();
      failingSaves = 0;
      response.writeHead(204);
      response.end();
      return;
    }
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      if (url.pathname === "/__fail-saves") {
        failingSaves = JSON.parse(body).count;
        response.writeHead(204);
        response.end();
        return;
      }
      if (url.pathname === "/__revoke") {
        revokedTokens.add(JSON.parse(body).token);
        response.writeHead(204);
        response.end();
        return;
      }
      if (url.pathname === "/oauth/token") {
        const grant = JSON.parse(body);
        const valid =
          grant.grant_type === "authorization_code" &&
          grant.client_id === oauth.clientId &&
          grant.client_secret === oauth.clientSecret &&
          grant.code === oauth.code;
        response.writeHead(valid ? 200 : 400, { "Content-Type": "application/json" });
        const token = `${oauth.accessToken}-${++tokensIssued}`;
        response.end(JSON.stringify(valid ? { token_type: "Bearer", access_token: token } : { error: "invalid_grant" }));
        return;
      }
      const { query, variables } = JSON.parse(body);
      const token = request.headers.authorization?.replace(/^Bearer /, "");
      const authorized = Boolean(token?.startsWith(oauth.accessToken)) && !revokedTokens.has(token);
      if (request.headers.authorization && !authorized) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify(invalidToken));
        return;
      }
      if (query.includes("mutation SaveListEntry") || query.includes("mutation DeleteListEntry")) {
        if (!authorized) {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify(invalidToken));
          return;
        }
        if (failingSaves > 0) {
          failingSaves--;
          response.writeHead(500, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ data: null, errors: [{ message: "Internal error", status: 500 }] }));
          return;
        }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ data: query.includes("mutation SaveListEntry") ? saveEntry(variables) : deleteEntry(variables) }));
        return;
      }
      if (query.includes("query UserAnimeList") && variables?.userId === viewer.id) {
        response.writeHead(authorized ? 200 : 404, { "Content-Type": "application/json" });
        response.end(JSON.stringify(authorized ? { data: { MediaListCollection: { lists: myLists } } } : notFound));
        return;
      }
      if (query.includes("query UserAnimeList")) {
        const found = variables?.userName === "UtenteDemo";
        response.writeHead(found ? 200 : 404, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify(
            found
              ? { data: { MediaListCollection: { lists: demoLists } } }
              : { data: { MediaListCollection: null }, errors: [{ message: "User not found", status: 404 }] },
          ),
        );
        return;
      }
      // The Home's season, whatever season is asked: the same invented anime, most popular first.
      if (query.includes("query SeasonAnime")) {
        const season = [1, 4, 8].map(listMedia);
        const upcoming = schedule.filter((node) => node.airingAt > Date.now() / 1000).sort((a, b) => a.airingAt - b.airingAt);
        season[0].nextAiringEpisode = upcoming[0] ?? null;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ data: { Page: { media: season } } }));
        return;
      }
      if (query.includes("query Viewer")) {
        response.writeHead(authorized ? 200 : 400, { "Content-Type": "application/json" });
        response.end(JSON.stringify(authorized ? { data: { Viewer: viewer } } : invalidToken));
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
