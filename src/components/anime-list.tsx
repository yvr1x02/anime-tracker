"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { EditEntryButton, type EditOutcome } from "@/components/entry-editor";
import { useListEditing } from "@/components/list-editing";
import { ScoreChart } from "@/components/score-chart";
import type { MediaListStatus } from "@/gql/graphql";
import { animeTitle, listStatusLabel } from "@/lib/anime-labels";
import { cardGrid } from "@/lib/card-grid";
import { type ListEntry, entrySummary } from "@/lib/list";
import { parseScoreFilter, scoreBar, scoreCounts } from "@/lib/stats";

const statuses = Object.keys(listStatusLabel) as MediaListStatus[];

/** ?voto= changes in place: no history entry per click (SPEC, "La mia lista"); useSearchParams follows it. */
function setScoreFilter(score: number | null) {
  const url = new URL(window.location.href);
  if (score) url.searchParams.set("voto", String(score));
  else url.searchParams.delete("voto");
  window.history.replaceState(null, "", url);
}

/** "Nessun anime con voto 8 in «Completato»." for whichever filters are on. */
function emptyMessage(status: MediaListStatus | null, score: number | null) {
  const inStatus = status ? ` in «${listStatusLabel[status]}»` : "";
  return score ? `Nessun anime con voto ${score}${inStatus}.` : `Nessun anime${inStatus}.`;
}

/**
 * A list's score chart and cards with the status filters (docs/DESIGN.md, "Pulsanti e filtri" and "Grafici"):
 * the two filters add up, and each counts on the whole list. `editable` adds the controls of the
 * logged-in user's own list; the demo stays read only.
 */
export function AnimeList({ entries, editable = false }: { entries: ListEntry[]; editable?: boolean }) {
  const [filter, setFilter] = useState<MediaListStatus | null>(null);
  const score = parseScoreFilter(useSearchParams().get("voto"));
  const shown = entries.filter(
    (entry) => (!filter || entry.status === filter) && (!score || scoreBar(entry.score) === score),
  );
  const count = (status: MediaListStatus | null) =>
    status ? entries.filter((entry) => entry.status === status).length : entries.length;

  if (entries.length === 0) return <p className="mt-8 text-ink-muted">La lista è vuota.</p>;

  return (
    <>
      <div className="mt-8">
        <ScoreChart counts={scoreCounts(entries)} selected={score} onSelect={setScoreFilter} />
      </div>

      <h2 className="sr-only">Anime della lista</h2>
      <div role="group" aria-label="Filtra per stato" className="filter-row mt-8">
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
          {shown.map((entry) => (
            <li key={entry.id}>
              <AnimeCard anime={entry.media}>
                <p className="text-small text-ink-muted tabular-nums">
                  {!filter && entry.status && `${listStatusLabel[entry.status]} · `}
                  {entrySummary(entry)}
                </p>
                {editable && <EntryControls entry={entry} />}
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
