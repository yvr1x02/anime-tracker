"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CoverImage } from "@/components/cover-image";
import { animeTitle, formatLabel } from "@/lib/anime-labels";
import { MAX_QUERY_LENGTH, PER_PAGE, searchProblem, useAnimeSearch } from "@/lib/use-anime-search";

const noSubscription = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);
const MAX_OPTIONS = 8;
// As on the page: a full page of results means there may be more.
const countText = (count: number) => (count === PER_PAGE ? `I primi ${PER_PAGE} risultati` : count === 1 ? "1 risultato" : `${count} risultati`);

const lens = (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M12.5 12.5L17 17" />
  </svg>
);

/**
 * The header's Cerca (docs/DESIGN.md, "Header e navigazione") and the quick search it opens, also with ⌘K or
 * Ctrl+K from any page. On /ricerca the shortcut goes to the page's own field. Before the browser takes over,
 * and without JavaScript, it is a link to /ricerca.
 */
export function SearchButton() {
  // Null until hydrated: the server can't know the system, nor open a dialog.
  const mac = useSyncExternalStore(noSubscription, isMac, () => null);
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // A new quick search at each opening, even when the last close event has not arrived yet.
  const [opening, setOpening] = useState(0);

  function openSearch() {
    if (pathname === "/ricerca") {
      document.getElementById("ricerca-titolo")?.focus();
      return;
    }
    if (dialog.current?.open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    setOpening((count) => count + 1);
    dialog.current?.showModal();
  }

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const className =
    "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control text-small font-medium text-ink-muted hover:text-ink sm:px-3";
  const content = (
    <>
      {lens}
      {/* The name is "Cerca" at every width: the text is only hidden visually on phones. */}
      <span className="sr-only sm:not-sr-only">Cerca</span>
      {mac !== null && (
        <kbd aria-hidden="true" className="hidden rounded-[0.25rem] border border-border-strong px-1.5 text-label sm:inline">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      )}
    </>
  );

  if (mac === null) {
    return (
      <Link href="/ricerca" aria-keyshortcuts="Meta+K Control+K" className={className}>
        {content}
      </Link>
    );
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K" onClick={openSearch} className={className}>
        {content}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="ricerca-rapida-titolo"
        onClose={() => {
          // The close event comes a task after Esc: a ⌘K in between has opened the dialog again.
          if (dialog.current?.open) return;
          setOpen(false);
          // Back where the user was (APG dialog). The browser has usually done it already, and focus may have moved
          // since (a new page, another element): only when it is lost.
          if (opener.current?.isConnected && document.activeElement === document.body) opener.current.focus();
        }}
        className="quick-search"
      >
        {open && <QuickSearch key={opening} close={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

/**
 * The quick search (docs/DESIGN.md, "Ricerca rapida"): a combobox with its listbox (APG, list autocomplete).
 * Focus stays in the field; arrows move through the results and wrap, Enter opens the highlighted one, and
 * the dialog's own Esc closes everything.
 */
function QuickSearch({ close }: { close: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const state = useAnimeSearch(input);
  const { term, ready, search, loading, results } = state;
  const problem = searchProblem(state);
  const options = (results ?? []).slice(0, MAX_OPTIONS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = options.findIndex((anime) => anime.id === activeId);

  useEffect(() => {
    if (activeId !== null) document.getElementById(`ricerca-rapida-${activeId}`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = options.length;
    if (event.key === "ArrowDown" && count) {
      event.preventDefault();
      setActiveId(options[(active + 1) % count].id);
    } else if (event.key === "ArrowUp" && count) {
      event.preventDefault();
      setActiveId(options[active <= 0 ? count - 1 : active - 1].id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0) go(`/anime/${options[active].id}`);
      else if (ready) go(`/ricerca?q=${encodeURIComponent(term)}`);
    }
  }

  return (
    <div className="flex max-h-full flex-col">
      <div className="flex items-center justify-between gap-4 px-4 pt-4">
        <h2 id="ricerca-rapida-titolo" className="text-h3">
          Cerca un anime
        </h2>
        <button type="button" onClick={close} className="button">
          Chiudi
        </button>
      </div>
      <div className="mx-4 mt-3 flex min-h-12 items-center gap-3 rounded-control border border-border-strong bg-bg px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan">
        {lens}
        <input
          type="text"
          role="combobox"
          aria-labelledby="ricerca-rapida-titolo"
          aria-describedby="ricerca-rapida-aiuto"
          aria-autocomplete="list"
          aria-controls="ricerca-rapida-risultati"
          aria-expanded={options.length > 0}
          aria-activedescendant={active >= 0 ? `ricerca-rapida-${options[active].id}` : undefined}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setActiveId(null);
          }}
          onKeyDown={onKeyDown}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          autoFocus
          className="min-w-0 flex-1 bg-transparent py-2 text-body text-ink outline-none"
        />
      </div>
      <p id="ricerca-rapida-aiuto" className="mx-4 mt-2 text-small text-ink-muted">
        Almeno 3 caratteri, in romaji o in inglese. Frecce per scegliere, Invio per aprire.
      </p>

      <ul id="ricerca-rapida-risultati" role="listbox" aria-label="Risultati" className="mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        {options.map((anime, index) => {
          const title = animeTitle(anime.title);
          return (
            // Options take no focus (APG): the field keeps it, the mouse picks too.
            <li
              key={anime.id}
              id={`ricerca-rapida-${anime.id}`}
              role="option"
              aria-selected={index === active}
              onMouseMove={() => setActiveId(anime.id)}
              onClick={() => go(`/anime/${anime.id}`)}
              className="quick-search-option"
            >
              {/* CoverImage fills its box: the box sets the 40px. */}
              <span className="w-10 shrink-0">
                <CoverImage cover={anime.coverImage} title={title} sizes="2.5rem" className="rounded-[0.25rem] text-small" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{title}</span>
                <span className="block text-small text-ink-muted tabular-nums">
                  {[anime.format && formatLabel[anime.format], anime.seasonYear].filter(Boolean).join(" · ")}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border px-4 py-3">
        <p role="status" className="text-small text-ink-muted">
          {loading && !problem && <span className="sr-only">Caricamento…</span>}
          {problem}
          {!problem && results && results.length > 0 && `${countText(results.length)} per «${term}»`}
        </p>
        {ready && search.isError && (
          <button type="button" onClick={() => search.refetch()} className="button mt-2">
            Riprova
          </button>
        )}
        {results && results.length > 0 && (
          <Link href={`/ricerca?q=${encodeURIComponent(term)}`} onClick={close} className="mt-2 inline-block text-small text-cyan underline underline-offset-2">
            Tutti i risultati per «{term}»
          </Link>
        )}
      </div>
    </div>
  );
}
