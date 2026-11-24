"use client";

import { useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { EmptyList } from "@/components/empty-list";
import { EditEntryButton, type EditOutcome } from "@/components/entry-editor";
import { useListEditing } from "@/components/list-editing";
import type { MediaListStatus } from "@/gql/graphql";
import { animeTitle, listStatusLabel } from "@/lib/anime-labels";
import { cardGrid } from "@/lib/card-grid";
import { type ListEntry, entrySummary } from "@/lib/list";
import { formatScore } from "@/lib/score";
import { parseScoreFilter, scoreBar } from "@/lib/stats";

const statuses = Object.keys(listStatusLabel) as MediaListStatus[];

/** Drops ?voto= in place, with no history entry (SPEC, "La mia lista"); useSearchParams follows it. */
function clearScoreParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("voto");
  window.history.replaceState(null, "", url);
}

/** "Nessun anime con voto 8 in «Completato»." for whichever filters are on. */
function emptyMessage(status: MediaListStatus | null, score: number | null) {
  const inStatus = status ? ` in «${listStatusLabel[status]}»` : "";
  return score ? `Nessun anime con voto ${score}${inStatus}.` : `Nessun anime${inStatus}.`;
}

/** Why an entry is no longer shown, from what it is now: removed, another status, another score. */
function leaveMessage(entries: ListEntry[], before: ListEntry | undefined, filter: MediaListStatus | null, mediaId: number) {
  const entry = entries.find((item) => item.media.id === mediaId);
  const title = animeTitle((entry ?? before)?.media.title ?? null);
  if (!entry) return `${title}: eliminato dalla lista`;
  if (filter && entry.status !== filter) {
    return `${title}: passato a «${entry.status ? listStatusLabel[entry.status] : "nessuno stato"}»`;
  }
  return entry.score ? `${title}: voto ${formatScore(entry.score)}` : `${title}: voto tolto`;
}

/**
 * A list's cards with the status filters and, from Statistiche's score bars, the ?voto= filter with its label
 * (docs/DESIGN.md, "Pulsanti e filtri"): the two filters add up, and the status counts are on the whole list.
 * `editable` adds the controls of the logged-in user's own list; the demo stays read only.
 */
