import type { WeekScheduleQuery } from "@/gql/graphql";

type Page = NonNullable<WeekScheduleQuery["p1"]>;
type RawEpisode = NonNullable<NonNullable<Page["airingSchedules"]>[number]>;
export type ScheduledEpisode = Omit<RawEpisode, "media"> & { media: NonNullable<RawEpisode["media"]> };

/** A week AniList didn't give whole: never shown, never cached (ADR-0003, "Calendario"). */
export class IncompleteWeekError extends Error {
  constructor(reason: string) {
    super(`Incomplete week: ${reason}`);
    this.name = "IncompleteWeekError";
  }
}

const PAGES = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

/**
 * The week's episodes from the six pages of one answer: every page must be there and the last must not say
 * there are more, or the week is incomplete. Adult anime are left out (SPEC); repeats are dropped.
 */
export function weekEpisodes(data: WeekScheduleQuery): ScheduledEpisode[] {
  const byId = new Map<number, ScheduledEpisode>();
  for (const key of PAGES) {
    const page = data[key];
    if (!page?.airingSchedules || !page.pageInfo) throw new IncompleteWeekError(`page ${key} missing`);
    for (const episode of page.airingSchedules) {
      if (episode?.media && !episode.media.isAdult) byId.set(episode.id, episode as ScheduledEpisode);
    }
  }
  if (data.p6?.pageInfo?.hasNextPage) throw new IncompleteWeekError("more than six pages");
  return [...byId.values()].sort((a, b) => a.airingAt - b.airingAt);
}
