"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useRef } from "react";
import { EditEntryButton } from "@/components/entry-editor";
import { useListEditing } from "@/components/list-editing";
import { animeTitle, listStatusLabel } from "@/lib/anime-labels";
import { useViewer } from "@/lib/auth/use-viewer";
import { type CardMedia, entrySummary } from "@/lib/list";
import { useListEntry } from "@/lib/my-list";

type Media = CardMedia;

/**
 * Link props to the login page, coming back here afterwards. The query (such as ?q= of a search) is read at
 * click time: useSearchParams would need a Suspense boundary on pages built ahead, like the detail.
 */
function useLoginLink() {
  const pathname = usePathname();
  const router = useRouter();
  return {
    href: `/accesso?da=${encodeURIComponent(pathname)}`,
    onClick(event: MouseEvent<HTMLAnchorElement>) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      router.push(`/accesso?da=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    },
  };
}

/**
 * The card's "+" (docs/DESIGN.md, "Pulsante +"): a toggle. Logged out it leads to the login and says why;
 * logged in it adds to Da vedere, and pressed again asks before removing (ADR-0004).
 */
export function ListToggle({ media }: { media: Media }) {
  const viewer = useViewer();
  const status = useListEntry(media.id, viewer === undefined ? undefined : viewer !== null);
  const { save, remove } = useListEditing();
  const login = useLoginLink();
  const confirm = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const title = animeTitle(media.title);

  if (status.state === "unknown") return null;
  if (status.state === "logged-out") {
    return (
      <Link {...login} aria-label={`Accedi con AniList per aggiungere «${title}» alla tua lista`} className="list-toggle">
        <span aria-hidden="true">+</span>
      </Link>
    );
  }

  const entry = status.entry;
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-pressed={entry !== null}
        aria-label={`${title}: nella mia lista`}
        onClick={() => (entry ? confirm.current?.showModal() : void save({ media, entry: null }, { status: "PLANNING" }))}
        className="list-toggle"
      >
        <span aria-hidden="true">{entry ? "✓" : "+"}</span>
      </button>
      {entry && (
        <dialog
          ref={confirm}
          aria-labelledby={`${media.id}-remove`}
          onClose={() => button.current?.focus()}
          className="entry-editor"
        >
          <p id={`${media.id}-remove`}>Eliminare «{title}» dalla lista su AniList? Non si può annullare.</p>
          <p className="mt-2 text-small text-ink-muted">
            {entry.status && `${listStatusLabel[entry.status]} · `}
            {entrySummary(entry)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                confirm.current?.close();
                void remove(entry);
              }}
              className="button border-danger text-danger"
            >
              Elimina
            </button>
            <button type="button" onClick={() => confirm.current?.close()} className="button">
              Non eliminare
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}

/** The detail header's primary button: add (choosing the status) or edit the entry; login when logged out. */
export function DetailListAction({ media }: { media: Media }) {
  const viewer = useViewer();
  const status = useListEntry(media.id, viewer === undefined ? undefined : viewer !== null);
  const login = useLoginLink();

  // Same height before the browser knows, so the header does not move.
  if (status.state === "unknown") return <div className="mt-6 min-h-11" />;
  if (status.state === "logged-out") {
    return (
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link {...login} className="button button-primary inline-flex items-center">
          Aggiungi alla lista
        </Link>
        <span className="text-small text-ink-muted">Serve l&apos;accesso con AniList.</span>
      </p>
    );
  }

  const { entry } = status;
  return (
    <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
      <EditEntryButton
        target={{ media, entry }}
        label={entry ? "✓ Nella mia lista" : "Aggiungi alla lista"}
        className="button button-primary"
      />
      {entry && (
        <span className="text-small text-ink-muted tabular-nums">
          {entry.status && `${listStatusLabel[entry.status]} · `}
          {entrySummary(entry)}
        </span>
      )}
    </p>
  );
}
