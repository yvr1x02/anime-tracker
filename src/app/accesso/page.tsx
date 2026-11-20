import type { Metadata } from "next";
import type { ReactNode } from "react";
import { safeReturnPath } from "@/lib/auth/request-checks";
import { oauthConfig } from "@/lib/auth/server";
import { pageContainer } from "@/lib/page-container";

export const metadata: Metadata = {
  title: "Accesso",
};

// Where AniList lists the apps an account authorised, each with "Revoke App" (checked on 2026-11-20).
const ANILIST_APPS_SETTINGS = "https://anilist.co/settings/apps";

const revokeLink = (
  <a href={ANILIST_APPS_SETTINGS} className="text-cyan underline underline-offset-2">
    Impostazioni → Apps
  </a>
);

const outcomes: Record<string, ReactNode> = {
  annullato: "Accesso annullato: non hai autorizzato Anime Tracker su AniList.",
  errore: "Non è stato possibile completare l'accesso. Riprova tra qualche minuto.",
  "non-disponibile": "L'accesso con AniList non è attivo in questa versione del sito, ma solo sul sito principale.",
  uscito: (
    <>
      Sei uscito da Anime Tracker. Per revocare del tutto l&apos;accesso, usa {revokeLink} del tuo account AniList.
    </>
  ),
};

/** Login page: the ADR-0004 statement next to the button, and the outcome of a login or logout. */
export default async function LoginPage({ searchParams }: PageProps<"/accesso">) {
  const { esito, da } = await searchParams;
  const outcome = typeof esito === "string" && Object.hasOwn(outcomes, esito) ? outcomes[esito] : null;
  const available = oauthConfig() !== null;
  const loginHref = `/api/auth/login?da=${encodeURIComponent(safeReturnPath(typeof da === "string" ? da : null))}`;

  return (
    <div className={`${pageContainer} max-w-2xl py-12`}>
      <h1 className="text-h1">Accedi con AniList</h1>
      {outcome && (
        <p role="status" className="mt-6 rounded-panel bg-surface px-5 py-4">
          {outcome}
        </p>
      )}
      <p className="mt-6">Anime Tracker è un client non ufficiale per AniList, non affiliato ad AniList.</p>
      <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-ink-muted">
        <li>La tua lista resta su AniList: Anime Tracker la legge e la modifica per te, senza conservarne copie.</li>
        <li>
          AniList dà alle applicazioni l&apos;accesso a quasi tutti i dati del tuo account; Anime Tracker lo usa solo
          per la tua lista.
        </li>
        <li>
          La chiave d&apos;accesso resta per 30 giorni in un cookie del tuo browser, che il JavaScript della pagina non
          può leggere. Uscendo si cancella; per revocare del tutto l&apos;accesso, usa {revokeLink} del tuo account
          AniList.
        </li>
      </ul>
      {available && (
        // A plain link: the login is a server redirect, not a page Next should prefetch.
        <a href={loginHref} className="button button-primary mt-8 inline-flex items-center">
          Accedi con AniList
        </a>
      )}
    </div>
  );
}