export function AnimeList({ entries, editable = false }: { entries: ListEntry[]; editable?: boolean }) {
  const [filter, setFilter] = useState<MediaListStatus | null>(null);
  const score = parseScoreFilter(useSearchParams().get("voto"));
  const shown = entries.filter(
    (entry) => (!filter || entry.status === filter) && (!score || scoreBar(entry.score) === score),
  );
  const count = (status: MediaListStatus | null) =>
    status ? entries.filter((entry) => entry.status === status).length : entries.length;

  const [announcement, setAnnouncement] = useState("");
  const statusFilters = useRef<HTMLDivElement>(null);
  // Cards edited here that may leave the list shown, now (a new status) or when AniList answers (completing).
  const mayLeave = useRef(new Set<number>());
  // Cards that had the focus when they were taken off the page, and the order shown before this render.
  const focusedOnRemoval = useRef(new Set<number>());
  const shownBefore = useRef<ListEntry[]>([]);

  /**
   * An edited card that has left the list shown, for whatever reason, as in Continua a guardare: the live region
   * says why, from the entry as it is now, and focus, if it was still in the card, moves to the next card's title
   * or to the list's heading. Nothing when the card stays, for example when the save fails and the entry goes back.
   */
  useLayoutEffect(() => {
    const ids = shown.map((entry) => entry.media.id);
    for (const [position, before] of shownBefore.current.entries()) {
      const id = before.media.id;
      if (ids.includes(id) || !mayLeave.current.has(id)) continue;
      mayLeave.current.delete(id);
      setAnnouncement(leaveMessage(entries, before, filter, id));
      if (!focusedOnRemoval.current.has(id)) continue;
      const next = shownBefore.current.slice(position + 1).find((later) => ids.includes(later.media.id));
      const target = document.getElementById(next ? `lista-${next.media.id}` : "anime-della-lista");
      (target?.querySelector<HTMLElement>("a") ?? target)?.focus();
    }
    focusedOnRemoval.current.clear();
    shownBefore.current = shown;
  }, [entries, filter, shown]);

  if (entries.length === 0) {
    // Focusable: where focus goes when the last entry is removed.
    return (
      <p id="anime-della-lista" tabIndex={-1} className="mt-8 text-ink-muted focus:outline-none">
        <EmptyList own={editable} />
      </p>
    );
  }

  /** The user changing the filters takes cards away on purpose: nothing to say about those. */
  function changeFilter(status: MediaListStatus | null) {
    mayLeave.current.clear();
    setFilter(status);
  }

  /** The label goes away with the filter: focus moves to the status filter in use. */
  function clearScoreFilter() {
    mayLeave.current.clear();
    clearScoreParam();
    statusFilters.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.focus();
    setAnnouncement("Filtro per voto tolto");
  }


  return (
    <>
      {/* Only for screen readers, until focus lands on it after the last card shown leaves. */}
      <h2 id="anime-della-lista" tabIndex={-1} className="sr-only text-h2 focus:not-sr-only focus:mt-8 focus:block">
        Anime della lista
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {score && (
        <button
          type="button"
          aria-label={`Voto ${score}, togli il filtro`}
          onClick={clearScoreFilter}
          className="button mt-8 border-ink bg-ink text-on-accent"
        >
          Voto {score} <span aria-hidden="true">×</span>
        </button>
      )}
      <div ref={statusFilters} role="group" aria-label="Filtra per stato" className={`filter-row ${score ? "mt-3" : "mt-8"}`}>
        {[null, ...statuses].map((status) => (
          <button
            key={status ?? "all"}
            type="button"
            aria-pressed={filter === status}
            onClick={() => changeFilter(status)}
            className="button shrink-0 tabular-nums aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-accent"
          >
            {status ? listStatusLabel[status] : "Tutti"} ({count(status)})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-ink-muted">{emptyMessage(filter, score)}</p>
      ) : (
        <ul className={`${cardGrid} mt-6`}>
          {shown.map((entry) => (
            <li
              key={entry.id}
              id={`lista-${entry.media.id}`}
              // Runs as the card is taken off the page, while it still holds the focus it had.
              ref={(item) => () => {
                if (item?.contains(document.activeElement)) focusedOnRemoval.current.add(entry.media.id);
              }}
            >
              <AnimeCard anime={entry.media}>
                <p className="text-small text-ink-muted tabular-nums">
                  {!filter && entry.status && `${listStatusLabel[entry.status]} · `}
                  {entrySummary(entry)}
                </p>
                {editable && (
                  <EntryControls
                    entry={entry}
                    onAddEpisode={() => mayLeave.current.add(entry.media.id)}
                    onEditDone={(outcome) => {
                      if (outcome) mayLeave.current.add(entry.media.id);
                      return undefined;
                    }}
                  />
                )}
              </AnimeCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** "+1" for what is being watched, and the editor. Above the card's stretched link, so they get the clicks. */
export function EntryControls({
  entry,
  onAddEpisode,
  onEditDone,
}: {
  entry: ListEntry;
  onAddEpisode?: () => void;
  onEditDone?: (outcome: EditOutcome) => (() => void) | undefined;
}) {
  const { addEpisode } = useListEditing();
  const controls = useRef<HTMLDivElement>(null);
  const watching = entry.status === "CURRENT" || entry.status === "REPEATING";
  const more = !entry.media.episodes || (entry.progress ?? 0) < entry.media.episodes;

  return (
    <div ref={controls} className="relative z-10 mt-2 flex flex-wrap gap-2">
      {watching && more && (
        <button
          type="button"
          aria-label={`+1 episodio visto: ${animeTitle(entry.media.title)}`}
          onClick={() => {
            // The last episode takes the "+1" away: focus stays in the card, on Modifica, before the caller decides.
            if (entry.media.episodes && (entry.progress ?? 0) + 1 >= entry.media.episodes) {
              controls.current?.querySelector<HTMLElement>(":scope > button:last-of-type")?.focus();
            }
            onAddEpisode?.();
            addEpisode(entry);
          }}
          className="button tabular-nums"
        >
          +1
        </button>
      )}
      <EditEntryButton target={{ media: entry.media, entry }} label="Modifica" onDone={onEditDone} />
    </div>
  );
}
