"use client";

import { useState } from "react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { EntryControls } from "@/components/anime-list";
import { NotLoggedInError } from "@/lib/auth/errors";
import { useViewer } from "@/lib/auth/use-viewer";
import { animeTitle } from "@/lib/anime-labels";
import { MAX_CONTINUE, backlogText, continueWatching } from "@/lib/backlog";
import { cardGrid } from "@/lib/card-grid";
import { useMyList } from "@/lib/my-list";
import { useNow } from "@/lib/use-now";

/**
 * The Home's "Continua a guardare" (SPEC, "Home"), from the list already read for the session: no extra
 * request. The shared Home is cached for everyone, so this part is drawn in the browser; its waiting space
 * shows only when the name cookie says the user is logged in, so logged-out visitors see nothing move.
 */
export function ContinueWatching() {
  const viewer = useViewer();
  const list = useMyList(Boolean(viewer));
  const now = useNow();
  const [announcement, setAnnouncement] = useState("");
  // Set when the user caught up with the last card here: the section stays, so focus has somewhere to go.
  const [allCaughtUp, setAllCaughtUp] = useState(false);

  if (!viewer || list.error instanceof NotLoggedInError) return null;

  if (list.isError) {
    return (
      <section aria-labelledby="continua" className="mt-8">
        <h2 id="continua" className="text-h2">
          Continua a guardare
        </h2>
        <p className="mt-2 text-ink-muted">Non riesco a leggere la tua lista da AniList in questo momento.</p>
      </section>
    );
  }

  if (list.isPending || now === null) {
    return (
      <section aria-labelledby="continua" aria-busy="true" className="mt-8">
        <h2 id="continua" className="text-h2">
          Continua a guardare
        </h2>
        <p className="sr-only">Caricamento…</p>
        <ul aria-hidden="true" className={`${cardGrid} mt-4 max-h-[26rem] overflow-hidden`}>
          {Array.from({ length: MAX_CONTINUE }, (_, index) => (
            <li key={index}>
              <AnimeCardSkeleton />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const items = continueWatching(list.data, now);
  if (items.length === 0 && !allCaughtUp) return null;

  /**
   * A "+1" that catches up removes its card, and the focus with it. Before that happens, focus moves to the
   * next card's title, or to the section's heading after the last one, and the live region says so.
   */
  function catchUp(index: number) {
    const { entry } = items[index];
    const next = items[index + 1];
    const target = document.getElementById(next ? `continua-${next.entry.media.id}` : "continua");
    // The next card's title link, or the heading itself.
    (target?.querySelector<HTMLElement>("a") ?? target)?.focus();
    setAnnouncement(`Sei in pari con ${animeTitle(entry.media.title)}`);
    if (items.length === 1) setAllCaughtUp(true);
  }

  return (
    <section aria-labelledby="continua" className="mt-8">
      <h2 id="continua" tabIndex={-1} className="text-h2 focus:outline-none">
        Continua a guardare
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-ink-muted">Sei in pari: nessun episodio arretrato.</p>
      ) : null}
      <ul className={`${cardGrid} mt-4 empty:hidden`}>
        {items.map(({ entry, behind }, index) => (
          <li key={entry.id} id={`continua-${entry.media.id}`}>
            <AnimeCard anime={entry.media}>
              {entry.status === "REPEATING" && (
                <p>
                  <span className="rounded-control bg-raised px-2 py-0.5 text-label uppercase">Rewatch</span>
                </p>
              )}
              <p className="text-small font-medium text-cyan tabular-nums">{backlogText(behind, entry.media.status)}</p>
              <EntryControls entry={entry} onAddEpisode={behind === 1 ? () => catchUp(index) : undefined} />
            </AnimeCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
