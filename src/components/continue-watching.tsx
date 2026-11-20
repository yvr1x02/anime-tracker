"use client";

import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { EntryControls } from "@/components/anime-list";
import { NotLoggedInError } from "@/lib/auth/errors";
import { useViewer } from "@/lib/auth/use-viewer";
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
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="continua" className="mt-8">
      <h2 id="continua" className="text-h2">
        Continua a guardare
      </h2>
      <ul className={`${cardGrid} mt-4`}>
        {items.map(({ entry, behind }) => (
          <li key={entry.id}>
            <AnimeCard anime={entry.media}>
              {entry.status === "REPEATING" && (
                <p>
                  <span className="rounded-control bg-raised px-2 py-0.5 text-label uppercase">Rewatch</span>
                </p>
              )}
              <p className="text-small font-medium text-cyan tabular-nums">{backlogText(behind, entry.media.status)}</p>
              <EntryControls entry={entry} />
            </AnimeCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
