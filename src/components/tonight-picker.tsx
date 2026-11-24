"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { AniListError } from "@/lib/anilist/client";
import { NotLoggedInError } from "@/lib/auth/errors";
import { useViewer } from "@/lib/auth/use-viewer";
import { cardGrid } from "@/lib/card-grid";
import { useDemoList, useMyList } from "@/lib/my-list";
import { TIME_OPTIONS, type TimeOption, tonightCandidates, tonightPages } from "@/lib/tonight";
import { useNow } from "@/lib/use-now";

const proposals = (n: number) => (n === 1 ? "1 proposta" : `${n} proposte`);

/**
 * "Cosa guardo stasera?" (SPEC): pick how much time there is, get up to 3 suggestions from the list with
 * their reasons, and more with Altre proposte. Logged in it uses the session's list (no extra request);
 * without login, the demo profile's list, asked for only once a time is picked.
 */
export function TonightPicker() {
  const viewer = useViewer();
  const loggedIn = viewer === undefined ? undefined : viewer !== null;
  const [time, setTime] = useState<TimeOption | null>(null);
  const [page, setPage] = useState(0);
  // True after "Ricomincia dalle prime", so the live region says the first ones are back.
  const [restarted, setRestarted] = useState(false);
  const mine = useMyList(loggedIn === true);
  const demo = useDemoList(loggedIn === false && time !== null);
  const now = useNow();

  function choose(option: TimeOption) {
    setTime(option);
    goTo(0);
  }

  function goTo(next: number, restart = false) {
    setPage(next);
    setRestarted(restart);
  }

  const view =
    time && loggedIn !== undefined
      ? resultsView({
          time,
          page,
          restarted,
          goTo,
          choose,
          now,
          source: loggedIn ? { kind: "mine", query: mine } : { kind: "demo", query: demo },
        })
      : null;

  return (
    <section aria-labelledby="stasera" className="mt-6">
      {/* Question and times share a line from 1024px: the season's first row must stay within 800px. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 id="stasera" className="text-h2">
          Cosa guardo stasera?
        </h2>
        <div role="group" aria-label="Quanto tempo hai?" className="filter-row min-w-0 lg:mx-0 lg:px-0">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              aria-pressed={time === option}
              onClick={() => choose(option)}
              className="button shrink-0 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-accent"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {view?.before}
      {/* The visible message is the live region itself, there from the first render (one inserted with its text is
          often not announced): seen, announced, and read once. */}
      <p role="status" className={view?.statusClass}>
        {view?.status}
        {view?.extra && <> {view.extra}</>}
      </p>
      {view?.content}
    </section>
  );
}

type Source =
  | { kind: "mine"; query: ReturnType<typeof useMyList> }
  | { kind: "demo"; query: ReturnType<typeof useDemoList> };

/**
 * What follows a time choice: the status, shown and announced by the live region (with `extra` in the same
 * sentence), and what is shown before and after it.
 */
function resultsView({
  time,
  page,
  restarted,
  goTo,
  choose,
  now,
  source,
}: {
  time: TimeOption;
  page: number;
  restarted: boolean;
  goTo: (page: number, restart?: boolean) => void;
  choose: (option: TimeOption) => void;
  now: number | null;
  source: Source;
}): { status: string; statusClass: string; extra?: ReactNode; before?: ReactNode; content?: ReactNode } {
  const { query } = source;
  const login = (text: string) => (
    <Link href="/accesso?da=%2F" className="text-cyan underline underline-offset-2">
      {text}
    </Link>
  );
  const message = (status: string, extra?: ReactNode) => ({ status, statusClass: "mt-4", extra });

  if (query.error instanceof NotLoggedInError) {
    return message("La sessione con AniList è scaduta.", <>{login("Accedi di nuovo")} per avere proposte dalla tua lista.</>);
  }
  if (source.kind === "demo" && query.error instanceof AniListError && query.error.status === 404) {
    return message(
      "La lista dimostrativa non è disponibile in questo momento.",
      <>{login("Accedi con AniList")} per avere proposte dalla tua lista.</>,
    );
  }
  if (query.isError) {
    const status = "Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto.";
    return {
      status,
      statusClass: "mt-4",
      content: (
        <button type="button" onClick={() => query.refetch()} className="button mt-3">
          Riprova
        </button>
      ),
    };
  }
  if (query.isPending || now === null) return { status: "Cerco le proposte…", statusClass: "mt-4 text-ink-muted" };

  const entries = source.kind === "mine" ? source.query.data! : source.query.data!.entries;
  const demoNotice =
    source.kind === "demo" ? (
      <p className="mt-4 text-small text-ink-muted">
        Modalità demo: proposte dalla lista pubblica di {source.query.data!.userName} su AniList.{" "}
        {login("Accedi con AniList")} per usare la tua.
      </p>
    ) : null;
  // The status follows the demo notice, or the times when there is none.
  const afterNotice = demoNotice ? "mt-3" : "mt-4";
  const pages = tonightPages(tonightCandidates(entries, time, now));
  const timeText = time.minutes === 180 ? "la serata intera" : time.label;

  if (pages.length === 0) {
    const next = TIME_OPTIONS[TIME_OPTIONS.indexOf(time) + 1];
    const status =
      entries.length === 0
        ? "La lista è vuota: aggiungi qualcosa dalla Ricerca o dagli anime della stagione."
        : `Niente nella lista sta in ${time.minutes === 180 ? "una serata" : time.label}.`;
    return {
      status,
      statusClass: afterNotice,
      before: demoNotice,
      content: (
        <p className="mt-3 flex flex-wrap items-center gap-3">
          {entries.length > 0 && next && (
            <button type="button" onClick={() => choose(next)} className="button">
              Prova con {next.minutes === 180 ? "la serata intera" : next.label}
            </button>
          )}
          <Link href="/ricerca" className="text-cyan underline underline-offset-2">
            Cerca un anime
          </Link>
        </p>
      ),
    };
  }

  const shown = Math.min(page, pages.length - 1);
  const current = pages[shown];
  const last = shown >= pages.length - 1;
  const more = current.length === 1 ? "Un'altra proposta" : `Altre ${current.length} proposte`;
  const again = current.length === 1 ? "Di nuovo la prima proposta" : `Di nuovo le prime ${current.length} proposte`;
  const status = `${shown > 0 ? more : restarted ? again : proposals(current.length)} per ${timeText}`;

  return {
    status,
    statusClass: `${afterNotice} text-small text-ink-muted`,
    before: demoNotice,
    content: (
      // The id shows the season grid's heading (globals.css), to tell the two grids apart.
      <div id="stasera-proposte">
        <ul className={`${cardGrid} mt-3`}>
          {current.map((suggestion) => (
            <li key={suggestion.entry.id}>
              <AnimeCard anime={suggestion.entry.media} transitionScope="stasera">
                <p className="text-small font-medium text-cyan tabular-nums">{suggestion.reason}</p>
                {suggestion.since && <p className="text-small text-ink-muted">{suggestion.since}</p>}
              </AnimeCard>
            </li>
          ))}
        </ul>
        {/* After the last page the same button starts over, so focus stays on it. With one page it has no use. */}
        {pages.length > 1 && (
          <button type="button" onClick={() => (last ? goTo(0, true) : goTo(shown + 1))} className="button mt-4">
            {last ? "Ricomincia dalle prime" : "Altre proposte"}
          </button>
        )}
      </div>
    ),
  };
}
