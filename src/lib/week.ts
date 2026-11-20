// Calendar weeks (SPEC, "Calendario"): Monday to Sunday in the viewer's time zone. Dates are "YYYY-MM-DD"
// strings, worked out with calendar arithmetic, never by adding 24 hours, so daylight saving can't shift them.

const DAY_MS = 24 * 3600 * 1000;
export const MAX_WEEKS_AHEAD = 12;

/** "2026-11-20": the date of an instant in a time zone (the browser's when none is given). */
export function localDate(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(ms);
}

const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** The Monday of a date's week. */
export function mondayOf(date: string): string {
  const weekday = (new Date(toUtc(date)).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  return addDays(date, -weekday);
}

export function currentMonday(nowMs: number, timeZone?: string): string {
  return mondayOf(localDate(nowMs, timeZone));
}

/** The seven dates of a week. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/**
 * What the server asks AniList for (ADR-0003): from that Monday 00:00 UTC minus 14 hours to the next Monday
 * plus 12 hours, so the week is covered in every time zone, UTC−12 to UTC+14. Unix seconds.
 */
export function weekWindow(monday: string): { from: number; to: number } {
  const start = toUtc(monday);
  return { from: (start - 14 * 3600 * 1000) / 1000, to: (start + 7 * DAY_MS + 12 * 3600 * 1000) / 1000 };
}

/**
 * The ?settimana= value, checked before anything reaches AniList: a real Monday, not in the past and at most
 * 12 weeks ahead. The server only knows UTC, and a viewer's current week can be one week either side of the
 * UTC one, so the window allows that. Null when it's off.
 */
export function parseWeekParam(value: string | undefined | null, utcMonday: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(toUtc(value))) return null;
  if (fromUtc(toUtc(value)) !== value || mondayOf(value) !== value) return null;
  const earliest = addDays(utcMonday, -7);
  const latest = addDays(utcMonday, 7 * (MAX_WEEKS_AHEAD + 1));
  return value >= earliest && value <= latest ? value : null;
}

/** Each day of the week with the episodes airing then in the time zone, soonest first. Others are dropped. */
export function groupByDay<T extends { airingAt: number }>(
  episodes: readonly T[],
  monday: string,
  timeZone?: string,
): { date: string; episodes: T[] }[] {
  const days = weekDays(monday).map((date) => ({ date, episodes: [] as T[] }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const episode of [...episodes].sort((a, b) => a.airingAt - b.airingAt)) {
    byDate.get(localDate(episode.airingAt * 1000, timeZone))?.episodes.push(episode);
  }
  return days;
}

const weekdayDay = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", timeZone: "UTC" });
const weekdayDayMonth = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Column heading: "lun 23". */
export function columnLabel(date: string): string {
  return weekdayDay.format(toUtc(date));
}

/** Day heading in the phone list: "Oggi", "Domani", then "sab 22 nov". */
export function dayLabel(date: string, today: string): string {
  if (date === today) return "Oggi";
  if (date === addDays(today, 1)) return "Domani";
  return weekdayDayMonth.format(toUtc(date));
}

const dayMonth = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });
const dayMonthYear = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "23–29 novembre", "30 novembre – 6 dicembre", "29 dicembre 2026 – 4 gennaio 2027". */
export function weekRangeLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  if (monday.slice(0, 4) !== sunday.slice(0, 4)) {
    return `${dayMonthYear.format(toUtc(monday))} – ${dayMonthYear.format(toUtc(sunday))}`;
  }
  if (monday.slice(0, 7) !== sunday.slice(0, 7)) {
    return `${dayMonth.format(toUtc(monday))} – ${dayMonth.format(toUtc(sunday))}`;
  }
  return `${Number(monday.slice(8))}–${dayMonth.format(toUtc(sunday))}`;
}
