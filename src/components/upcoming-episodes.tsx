"use client";

import {
  type AiringEpisode,
  MAX_UPCOMING,
  formatAiringDate,
  formatAiringDistance,
  formatNextAiring,
  toISO,
  upcomingEpisodes,
} from "@/lib/airing";
import { useNow } from "@/lib/use-now";

type Schedule = readonly (AiringEpisode | null)[] | null | undefined;

const row = "grid grid-cols-[5rem_1fr_auto] items-baseline gap-4 border-b border-border py-3 tabular-nums";

/** "Prossimi episodi" in the detail page, in the viewer's time zone (docs/DESIGN.md). */
export function UpcomingEpisodes({ schedule }: { schedule: Schedule }) {
  const now = useNow();
  const episodes = now === null ? [] : upcomingEpisodes(schedule, now);
  const waiting = now === null && (schedule?.length ?? 0) > 0;

  return (
    <section aria-labelledby="prossimi-episodi">
      <h2 id="prossimi-episodi" className="text-h2">
        Prossimi episodi
      </h2>
      {waiting ? (
        // Same height as the real rows until the browser knows its clock and time zone.
        <div aria-busy="true" className="mt-4">
          <p className="text-small text-ink-muted">Caricamento…</p>
          <ol aria-hidden="true">
            {Array.from({ length: Math.min(schedule?.length ?? 0, MAX_UPCOMING) }, (_, index) => (
              <li key={index} className={row}>
                <span className="h-4 rounded-control bg-raised" />
                <span className="h-4 rounded-control bg-raised" />
              </li>
            ))}
          </ol>
        </div>
      ) : episodes.length === 0 ? (
        <p className="mt-4 text-ink-muted">Nessun episodio in programma.</p>
      ) : (
        <>
          <p className="mt-4 text-small text-ink-muted">
            Messa in onda in Giappone, nel fuso del tuo browser ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
          <ol className="mt-2">
            {episodes.map(({ episode, airingAt }, index) => (
              <li key={episode} className={`${row} ${index === 0 ? "text-cyan" : ""}`}>
                <span className="font-semibold">
                  {index === 0 && <span className="sr-only">Prossimo: </span>}
                  Ep. {episode}
                </span>
                <time dateTime={toISO(airingAt)}>{formatAiringDate(airingAt)}</time>
                <span className="text-small text-ink-muted">{formatAiringDistance(airingAt, now!)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

/** "Ep. 7 · gio 16:30" (with the date beyond a week) in cyan, for the detail header; nothing when no episode is scheduled. */
export function NextEpisode({ schedule }: { schedule: Schedule }) {
  const now = useNow();
  const next = now === null ? undefined : upcomingEpisodes(schedule, now)[0];
  if (!next) return null;

  return (
    <p className="mt-2 text-small text-cyan tabular-nums">
      <span className="sr-only">Prossimo episodio: </span>
      Ep. {next.episode} · <time dateTime={toISO(next.airingAt)}>{formatNextAiring(next.airingAt, now!)}</time>
    </p>
  );
}
