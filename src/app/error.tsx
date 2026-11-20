"use client";

import { pageContainer } from "@/lib/page-container";

// In production a server error reaches the browser without its message, so the text can't depend on it.
// AniList is the pages' only data source: this is ADR-0003's message for a page with nothing cached.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className={`${pageContainer} py-12`}>
      {/* Client components can't export metadata; React hoists this into <head>. */}
      <title>Pagina non disponibile · Anime Tracker</title>
      <h1 className="text-h1">Pagina non disponibile</h1>
      <p className="mt-4 text-ink-muted">Non riesco a caricare i dati da AniList. Riprova tra qualche minuto.</p>
      <button type="button" onClick={retry} className="button mt-6">
        Riprova
      </button>
    </div>
  );
}
