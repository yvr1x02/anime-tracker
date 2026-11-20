"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CoverImage } from "@/components/cover-image";
import { DataFreshness } from "@/components/data-freshness";
import { toISO } from "@/lib/airing";
import { animeTitle } from "@/lib/anime-labels";
import type { ScheduledEpisode } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import {
  MAX_WEEKS_AHEAD,
  addDays,
  columnLabel,
  currentMonday,
  dayLabel,
  groupByDay,
  localDate,
  weekRangeLabel,
} from "@/lib/week";

const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const weeksBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / (7 * 24 * 3600 * 1000));

type Props = {
  monday: string;
  /** Whether ?settimana= was given; without it the server used the UTC week. */
  asked: boolean;
  episodes: ScheduledEpisode[];
  fetchedAt: string | null;
  maxAgeSeconds: number;
};

/**
 * Monday to Sunday in the viewer's time zone (docs/DESIGN.md, "Calendario"): seven columns from 1024px, a list of
 * days below, starting today in the current week. Days and times exist only in the browser.
 */
export function WeekCalendar({ monday, asked, episodes, fetchedAt, maxAgeSeconds }: Props) {
  const router = useRouter();
  const now = useNow();
  const thisMonday = now === null ? null : currentMonday(now);
  const ahead = thisMonday === null ? 0 : weeksBetween(thisMonday, monday);
  // The server's guess (UTC) or the asked week doesn't fit this viewer: go to the right one.
  const misplaced = thisMonday !== null && ((!asked && monday !== thisMonday) || ahead < 0 || ahead > MAX_WEEKS_AHEAD);

  useEffect(() => {
    if (misplaced && thisMonday) router.replace(`/calendario?settimana=${thisMonday}`);
  }, [misplaced, thisMonday, router]);

  const today = now === null ? null : localDate(now);

  return (
    <>
      <p className="mt-2 text-h3 text-ink-muted">{weekRangeLabel(monday)}</p>
      <p className="mt-2 min-h-[1.5em] text-small text-ink-muted">
        {now !== null &&
          `Messa in onda in Giappone, nel fuso del tuo browser (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}
      </p>

      {now === null || misplaced ? (
        <WaitingWeek />
      ) : (
        <ol className="mt-6 grid gap-6 lg:grid-cols-7 lg:gap-3">
          {groupByDay(episodes, monday).map(({ date, episodes: day }) => {
            const isToday = date === today;
            const past = today !== null && date < today;
            const firstUpcoming = day.findIndex((episode) => episode.airingAt * 1000 > now);
            return (
              <li
                key={date}
                // Phones list the current week from today: earlier days only appear in the columns.
                className={`${past ? "hidden lg:block" : ""} ${isToday ? "calendar-today" : ""} rounded-panel lg:p-2`}
              >
                <section aria-labelledby={`giorno-${date}`}>
                  <h2 id={`giorno-${date}`} className="text-small font-semibold">
                    <span className="lg:hidden">{dayLabel(date, today!)}</span>
                    <span className="hidden lg:inline">
                      {columnLabel(date)}
                      {isToday && " · Oggi"}
                    </span>
                  </h2>
                  {day.length === 0 ? (
                    <p className="mt-2 text-small text-ink-muted">Nessun episodio</p>
                  ) : (
                    <ol className="mt-2 flex flex-col">
                      {day.map((episode, index) => (
                        <EpisodeRow
                          key={episode.id}
                          episode={episode}
                          aired={episode.airingAt * 1000 <= now}
                          nowMark={isToday && index === firstUpcoming && firstUpcoming > 0}
                        />
                      ))}
                    </ol>
                  )}
                </section>
              </li>
            );
          })}
        </ol>
      )}

      <nav aria-label="Settimane" className="mt-8 flex flex-wrap gap-3">
        {ahead > 0 && (
          <Link href="/calendario" className="button inline-flex items-center">
            Torna a questa settimana
          </Link>
        )}
        {ahead < MAX_WEEKS_AHEAD && (
          <Link href={`/calendario?settimana=${addDays(monday, 7)}`} className="button inline-flex items-center">
            Settimana successiva <span aria-hidden="true">&nbsp;→</span>
          </Link>
        )}
      </nav>
      <div className="mt-6">
        <DataFreshness fetchedAt={fetchedAt} maxAgeSeconds={maxAgeSeconds} />
      </div>
    </>
  );
}

function EpisodeRow({ episode, aired, nowMark }: { episode: ScheduledEpisode; aired: boolean; nowMark: boolean }) {
  const title = animeTitle(episode.media.title);
  return (
    <>
      {/* Visual only: "già uscito" already tells screen readers which side of now an episode is. */}
      {nowMark && (
        <li aria-hidden="true" className="now-mark">
          Adesso
        </li>
      )}
      <li>
        <Link
          href={`/anime/${episode.media.id}`}
          className={`calendar-row rounded-control py-1.5 text-small ${aired ? "text-ink-muted" : ""}`}
        >
          <time dateTime={toISO(episode.airingAt)} className="[grid-area:time] tabular-nums">
            {time.format(episode.airingAt * 1000)}
          </time>
          <CoverImage
            cover={{ medium: episode.media.coverImage?.medium ?? null, large: null, extraLarge: null }}
            title={title}
            sizes="2rem"
            className="rounded-[0.25rem] text-small [grid-area:cover]"
          />
          <span className="min-w-0 [grid-area:text]">
            {aired && <span className="sr-only">Già uscito: </span>}
            <span className="line-clamp-2 font-medium">{title}</span>{" "}
            <span className="tabular-nums">Ep. {episode.episode}</span>
          </span>
        </Link>
      </li>
    </>
  );
}

/** Same rough shape as the days, until the browser knows its date and time zone. */
function WaitingWeek() {
  return (
    <div aria-busy="true" className="mt-6">
      <p className="sr-only">Caricamento…</p>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-7 lg:gap-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-4 w-16 rounded-control bg-raised" />
            <div className="h-10 rounded-control bg-raised" />
            <div className="h-10 rounded-control bg-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}
