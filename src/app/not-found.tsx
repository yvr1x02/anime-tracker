import type { Metadata } from "next";
import Link from "next/link";
import { pageContainer } from "@/lib/page-container";

export const metadata: Metadata = {
  title: "Pagina non trovata",
};

export default function NotFound() {
  return (
    <div className={`${pageContainer} py-12`}>
      <h1 className="text-h1">Pagina non trovata</h1>
      <p className="mt-4 text-ink-muted">
        L&apos;indirizzo non corrisponde a nessuna pagina di Anime Tracker.
      </p>
      <p className="mt-6">
        <Link
          href="/"
          className="rounded-control text-cyan underline underline-offset-2"
        >
          Torna alla Home
        </Link>
      </p>
    </div>
  );
}
