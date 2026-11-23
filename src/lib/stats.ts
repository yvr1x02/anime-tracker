import type { MediaListStatus } from "@/gql/graphql";
import { genreLabel, listStatusLabel } from "./anime-labels";
import type { ListEntry } from "./list";

type StatsEntry = Pick<ListEntry, "status" | "progress" | "score"> & {
  media: Pick<ListEntry["media"], "duration" | "genres" | "studios">;
};

export type Ranked = { name: string; count: number };

export type ListStats = {
  byStatus: { status: MediaListStatus; count: number }[];
  episodes: number;
  minutes: number;
  /** Anime with episodes seen but no duration on AniList, left out of the minutes. */
  withoutDuration: number;
  /** Mean of the scores that are set, or null when none is. */
  averageScore: number | null;
  scores: number[];
  genres: Ranked[];
  studios: Ranked[];
};

/** SPEC, "Statistiche": the 1–10 bar of a score, 8,0–8,9 in bar 8; null for no score (0). */
export function scoreBar(score: number | null): number | null {
  return score && score >= 1 ? Math.min(10, Math.floor(score)) : null;
}

/** How many anime per bar: index 0 is score 1, index 9 is score 10. */
export function scoreCounts(entries: readonly Pick<StatsEntry, "score">[]): number[] {
  const counts = Array<number>(10).fill(0);
  for (const entry of entries) {
    const bar = scoreBar(entry.score);
    if (bar) counts[bar - 1]++;
  }
  return counts;
}

/** The ?voto= filter of La mia lista: a whole score from 1 to 10, anything else is ignored. */
export function parseScoreFilter(value: string | string[] | null | undefined): number | null {
  return typeof value === "string" && /^(10|[1-9])$/.test(value) ? Number(value) : null;
}

const collator = new Intl.Collator("it-IT");

/** The first `limit` names by count, ties in alphabetical order of what the page shows. */
function top(names: Iterable<string>, limit: number, label = (name: string) => name): Ranked[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || collator.compare(label(a.name), label(b.name)))
    .slice(0, limit);
}

/** The Statistiche page, from the list already read (SPEC). */
export function listStats(entries: readonly StatsEntry[]): ListStats {
  const statuses = Object.keys(listStatusLabel) as MediaListStatus[];
  // "Most watched" counts every entry but Da vedere: an anime never started was not watched (SPEC).
  const watched = entries.filter((entry) => entry.status !== "PLANNING");
  const scored = entries.map((entry) => entry.score ?? 0).filter((score) => score > 0);

  let episodes = 0;
  let minutes = 0;
  let withoutDuration = 0;
  for (const entry of entries) {
    const progress = entry.progress ?? 0;
    episodes += progress;
    if (progress === 0) continue;
    if (entry.media.duration) minutes += progress * entry.media.duration;
    else withoutDuration++;
  }

  return {
    byStatus: statuses.map((status) => ({ status, count: entries.filter((entry) => entry.status === status).length })),
    episodes,
    minutes,
    withoutDuration,
    averageScore: scored.length ? scored.reduce((sum, score) => sum + score, 0) / scored.length : null,
    scores: scoreCounts(entries),
    // AniList's genre names: the page shows genreLabel, and genreLang for the ones without a translation.
    genres: top(
      watched.flatMap((entry) => (entry.media.genres ?? []).filter((genre) => genre !== null)),
      10,
      genreLabel,
    ),
    // Animation studios only: in a list AniList's isMain also lets publishers and broadcasters through.
    studios: top(
      watched.flatMap((entry) =>
        (entry.media.studios?.nodes ?? []).flatMap((studio) => (studio?.isAnimationStudio ? [studio.name] : [])),
      ),
      5,
    ),
  };
}
