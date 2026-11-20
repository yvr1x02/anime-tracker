import { airedEpisodes, episodesBehind } from "./backlog";
import type { ListEntry } from "./list";

/** The time choices of "Cosa guardo stasera?" (SPEC): the whole evening is 180 minutes. */
export const TIME_OPTIONS = [
  { minutes: 30, label: "30 minuti", fits: "nei tuoi 30 minuti" },
  { minutes: 60, label: "1 ora", fits: "nella tua ora" },
  { minutes: 120, label: "2 ore", fits: "nelle tue 2 ore" },
  { minutes: 180, label: "Serata intera", fits: "nella tua serata" },
] as const;

export type TimeOption = (typeof TIME_OPTIONS)[number];

/**
 * Kinds in priority order (SPEC): 1 finish it tonight, 2 catch up with an airing anime, 3 a finished series
 * to catch up on, 4 something in Da vedere that fits entirely, 5 something in Da vedere to start.
 */
export type Kind = 1 | 2 | 3 | 4 | 5;

export type Suggestion = {
  entry: ListEntry;
  kind: Kind;
  episodes: number;
  minutes: number;
  reason: string;
  /** "È nella tua lista da 5 mesi", for Da vedere titles. */
  since: string | null;
};

export const PAGE_SIZE = 3;

/** "24 minuti", "1 ora", "1 ora e 12 minuti", "2 ore e 30 minuti". */
export function formatMinutes(total: number): string {
  const minutes = (n: number) => (n === 1 ? "1 minuto" : `${n} minuti`);
  if (total < 60) return minutes(total);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const hoursText = hours === 1 ? "1 ora" : `${hours} ore`;
  return rest === 0 ? hoursText : `${hoursText} e ${minutes(rest)}`;
}

const episodesText = (n: number) => (n === 1 ? "1 episodio" : `${n} episodi`);

const DAY_MS = 24 * 3600 * 1000;
const MONTH_MS = 30.44 * DAY_MS;

/** "È nella tua lista da 5 mesi"; null when AniList gives no date. */
export function inListSince(createdAt: number | null, nowMs: number): string | null {
  if (!createdAt) return null;
  const months = Math.floor((nowMs - createdAt * 1000) / MONTH_MS);
  if (months < 1) return "È nella tua lista da meno di un mese";
  return `È nella tua lista da ${months === 1 ? "1 mese" : `${months} mesi`}`;
}

/** Every candidate for the time given, in the full order: kind, then the kind's own tie-break. */
export function tonightCandidates(entries: ListEntry[], time: TimeOption, nowMs: number): Suggestion[] {
  const limit = time.minutes;
  const candidates: Suggestion[] = [];

  for (const entry of entries) {
    const { media } = entry;
    const duration = media.duration;
    const aired = airedEpisodes(media, nowMs);
    if (!duration || duration <= 0 || !aired) continue;
    const fit = Math.floor(limit / duration);
    const progress = entry.progress ?? 0;
    const push = (kind: Kind, episodes: number, reason: string, since: string | null = null) =>
      candidates.push({ entry, kind, episodes, minutes: episodes * duration, reason, since });

    if (entry.status === "CURRENT" || entry.status === "REPEATING") {
      const behind = episodesBehind(entry, nowMs);
      if (behind === 0 || fit === 0) continue;
      const remaining = media.episodes ? media.episodes - progress : null;
      const allOut = remaining !== null && behind === remaining;
      if (allOut && behind <= fit) {
        const minutes = formatMinutes(behind * duration);
        push(1, behind, behind === 1 ? `Ti manca 1 episodio: ${minutes}` : `Ti mancano ${behind} episodi: la finisci in ${minutes}`);
      } else if (media.status === "RELEASING") {
        const tonight = Math.min(behind, fit);
        const minutes = formatMinutes(tonight * duration);
        push(
          2,
          tonight,
          tonight === behind
            ? `Sei indietro di ${episodesText(behind)}: ${minutes}`
            : `Sei indietro di ${episodesText(behind)}: stasera ${tonight}, ${minutes}`,
        );
      } else {
        const tonight = Math.min(behind, fit);
        push(3, tonight, `Ti mancano ${episodesText(behind)}: stasera ${tonight}, ${formatMinutes(tonight * duration)}`);
      }
    } else if (entry.status === "PLANNING") {
      const since = inListSince(entry.createdAt, nowMs);
      const total = media.episodes;
      if (total && aired === total && total * duration <= limit) {
        const minutes = formatMinutes(total * duration);
        const reason =
          total === 1
            ? `${media.format === "MOVIE" ? "Film" : "Un episodio"} di ${minutes}: sta ${time.fits}`
            : `${total} episodi in ${minutes}: stanno ${time.fits}`;
        push(4, total, reason, since);
      } else if (fit > 0) {
        const tonight = Math.min(aired, fit);
        push(5, tonight, `Comincia: ${episodesText(tonight)} in ${formatMinutes(tonight * duration)}`, since);
      }
    }
  }

  const title = (s: Suggestion) => s.entry.media.title?.romaji ?? "";
  return candidates.sort(
    (a, b) =>
      a.kind - b.kind ||
      // 1–3: the most recently touched first; 4–5: the one in the list for longest first.
      (a.kind <= 3
        ? (b.entry.updatedAt ?? 0) - (a.entry.updatedAt ?? 0)
        : (a.entry.createdAt ?? Infinity) - (b.entry.createdAt ?? Infinity)) ||
      title(a).localeCompare(title(b)),
  );
}

/**
 * Pages of suggestions: the first holds the best of each kind, in priority order, then the next candidates
 * up to 3; "Altre proposte" walks the rest, 3 at a time, in the full order.
 */
export function tonightPages(candidates: Suggestion[]): Suggestion[][] {
  const first: Suggestion[] = [];
  for (const kind of [1, 2, 3, 4, 5] as const) {
    const best = candidates.find((candidate) => candidate.kind === kind);
    if (best && first.length < PAGE_SIZE) first.push(best);
  }
  for (const candidate of candidates) {
    if (first.length >= PAGE_SIZE) break;
    if (!first.includes(candidate)) first.push(candidate);
  }
  const rest = candidates.filter((candidate) => !first.includes(candidate));
  const pages = first.length > 0 ? [first] : [];
  for (let start = 0; start < rest.length; start += PAGE_SIZE) pages.push(rest.slice(start, start + PAGE_SIZE));
  return pages;
}
