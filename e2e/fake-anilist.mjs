// Fake AniList for the e2e tests: the app server points here through ANILIST_API_URL,
// so tests never spend the real rate limit. All data is invented.
import http from "node:http";

const PORT = 3999;

const anime = {
  1: {
    id: 1,
    title: { romaji: "Hoshi no Kioku", english: "Memory of the Stars", native: "星の記憶" },
    coverImage: { medium: null, large: null, extraLarge: null, color: "#e4a15d" },
    description:
      'Una storia inventata per i test &amp; nient&#39;altro.<br><br>\nSecondo paragrafo<script>alert("x")</script> con <i>corsivo</i><img src=x onerror="alert(1)">.',
    genres: ["Avventura", "Fantascienza"],
    studios: { nodes: [{ id: 10, name: "Studio di Prova" }] },
    format: "TV",
    status: "FINISHED",
    episodes: 12,
    duration: 24,
    season: "FALL",
    seasonYear: 2026,
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
