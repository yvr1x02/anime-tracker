"use client";

import { useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import type { MediaListStatus } from "@/gql/graphql";
import { listStatusLabel } from "@/lib/anime-labels";
import { cardGrid } from "@/lib/card-grid";
import { type ListEntry, entrySummary } from "@/lib/list";

const statuses = Object.keys(listStatusLabel) as MediaListStatus[];

/** A list's cards with the status filters (docs/DESIGN.md, "Pulsanti e filtri"). */
export function AnimeList({ entries }: { entries: ListEntry[] }) {
  const [filter, setFilter] = useState<MediaListStatus | null>(null);
  const shown = filter ? entries.filter((entry) => entry.status === filter) : entries;
  const count = (status: MediaListStatus | null) =>
    status ? entries.filter((entry) => entry.status === status).length : entries.length;

  if (entries.length === 0) return <p className="mt-8 text-ink-muted">La lista è vuota.</p>;

  return (
    <>
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
        <p className="mt-6 text-ink-muted">Nessun anime in «{filter && listStatusLabel[filter]}».</p>
      ) : (
        <ul className={`${cardGrid} mt-6`}>
          {shown.map((entry) => (
            <li key={entry.id}>
              <AnimeCard anime={entry.media}>
                <p className="text-small text-ink-muted tabular-nums">
                  {!filter && entry.status && `${listStatusLabel[entry.status]} · `}
                  {entrySummary(entry)}
                </p>
              </AnimeCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
