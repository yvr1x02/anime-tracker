import "server-only";
import { WeekScheduleQuery } from "@/lib/anilist/queries";
import { animeTitle } from "@/lib/anime-labels";
import { requestAniListCached } from "@/lib/anilist/server";
import { weekEpisodes } from "@/lib/schedule";
import { addDays, utcCurrentMonday, weekWindow } from "@/lib/week";

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

export type SoonEpisode = { id: number; episode: number; airingAt: number; media: { id: number; title: string } };

/**
 * Episodes for the Home's "In onda ora" (ADR-0003), from the calendar's cached weeks: this UTC week, and the next
 * when the span reaches past it. The browser keeps its own next 24 hours; the span is wider because the Home is
 * cached for 6 hours and the browser's clock can differ from the server's (the e2e tests fix it).
 */
export async function readAiringSoon(): Promise<SoonEpisode[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 12 * 3600;
  const until = now + 36 * 3600;
  const monday = utcCurrentMonday();
  const mondays = until > weekWindow(monday).to ? [monday, addDays(monday, 7)] : [monday];
  const byId = new Map<number, SoonEpisode>();
  for (const { episodes } of await Promise.all(mondays.map(readWeek))) {
    for (const { id, episode, airingAt, media } of episodes) {
      // The week windows overlap by a day: the same episode can come twice.
      if (airingAt >= from && airingAt <= until) byId.set(id, { id, episode, airingAt, media: { id: media.id, title: animeTitle(media.title) } });
    }
  }
  return [...byId.values()].sort((a, b) => a.airingAt - b.airingAt);
}
