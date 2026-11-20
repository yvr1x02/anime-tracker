import { describe, expect, it } from "vitest";
import type { MediaFormat, MediaListStatus, MediaStatus } from "@/gql/graphql";
import type { ListEntry } from "./list";
import { TIME_OPTIONS, type TimeOption, formatMinutes, inListSince, tonightCandidates, tonightPages } from "./tonight";

const now = Date.parse("2026-11-20T20:00:00Z");
const DAY = 24 * 3600;
const nowSeconds = now / 1000;
const [min30, hour1, hours2, evening] = TIME_OPTIONS;

type Options = {
  status: MediaListStatus;
  progress?: number;
  updatedAt?: number;
  createdAt?: number;
  media: { status: MediaStatus; episodes: number | null; duration: number | null; format?: MediaFormat; next?: number };
};

let nextId = 1;
function entry(title: string, { status, progress = 0, updatedAt = 0, createdAt = 0, media }: Options): ListEntry {
  const id = nextId++;
  return {
    id,
    status,
    progress,
    score: 0,
    notes: null,
    updatedAt,
    createdAt,
    startedAt: null,
    completedAt: null,
    media: {
      id,
      isAdult: false,
      status: media.status,
      title: { romaji: title, english: null, native: null },
      coverImage: null,
      format: media.format ?? "TV",
      season: null,
      seasonYear: null,
      episodes: media.episodes,
      duration: media.duration,
      // The next episode airs tomorrow: the ones before are out.
      nextAiringEpisode: media.next ? { episode: media.next, airingAt: nowSeconds + DAY } : null,
    },
  };
}

const reasons = (time: TimeOption, list: ListEntry[]) =>
  tonightCandidates(list, time, now).map(({ entry: e, kind, reason }) => [e.media.title?.romaji, kind, reason]);

