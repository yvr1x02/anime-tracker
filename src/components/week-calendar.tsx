"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import { CoverImage } from "@/components/cover-image";
import { DataFreshness } from "@/components/data-freshness";
import { toISO } from "@/lib/airing";
import { AniListError } from "@/lib/anilist/client";
import { animeTitle } from "@/lib/anime-labels";
import { NotLoggedInError } from "@/lib/auth/errors";
import { useViewer } from "@/lib/auth/use-viewer";
import { calendarListIds } from "@/lib/list";
import { useDemoList, useMyList } from "@/lib/my-list";
import type { ScheduledEpisode } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import {
  MAX_WEEKS_AHEAD,
  addDays,
  currentMonday,
  fullDayLabel,
  groupByDay,
  localDate,
  tabLabel,
  weekRangeLabel,
} from "@/lib/week";

const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const weeksBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / (7 * 24 * 3600 * 1000));
const episodesText = (count: number) => (count === 1 ? "1 episodio" : `${count} episodi`);

/** ?giorno= changes in place: no history entry per day (DESIGN, "Calendario"); useSearchParams follows it. */
function showDay(date: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("giorno", date);
  window.history.replaceState(null, "", url);
}

type Props = {
  monday: string;
  /** Whether ?giorno= was given; without it the server used the UTC week. */
  asked: boolean;
  episodes: ScheduledEpisode[];
  fetchedAt: string | null;
  maxAgeSeconds: number;
};

/**
 * The week one day at a time, Monday to Sunday in the viewer's time zone (docs/DESIGN.md, "Calendario"): a tab
 * per day with its count, then the chosen day's episodes. It opens on today, or on Monday in later weeks.
 * Days and times exist only in the browser.
 */
