"use client";

import { useState } from "react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { EntryControls } from "@/components/anime-list";
import type { EditOutcome } from "@/components/entry-editor";
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
  // Set when the last card here went away: the section stays with this note, so focus has somewhere to go.
  const [emptyNote, setEmptyNote] = useState<string | null>(null);

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
  if (items.length === 0 && !emptyNote) return null;

  /**
   * A card about to go away would take the keyboard focus with it. Focus moves first to the next card's
   * title, or to the section's heading after the last one, and the live region says why.
   */
  function moveFocusPast(index: number, caughtUp: boolean) {
    const title = animeTitle(items[index].entry.media.title);
    const next = items[index + 1];
    const target = document.getElementById(next ? `continua-${next.entry.media.id}` : "continua");
    // The next card's title link, or the heading itself.
    (target?.querySelector<HTMLElement>("a") ?? target)?.focus();
    setAnnouncement(caughtUp ? `Sei in pari con ${title}` : `${title} non è più in Continua a guardare`);
    if (items.length === 1) {
      setEmptyNote(caughtUp ? "Sei in pari: nessun episodio arretrato." : "Nessun altro anime da continuare.");
    }
  }

  /** After the editor: does the card leave (caught up, another status, removed)? Then focus goes past it. */
  function afterEdit(index: number, outcome: EditOutcome) {
    if (!outcome) return undefined;
    const { entry, behind } = items[index];
    if ("deleted" in outcome) return () => moveFocusPast(index, false);
    const status = outcome.change.status ?? entry.status;
    const progress = outcome.change.progress ?? entry.progress ?? 0;
    // Completato fills the episodes to the total (SPEC, automatic rules): that is catching up too.
    const caughtUp = status === "COMPLETED" || progress >= (entry.progress ?? 0) + behind;
    const stillWatching = status === "CURRENT" || status === "REPEATING";
    if (!caughtUp && stillWatching) return undefined;
    return () => moveFocusPast(index, caughtUp);
  }

  return (
    <section aria-labelledby="continua" className="mt-8">
      <h2 id="continua" tabIndex={-1} className="text-h2 focus:outline-none">
        Continua a guardare
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {items.length === 0 ? <p className="mt-2 text-ink-muted">{emptyNote}</p> : null}
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
              <EntryControls
                entry={entry}
                onAddEpisode={behind === 1 ? () => moveFocusPast(index, true) : undefined}
                onEditDone={(outcome) => afterEdit(index, outcome)}
              />
            </AnimeCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
