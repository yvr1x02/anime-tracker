import type { ListEntryFieldsFragment, UserAnimeListQuery } from "@/gql/graphql";
import { formatScore } from "./score";

export type ListEntry = ListEntryFieldsFragment & { media: NonNullable<ListEntryFieldsFragment["media"]> };
/** An anime as a card knows it: everything a list entry has but genres and studios, which only the list reads. */
export type CardMedia = Omit<ListEntry["media"], "genres" | "studios">;

/**
 * All entries of a list, once each, newest change first. An entry can sit both in its status list and in
 * custom lists, or only in a custom list when hidden from status lists: taking every group and dropping
 * repeats keeps all of them. Adult anime are left out, as everywhere in the app (SPEC).
 */
export function listEntries(collection: UserAnimeListQuery["MediaListCollection"]): ListEntry[] {
  const byId = new Map<number, ListEntry>();
  for (const group of collection?.lists ?? []) {
    for (const entry of group?.entries ?? []) {
      if (entry?.media && !entry.media.isAdult && !byId.has(entry.id)) byId.set(entry.id, entry as ListEntry);
    }
  }
  return [...byId.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/**
 * "5 visti · voto 8,5" under the card's "12 episodi"; "5 episodi visti" when the card shows no total.
 * The score only when there is one.
 */
export function entrySummary(entry: Pick<ListEntry, "progress" | "score"> & { media: { episodes: number | null } }) {
  const progress = entry.progress ?? 0;
  const seen = entry.media.episodes
    ? `${progress} ${progress === 1 ? "visto" : "visti"}`
    : `${progress} ${progress === 1 ? "episodio visto" : "episodi visti"}`;
  return entry.score ? `${seen} · voto ${formatScore(entry.score)}` : seen;
}

/** SPEC, "Calendario": the statuses that make an anime part of "la mia lista" for the calendar's filter. */
const CALENDAR_STATUSES = new Set(["CURRENT", "REPEATING", "PLANNING", "PAUSED"]);

/** Ids of the anime the calendar's "Solo la mia lista" keeps: watching, rewatching, to watch or paused. */
export function calendarListIds(entries: readonly ListEntry[]): Set<number> {
  return new Set(entries.filter((entry) => entry.status && CALENDAR_STATUSES.has(entry.status)).map((entry) => entry.media.id));
}
