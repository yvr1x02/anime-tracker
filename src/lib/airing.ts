export type AiringEpisode = { episode: number; airingAt: number };

export const MAX_UPCOMING = 4;

/**
 * Episodes still to air at `nowMs`, soonest first. Cached data can be up to an hour old, so episodes
 * that aired since are dropped here, in the browser. AniList does not guarantee the order.
 */
export function upcomingEpisodes(
  nodes: readonly (AiringEpisode | null)[] | null | undefined,
  nowMs: number,
): AiringEpisode[] {
  return (nodes ?? [])
    .filter((node): node is AiringEpisode => node !== null && node.airingAt * 1000 > nowMs)
    .sort((a, b) => a.airingAt - b.airingAt)
    .slice(0, MAX_UPCOMING);
}

/** "mer 26 nov, 16:30". `timeZone` is only passed by tests: the app uses the browser's own. */
export function formatAiringDate(airingAt: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(airingAt * 1000);
}

/** "mer 16:30", for compact places such as the header. */
export function formatAiringShort(airingAt: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(
    airingAt * 1000,
  );
}

// Within 6 days a bare weekday can't be mistaken for a nearer one.
const withinSixDays = (airingAt: number, nowMs: number) => airingAt * 1000 - nowMs < 6 * 24 * 3600 * 1000;

/** Weekday and time only within 6 days, then the date too: "dom 3 gen, 15:16". For the detail header. */
export function formatNextAiring(airingAt: number, nowMs: number, timeZone?: string): string {
  return withinSixDays(airingAt, nowMs) ? formatAiringShort(airingAt, timeZone) : formatAiringDate(airingAt, timeZone);
}

/** Card badge: "mer 16:30" within 6 days, then only the date, "3 gen", so it stays on one line. */
export function formatCardAiring(airingAt: number, nowMs: number, timeZone?: string): string {
  if (withinSixDays(airingAt, nowMs)) return formatAiringShort(airingAt, timeZone);
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone }).format(airingAt * 1000);
}

const relative = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

/** "tra 45 minuti", "tra 2 ore", "tra 7 giorni". */
export function formatAiringDistance(airingAt: number, nowMs: number): string {
  const minutes = Math.round((airingAt * 1000 - nowMs) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export function toISO(airingAt: number): string {
  return new Date(airingAt * 1000).toISOString();
}
