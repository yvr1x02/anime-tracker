"use client";

import Link from "next/link";
import { AnimeCardSkeleton } from "@/components/anime-card";
import { AnimeList } from "@/components/anime-list";
import { AniListRateLimitError } from "@/lib/anilist/client";
import { NotLoggedInError } from "@/lib/auth/errors";
import { cardGrid } from "@/lib/card-grid";
import { useMyList } from "@/lib/my-list";

/** La mia lista for a logged-in user: read from AniList through our server, kept in memory only. */
export function MyList() {
  const list = useMyList();
  const waitSeconds =
    list.fetchStatus === "fetching" && list.failureReason instanceof AniListRateLimitError
      ? list.failureReason.retryAfterSeconds
      : null;

  if (list.error instanceof NotLoggedInError) {
    return (
      <p role="status" className="mt-6 max-w-2xl">
        La sessione con AniList è scaduta o è stata revocata.{" "}
        <Link href="/accesso?da=%2Flista" className="text-cyan underline underline-offset-2">
          Accedi di nuovo
        </Link>{" "}
        per vedere la tua lista.
      </p>
    );
  }

  if (list.isError) {
    return (
      <>
        <p role="status" className="mt-6">
          Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto.
        </p>
        <button type="button" onClick={() => list.refetch()} className="button mt-4">
          Riprova
        </button>
      </>
    );
  }

  if (list.isPending) {
    return (
      <div aria-busy="true" className="mt-8">
        <p role="status" className={waitSeconds === null ? "sr-only" : undefined}>
          {waitSeconds === null
            ? "Caricamento…"
            : `AniList sta ricevendo troppe richieste. Riprovo tra ${waitSeconds} ${waitSeconds === 1 ? "secondo" : "secondi"}.`}
        </p>
        <ul aria-hidden="true" className={`${cardGrid} mt-6`}>
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <AnimeCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <AnimeList entries={list.data} />;
}