// A list with every kind: what each time choice makes of it.
const list = [
  entry("Quasi finita", { status: "CURRENT", progress: 11, updatedAt: 100, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
  entry("In corso", { status: "CURRENT", progress: 3, updatedAt: 300, media: { status: "RELEASING", episodes: 24, duration: 24, next: 8 } }),
  entry("Da recuperare", { status: "REPEATING", progress: 10, updatedAt: 200, media: { status: "FINISHED", episodes: 50, duration: 24 } }),
  entry("Film", { status: "PLANNING", createdAt: nowSeconds - 200 * DAY, media: { status: "FINISHED", episodes: 1, duration: 110, format: "MOVIE" } }),
  entry("OVA corta", { status: "PLANNING", createdAt: nowSeconds - 40 * DAY, media: { status: "FINISHED", episodes: 2, duration: 25, format: "OVA" } }),
  entry("Serie nuova", { status: "PLANNING", createdAt: nowSeconds - 400 * DAY, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
  entry("In pausa", { status: "PAUSED", progress: 2, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
  entry("Non ancora uscito", { status: "PLANNING", media: { status: "NOT_YET_RELEASED", episodes: 12, duration: 24, next: 1 } }),
  entry("Senza durata", { status: "CURRENT", progress: 1, media: { status: "FINISHED", episodes: 12, duration: null } }),
];

describe("tonightCandidates", () => {
  it("30 minuti: one episode of each thing being watched, starts of what is to watch", () => {
    expect(reasons(min30, list)).toEqual([
      ["Quasi finita", 1, "Ti manca 1 episodio: 24 minuti"],
      ["In corso", 2, "Sei indietro di 4 episodi: stasera 1, 24 minuti"],
      ["Da recuperare", 3, "Ti mancano 40 episodi: stasera 1, 24 minuti"],
      ["Serie nuova", 5, "Comincia: 1 episodio in 24 minuti"],
      ["OVA corta", 5, "Comincia: 1 episodio in 25 minuti"],
    ]);
  });

  it("1 ora: the short OVA fits whole", () => {
    expect(reasons(hour1, list)).toEqual([
      ["Quasi finita", 1, "Ti manca 1 episodio: 24 minuti"],
      ["In corso", 2, "Sei indietro di 4 episodi: stasera 2, 48 minuti"],
      ["Da recuperare", 3, "Ti mancano 40 episodi: stasera 2, 48 minuti"],
      ["OVA corta", 4, "2 episodi in 50 minuti: stanno nella tua ora"],
      ["Serie nuova", 5, "Comincia: 2 episodi in 48 minuti"],
    ]);
  });

  it("2 ore: the film fits, and the oldest in the list comes first among Da vedere", () => {
    expect(reasons(hours2, list)).toEqual([
      ["Quasi finita", 1, "Ti manca 1 episodio: 24 minuti"],
      ["In corso", 2, "Sei indietro di 4 episodi: 1 ora e 36 minuti"],
      ["Da recuperare", 3, "Ti mancano 40 episodi: stasera 5, 2 ore"],
      ["Film", 4, "Film di 1 ora e 50 minuti: sta nelle tue 2 ore"],
      ["OVA corta", 4, "2 episodi in 50 minuti: stanno nelle tue 2 ore"],
      ["Serie nuova", 5, "Comincia: 5 episodi in 2 ore"],
    ]);
  });

  it("serata intera (180 minuti)", () => {
    expect(reasons(evening, list)).toEqual([
      ["Quasi finita", 1, "Ti manca 1 episodio: 24 minuti"],
      ["In corso", 2, "Sei indietro di 4 episodi: 1 ora e 36 minuti"],
      ["Da recuperare", 3, "Ti mancano 40 episodi: stasera 7, 2 ore e 48 minuti"],
      ["Film", 4, "Film di 1 ora e 50 minuti: sta nella tua serata"],
      ["OVA corta", 4, "2 episodi in 50 minuti: stanno nella tua serata"],
      ["Serie nuova", 5, "Comincia: 7 episodi in 2 ore e 48 minuti"],
    ]);
  });

  it("finishes a series tonight when everything left is out and fits", () => {
    const series = entry("Tre alla fine", { status: "CURRENT", progress: 9, media: { status: "FINISHED", episodes: 12, duration: 24 } });
    expect(reasons(hour1, [series])).toEqual([["Tre alla fine", 3, "Ti mancano 3 episodi: stasera 2, 48 minuti"]]);
    expect(reasons(hours2, [series])).toEqual([["Tre alla fine", 1, "Ti mancano 3 episodi: la finisci in 1 ora e 12 minuti"]]);
  });

  it("says since when a Da vedere title is in the list", () => {
    const [film] = tonightCandidates(list, hours2, now).filter((s) => s.kind === 4);
    expect(film.since).toBe("È nella tua lista da 6 mesi");
  });

  it("leaves out what is too long, paused, not out yet or without a duration", () => {
    expect(reasons({ ...min30, minutes: 20 }, list)).toEqual([]);
  });
});

describe("tonightPages", () => {
  it("first the best of each kind in priority order, then the rest 3 at a time", () => {
    const pages = tonightPages(tonightCandidates(list, hours2, now)).map((page) =>
      page.map((s) => s.entry.media.title?.romaji),
    );
    expect(pages).toEqual([
      ["Quasi finita", "In corso", "Da recuperare"],
      ["Film", "OVA corta", "Serie nuova"],
    ]);
  });

  it("fills the first page from any kind when kinds are fewer than 3", () => {
    const planning = [
      entry("A", { status: "PLANNING", createdAt: 10, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
      entry("B", { status: "PLANNING", createdAt: 20, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
      entry("C", { status: "PLANNING", createdAt: 30, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
      entry("D", { status: "PLANNING", createdAt: 40, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
    ];
    const pages = tonightPages(tonightCandidates(planning, hour1, now)).map((page) =>
      page.map((s) => s.entry.media.title?.romaji),
    );
    expect(pages).toEqual([["A", "B", "C"], ["D"]]);
  });

  it("shows a filler of a higher kind before a lower kind's best", () => {
    const mixed = [
      entry("Da recuperare A", { status: "CURRENT", progress: 1, updatedAt: 300, media: { status: "FINISHED", episodes: 50, duration: 24 } }),
      entry("Da recuperare B", { status: "CURRENT", progress: 1, updatedAt: 200, media: { status: "FINISHED", episodes: 50, duration: 24 } }),
      entry("Da cominciare", { status: "PLANNING", createdAt: 10, media: { status: "FINISHED", episodes: 12, duration: 24 } }),
    ];
    const [first] = tonightPages(tonightCandidates(mixed, min30, now));
    expect(first.map((s) => s.entry.media.title?.romaji)).toEqual(["Da recuperare A", "Da recuperare B", "Da cominciare"]);
  });

  it("has no pages without candidates", () => {
    expect(tonightPages([])).toEqual([]);
  });
});

describe("formatMinutes", () => {
  it.each([
    [1, "1 minuto"],
    [24, "24 minuti"],
    [60, "1 ora"],
    [61, "1 ora e 1 minuto"],
    [72, "1 ora e 12 minuti"],
    [120, "2 ore"],
    [168, "2 ore e 48 minuti"],
  ])("%s → %s", (minutes, text) => {
    expect(formatMinutes(minutes)).toBe(text);
  });
});

describe("inListSince", () => {
  it.each([
    [10, "È nella tua lista da meno di un mese"],
    [31, "È nella tua lista da 1 mese"],
    [150, "È nella tua lista da 4 mesi"],
    [400, "È nella tua lista da 13 mesi"],
  ])("%s days ago → %s", (days, text) => {
    expect(inListSince(nowSeconds - days * DAY, now)).toBe(text);
  });

  it("is null without a date", () => {
    expect(inListSince(null, now)).toBeNull();
  });
});
