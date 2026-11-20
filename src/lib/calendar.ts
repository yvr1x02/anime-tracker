import "server-only";
import { WeekScheduleQuery } from "@/lib/anilist/queries";
import { requestAniListCached } from "@/lib/anilist/server";
import { weekEpisodes } from "@/lib/schedule";
import { weekWindow } from "@/lib/week";

// ADR-0003: a week is the same for everyone and air times can move, so it is cached for an hour.
export const CALENDAR_REVALIDATE_SECONDS = 3600;

/**
 * A week's episodes in one request (ADR-0003, "Calendario"). An answer with an error on any page throws, and an
 * error status is not cached, so the last complete week keeps being served; weekEpisodes refuses a partial one.
 */
export async function readWeek(monday: string) {
  const { data, fetchedAt } = await requestAniListCached(WeekScheduleQuery, weekWindow(monday), CALENDAR_REVALIDATE_SECONDS);
  return { episodes: weekEpisodes(data), fetchedAt };
}
