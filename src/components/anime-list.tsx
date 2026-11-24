"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { EditEntryButton, type EditOutcome } from "@/components/entry-editor";
import { useListEditing } from "@/components/list-editing";
import type { MediaListStatus } from "@/gql/graphql";
import { animeTitle, listStatusLabel } from "@/lib/anime-labels";
import { cardGrid } from "@/lib/card-grid";
import { type ListEntry, entrySummary } from "@/lib/list";
import { type EntryChange, savedStatusAndScore } from "@/lib/list-rules";
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

  if (entries.length === 0) {
    // Focusable: where focus goes when the last entry is removed.
    return (
      <p id="anime-della-lista" tabIndex={-1} className="mt-8 text-ink-muted focus:outline-none">
        La lista è vuota.
      </p>
    );
  }

  /**
   * A card about to leave the list shown would take the keyboard focus with it, as in Continua a guardare:
   * focus moves first to the next card's title, or to the list's heading after the last one, and the live
   * region says why.
   */
  function moveFocusPast(index: number, message: string) {
    const next = shown[index + 1];
    const target = document.getElementById(next ? `lista-${next.media.id}` : "anime-della-lista");
    (target?.querySelector<HTMLElement>("a") ?? target)?.focus();
    setAnnouncement(message);
  }

  /** Why `change` takes the entry out of the filters on, or null when it stays. */
  function leaveMessage(entry: ListEntry, change: EntryChange): string | null {
    const title = animeTitle(entry.media.title);
    const after = savedStatusAndScore(entry, change);
    if (filter && after.status !== filter) {
      return `${title}: passato a «${after.status ? listStatusLabel[after.status] : "nessuno stato"}»`;
    }
    if (score && scoreBar(after.score) !== score) {
      return after.score ? `${title}: voto ${formatScore(after.score)}` : `${title}: voto tolto`;
    }
    return null;
  }

  function afterEdit(index: number, entry: ListEntry, outcome: EditOutcome) {
    if (!outcome) return undefined;
    const message =
      "deleted" in outcome ? `${animeTitle(entry.media.title)}: eliminato dalla lista` : leaveMessage(entry, outcome.change);
    return message ? () => moveFocusPast(index, message) : undefined;
  }

  /** The label goes away with the filter: focus moves to the status filter in use. */
  function clearScoreFilter() {
    clearScoreParam();
    statusFilters.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.focus();
    setAnnouncement("Filtro per voto tolto");
  }

  function afterAddEpisode(index: number, entry: ListEntry) {
    const message = leaveMessage(entry, { progress: (entry.progress ?? 0) + 1 });
    if (message) moveFocusPast(index, message);
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
            onClick={() => setFilter(status)}
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
          {shown.map((entry, index) => (
            <li key={entry.id} id={`lista-${entry.media.id}`}>
              <AnimeCard anime={entry.media}>
                <p className="text-small text-ink-muted tabular-nums">
                  {!filter && entry.status && `${listStatusLabel[entry.status]} · `}
                  {entrySummary(entry)}
                </p>
                {editable && (
                  <EntryControls
                    entry={entry}
                    onAddEpisode={() => afterAddEpisode(index, entry)}
                    onEditDone={(outcome) => afterEdit(index, entry, outcome)}
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
  const watching = entry.status === "CURRENT" || entry.status === "REPEATING";
  const more = !entry.media.episodes || (entry.progress ?? 0) < entry.media.episodes;

  return (
    <div className="relative z-10 mt-2 flex flex-wrap gap-2">
      {watching && more && (
        <button
          type="button"
          aria-label={`+1 episodio visto: ${animeTitle(entry.media.title)}`}
          onClick={() => {
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
