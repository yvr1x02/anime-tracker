const dayKey = (ms: number, timeZone?: string) =>
  new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(ms);

/**
 * "Dati aggiornati alle 15:16." once data is older than its cache (ADR-0003), with the date when it is
 * from another day; null while fresh or when the time is unknown. `fetchedAt` is AniList's `Date` header.
 * `timeZone` is only passed by tests: the app uses the browser's own.
 */
export function dataFreshnessMessage(
  fetchedAt: string | null,
  maxAgeSeconds: number,
  nowMs: number,
  timeZone?: string,
): string | null {
  const fetchedMs = fetchedAt ? Date.parse(fetchedAt) : NaN;
  if (!(nowMs - fetchedMs > maxAgeSeconds * 1000)) return null;

  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone }).format(fetchedMs);
  if (dayKey(fetchedMs, timeZone) === dayKey(nowMs, timeZone)) return `Dati aggiornati alle ${time}.`;
  const date = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone }).format(fetchedMs);
  return `Dati aggiornati al ${date} alle ${time}.`;
}
