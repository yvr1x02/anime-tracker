"use client";

import { useSearchParams } from "next/navigation";
import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { ListToggle } from "@/components/list-actions";
import { cardGrid } from "@/lib/card-grid";
import { MAX_QUERY_LENGTH, PER_PAGE, searchProblem, useAnimeSearch } from "@/lib/use-anime-search";

/** Search field and results. ?q= is read from the current address, so coming back from a detail page keeps the search. */
export function AnimeSearch() {
  const initialQuery = (useSearchParams().get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const [input, setInput] = useState(initialQuery);
  const state = useAnimeSearch(input, initialQuery.trim());
  const { term, setTerm, ready, search, waitSeconds, loading, results } = state;
  const problem = searchProblem(state);

  // Keeps the address shareable without a server round trip or a history entry per search. Only on a real
  // change: replacing on mount, before Next stores its own history state, would break the back button.
  useEffect(() => {
    if ((new URLSearchParams(window.location.search).get("q") ?? "").trim() === term) return;
    window.history.replaceState(null, "", term ? `/ricerca?q=${encodeURIComponent(term)}` : "/ricerca");
  }, [term]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTerm(input.trim());
  }

  return (
    <>
      {/* Without JavaScript the form still updates ?q=; results need the browser. */}
      <form role="search" action="/ricerca" onSubmit={submit} className="mt-6 flex max-w-xl flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="ricerca-titolo" className="text-small font-medium">
            Titolo dell&apos;anime
          </label>
          <input
            id="ricerca-titolo"
            name="q"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="off"
            aria-describedby="ricerca-aiuto"
            className="min-h-11 w-full rounded-control border border-border-strong bg-surface px-4 text-body text-ink"
          />
        </div>
        <button type="submit" className="button">
          Cerca
        </button>
        <p id="ricerca-aiuto" className="w-full text-small text-ink-muted">
          Almeno 3 caratteri. AniList conosce i titoli in romaji e in inglese, e solo alcuni titoli italiani.
        </p>
      </form>

      <div role="status" className="mt-8">
        {loading && waitSeconds === null && <span className="sr-only">Caricamento…</span>}
        {problem && <p>{problem}</p>}
        {results && results.length > 0 && (
          <p className="text-small text-ink-muted">
            {results.length === PER_PAGE
              ? `I primi ${PER_PAGE} risultati`
              : results.length === 1
                ? "1 risultato"
                : `${results.length} risultati`}{" "}
            per «{term}»
          </p>
        )}
      </div>

      {ready && search.isError && (
        <button type="button" onClick={() => search.refetch()} className="button mt-4">
          Riprova
        </button>
      )}

      <div aria-busy={loading}>
        {loading && (
          <ul aria-hidden="true" className={`${cardGrid} mt-4`}>
            {Array.from({ length: 12 }, (_, index) => (
              <li key={index}>
                <AnimeCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {results && results.length > 0 && (
          // A new key per search restarts the cascade; results already in memory (back from a detail page) don't cascade.
          <ul key={term} className={`${cardGrid} mt-4`}>
            {results.map((anime, index) => (
              <li
                key={anime.id}
                className={search.isFetchedAfterMount ? "card-cascade" : undefined}
                style={{ "--i": index } as CSSProperties}
              >
                {/* Search never returns adult anime (isAdult: false in the query). */}
              <AnimeCard anime={anime} action={<ListToggle media={{ ...anime, isAdult: false }} />} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
