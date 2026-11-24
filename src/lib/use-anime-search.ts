"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AniListRateLimitError, requestAniList } from "@/lib/anilist/client";
import { SearchAnimeQuery } from "@/lib/anilist/queries";

export const MAX_QUERY_LENGTH = 100;
// ADR-0003: a request only after 400ms without typing, and only from 3 characters.
const DEBOUNCE_MS = 400;
const MIN_LENGTH = 3;
// The page and the quick search ask the same: one cache entry per term, shared by both.
export const PER_PAGE = 24;

const length = (text: string) => [...text].length;

/**
 * The search behind /ricerca and the quick search: `input` becomes the searched term 400ms after typing
 * stops; setTerm searches at once. Results stay in memory for the session (TanStack Query).
 */
export function useAnimeSearch(input: string, initialTerm = "") {
  const [term, setTerm] = useState(initialTerm);
  const ready = length(term) >= MIN_LENGTH;

  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const search = useQuery({
    queryKey: ["search", term],
    queryFn: ({ signal }) => requestAniList(SearchAnimeQuery, { search: term, perPage: PER_PAGE }, { signal }),
    enabled: ready,
    select: ({ data }) => (data.Page?.media ?? []).filter((anime) => anime !== null),
  });

  const waitSeconds =
    search.fetchStatus === "fetching" && search.failureReason instanceof AniListRateLimitError
      ? search.failureReason.retryAfterSeconds
      : null;

  return {
    term,
    setTerm,
    ready,
    search,
    waitSeconds,
    loading: ready && search.isPending,
    results: ready ? search.data : undefined,
  };
}

/** What goes wrong or comes back empty, in the words the page and the quick search share; null otherwise. */
export function searchProblem({ term, ready, search, waitSeconds, loading, results }: ReturnType<typeof useAnimeSearch>) {
  if (loading && waitSeconds !== null) {
    return `AniList sta ricevendo troppe richieste. Riprovo tra ${waitSeconds} ${waitSeconds === 1 ? "secondo" : "secondi"}.`;
  }
  if (ready && search.isError) return "Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto.";
  if (results?.length === 0) {
    return `Nessun risultato per «${term}». AniList conosce solo alcuni titoli italiani: prova con il titolo in romaji o in inglese.`;
  }
  return null;
}