export function WeekCalendar({ monday, asked, episodes, fetchedAt, maxAgeSeconds }: Props) {
  const router = useRouter();
  const askedDay = useSearchParams().get("giorno");
  const now = useNow();
  const viewer = useViewer();
  const loggedIn = viewer === undefined ? undefined : viewer !== null;
  const [onlyMine, setOnlyMine] = useState(false);
  // The list is read only once the filter is on: the session's own list, or the demo list without login.
  const mine = useMyList(onlyMine && loggedIn === true);
  const demo = useDemoList(onlyMine && loggedIn === false);
  const filter = onlyMine && loggedIn !== undefined ? listFilter(loggedIn ? mine : demo, loggedIn) : null;
  const shown = filter?.ids ? episodes.filter((episode) => filter.ids!.has(episode.media.id)) : episodes;
  const thisMonday = now === null ? null : currentMonday(now);
  const today = now === null ? null : localDate(now);
  const ahead = thisMonday === null ? 0 : weeksBetween(thisMonday, monday);
  // The server's guess (UTC) or the asked day doesn't fit this viewer: go to today.
  const misplaced = thisMonday !== null && ((!asked && monday !== thisMonday) || ahead < 0 || ahead > MAX_WEEKS_AHEAD);

  useEffect(() => {
    if (misplaced && today) router.replace(`/calendario?giorno=${today}`);
  }, [misplaced, today, router]);

  const days = groupByDay(shown, monday);
  const chosen = days.find(({ date }) => date === askedDay) ?? days.find(({ date }) => date === today) ?? days[0];

  /** APG tabs, automatic activation: arrows move and choose at once, wrapping; Home and End go to the ends. */
  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = days.indexOf(chosen);
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: days.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const date = days[(next + days.length) % days.length].date;
    showDay(date);
    document.getElementById(`tab-${date}`)?.focus();
  }

  return (
    <>
      <p className="mt-2 text-h3 text-ink-muted">{weekRangeLabel(monday)}</p>
      <p className="mt-2 min-h-[1.5em] text-small text-ink-muted">
        {now !== null &&
          `Messa in onda in Giappone, nel fuso del tuo browser (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}
      </p>

      <div role="group" aria-label="Quali anime" className="filter-row mt-4">
        {[
          { mine: false, label: "Tutti" },
          { mine: true, label: "Solo la mia lista" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={onlyMine === option.mine}
            onClick={() => setOnlyMine(option.mine)}
            className="button shrink-0 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-accent"
          >
            {option.label}
          </button>
        ))}
      </div>
      {filter?.notice}
      {/* One live region from the first render, saying what the filter left. */}
      <p role="status" className="sr-only">
        {filter?.status ?? ""}
      </p>
      {filter?.message && <div className="mt-4">{filter.message}</div>}

      {now === null || misplaced || (filter && !filter.ids) ? (
        filter?.message ? null : <WaitingWeek />
      ) : (
        <>
          <div role="tablist" aria-label="Giorni della settimana" onKeyDown={onTabKey} className="day-tabs mt-6">
            {days.map(({ date, episodes: list }) => {
              const { weekday, day } = tabLabel(date);
              const selected = date === chosen.date;
              return (
                <button
                  key={date}
                  id={`tab-${date}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="giorno-scelto"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => showDay(date)}
                  className={`day-tab ${date === today ? "day-tab-today" : ""}`}
                >
                  {/* Short on screen; the full name for screen readers, so no aria-label. */}
                  <span aria-hidden="true" className="text-label uppercase">
                    {weekday}
                  </span>
                  <span aria-hidden="true" className="text-h3 tabular-nums">
                    {day}
                  </span>
                  <span aria-hidden="true" className="day-tab-count text-small tabular-nums">
                    {list.length} ep.
                  </span>
                  <span className="sr-only">
                    {fullDayLabel(date)}
                    {date === today && ", oggi"}, {episodesText(list.length)}
                  </span>
                </button>
              );
            })}
          </div>
          <DayPanel
            date={chosen.date}
            episodes={chosen.episodes}
            now={now}
            isToday={chosen.date === today}
            whose={onlyMine ? (loggedIn ? "della tua lista" : "della lista dimostrativa") : null}
          />
        </>
      )}

      <nav aria-label="Settimane" className="mt-8 flex flex-wrap gap-3">
        {ahead > 0 && (
          <Link href="/calendario" className="button inline-flex items-center">
            Torna a questa settimana
          </Link>
        )}
        {ahead < MAX_WEEKS_AHEAD && (
          <Link href={`/calendario?giorno=${addDays(monday, 7)}`} className="button inline-flex items-center">
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

/** The chosen day's episodes; today with aired ones muted and the Adesso mark before the first to come. */
function DayPanel({
  date,
  episodes,
  now,
  isToday,
  whose,
}: {
  date: string;
  episodes: ScheduledEpisode[];
  now: number;
  isToday: boolean;
  /** "della tua lista" when the filter is on. */
  whose: string | null;
}) {
  const firstUpcoming = episodes.findIndex((episode) => episode.airingAt * 1000 > now);
  return (
    // APG: a panel with nothing focusable in it is a tab stop itself.
    <section role="tabpanel" id="giorno-scelto" aria-labelledby={`tab-${date}`} tabIndex={episodes.length ? undefined : 0} className="mt-6">
      <h2 className="text-h2">{fullDayLabel(date)}</h2>
      {episodes.length === 0 ? (
        <p className="mt-4 text-ink-muted">Nessun episodio in questo giorno{whose && ` degli anime ${whose}`}.</p>
      ) : (
        <ol className="calendar-day mt-4">
          {episodes.map((episode, index) => (
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
        <Link href={`/anime/${episode.media.id}`} className={`calendar-row ${aired ? "text-ink-muted" : ""}`}>
          <CoverImage
            cover={{ medium: episode.media.coverImage?.medium ?? null, large: episode.media.coverImage?.large ?? null, extraLarge: null }}
            title={title}
            sizes="(min-width: 1024px) 7.5rem, 6rem"
            className="rounded-[0.5rem] text-h2"
          />
          <span className="flex min-w-0 flex-col gap-1">
            <time dateTime={toISO(episode.airingAt)} className="text-h3 tabular-nums">
              {time.format(episode.airingAt * 1000)}
            </time>
            <span>
              {aired && <span className="sr-only">Già uscito: </span>}
              <span className="line-clamp-2 font-medium">{title}</span>{" "}
              <span className={`text-small tabular-nums ${aired ? "" : "text-ink-muted"}`}>Ep. {episode.episode}</span>
            </span>
          </span>
        </Link>
      </li>
    </>
  );
}

/** Same rough shape as the tabs and rows, until the browser knows its date and time zone. */
function WaitingWeek() {
  return (
    <div aria-busy="true" className="mt-6">
      <p className="sr-only">Caricamento…</p>
      <div aria-hidden="true">
        <div className="day-tabs">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="h-16 rounded-control bg-raised" />
          ))}
        </div>
        <div className="mt-6 h-9 w-64 max-w-full rounded-control bg-raised" />
        <div className="calendar-day mt-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-40 rounded-panel bg-raised" />
          ))}
        </div>
      </div>
    </div>
  );
}

type ListQuery = ReturnType<typeof useMyList> | ReturnType<typeof useDemoList>;

/**
 * "Solo la mia lista": the ids to keep once the list is there, or what to say meanwhile (loading, ended
 * session, demo list missing, AniList down). Without login it is the demo list, with its notice.
 */
function listFilter(
  query: ListQuery,
  loggedIn: boolean,
): { ids?: Set<number>; status: string; message?: ReactNode; notice?: ReactNode } {
  const login = (text: string) => (
    <Link href="/accesso?da=%2Fcalendario" className="text-cyan underline underline-offset-2">
      {text}
    </Link>
  );
  if (query.error instanceof NotLoggedInError) {
    const status = "La sessione con AniList è scaduta.";
    return { status, message: <p>{status} {login("Accedi di nuovo")} per filtrare la tua lista.</p> };
  }
  if (!loggedIn && query.error instanceof AniListError && query.error.status === 404) {
    const status = "La lista dimostrativa non è disponibile in questo momento.";
    return { status, message: <p>{status} {login("Accedi con AniList")} per filtrare la tua lista.</p> };
  }
  if (query.isError) {
    const status = "Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto.";
    return {
      status,
      message: (
        <>
          <p>{status}</p>
          <button type="button" onClick={() => query.refetch()} className="button mt-3">
            Riprova
          </button>
        </>
      ),
    };
  }
  if (query.isPending) return { status: "Leggo la lista…" };

  const data = query.data;
  const entries = Array.isArray(data) ? data : data.entries;
  const ids = calendarListIds(entries);
  const notice =
    !loggedIn && !Array.isArray(data) ? (
      <p className="mt-3 text-small text-ink-muted">
        Modalità demo: episodi degli anime nella lista pubblica di {data.userName} su AniList.{" "}
        {login("Accedi con AniList")} per usare la tua.
      </p>
    ) : null;
  return { ids, notice, status: loggedIn ? "Solo gli anime della tua lista." : "Solo gli anime della lista dimostrativa." };
}
