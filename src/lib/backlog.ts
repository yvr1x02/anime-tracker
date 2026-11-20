import type { MediaStatus } from "@/gql/graphql";
import type { ListEntry } from "./list";

type Media = {
  status: MediaStatus | null;
  episodes: number | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
};

/**
 * Episodes out according to AniList (SPEC, "Continua a guardare"): all of them for a finished or cancelled
 * anime; for one airing, the next scheduled episode minus one, or that episode too once its time has passed
 * (the list may be a few hours old). Null when AniList gives neither the next episode nor a total.
 */
export function airedEpisodes(media: Media, nowMs: number): number | null {
  if (media.status === "FINISHED" || media.status === "CANCELLED") return media.episodes;
  if (media.status !== "RELEASING" || !media.nextAiringEpisode) return null;
  const { episode, airingAt } = media.nextAiringEpisode;
  const aired = airingAt * 1000 <= nowMs ? episode : episode - 1;
  return media.episodes ? Math.min(aired, media.episodes) : aired;
}

/** Episodes out and not seen yet: 0 when none, or when AniList's data can't tell. */
export function episodesBehind(entry: { progress: number | null; media: Media }, nowMs: number): number {
  const aired = airedEpisodes(entry.media, nowMs);
  return aired === null ? 0 : Math.max(0, aired - (entry.progress ?? 0));
}

/** "Sei indietro di 2 episodi" while it airs, "Ti mancano 2 episodi" once it has ended; singular for one. */
export function backlogText(behind: number, status: MediaStatus | null): string {
  const episodes = behind === 1 ? "1 episodio" : `${behind} episodi`;
  if (status === "RELEASING") return `Sei indietro di ${episodes}`;
  return behind === 1 ? "Ti manca 1 episodio" : `Ti mancano ${episodes}`;
}

export const MAX_CONTINUE = 6;

/** Watching or rewatching, with episodes to catch up on, newest change first, at most 6. */
export function continueWatching(entries: ListEntry[], nowMs: number): { entry: ListEntry; behind: number }[] {
  return entries
    .filter((entry) => entry.status === "CURRENT" || entry.status === "REPEATING")
    .map((entry) => ({ entry, behind: episodesBehind(entry, nowMs) }))
    .filter(({ behind }) => behind > 0)
    .sort((a, b) => (b.entry.updatedAt ?? 0) - (a.entry.updatedAt ?? 0))
    .slice(0, MAX_CONTINUE);
}
