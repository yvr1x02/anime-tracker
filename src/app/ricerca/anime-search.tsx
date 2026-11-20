"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { AniListRateLimitError, requestAniList } from "@/lib/anilist/client";
import { SearchAnimeQuery } from "@/lib/anilist/queries";
import { cardGrid } from "@/lib/card-grid";

const MAX_QUERY_LENGTH = 100;
// ADR-0003: a request only after 400ms without typing, and only from 3 characters.
const DEBOUNCE_MS = 400;
const MIN_LENGTH = 3;
const PER_PAGE = 24;

const length = (text: string) => [...text].length;

/** Search field and results. ?q= is read from the current address, so coming back from a detail page keeps the search. */
export function AnimeSearch() {
  const initialQuery = (useSearchParams().get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const [input, setInput] = useState(initialQuery);
  const [term, setTerm] = useState(initialQuery.trim());
  const ready = length(term) >= MIN_LENGTH;

  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  // Keeps the address shareable without a server round trip or a history entry per search.
  useEffect(() => {
    window.history.replaceState(null, "", term ? `/ricerca?q=${encodeURIComponent(term)}` : "/ricerca");
  }, [term]);

  const search = useQuery({
    queryKey: ["search", term],
    queryFn: ({ signal }) => requestAniList(SearchAnimeQuery, { search: term, perPage: PER_PAGE }, { signal }),
    enabled: ready,
    select: ({ data }) => (data.Page?.media ?? []).filter((anime) => anime !== null),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTerm(input.trim());
  }

  const waitSeconds =
    search.fetchStatus === "fetching" && search.failureReason instanceof AniListRateLimitError
      ? search.failureReason.retryAfterSeconds
      : null;
  const loading = ready && search.isPending;
  const results = ready ? search.data : undefined;

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
        {loading && waitSeconds !== null && (
          <p>
            AniList sta ricevendo troppe richieste. Riprovo tra {waitSeconds}{" "}
            {waitSeconds === 1 ? "secondo" : "secondi"}.
          </p>
        )}
        {ready && search.isError && (
          <p>Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto.</p>
        )}
        {results?.length === 0 && (
          <p>
            Nessun risultato per «{term}». AniList conosce solo alcuni titoli italiani: prova con il titolo in
            romaji o in inglese.
          </p>
        )}
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
                <AnimeCard anime={anime} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
