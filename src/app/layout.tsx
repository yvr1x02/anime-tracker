import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Anime Tracker",
    default: "Anime Tracker",
  },
  description:
    "Client non ufficiale di AniList per seguire i propri anime: stagione in corso, ricerca, calendario delle uscite e la tua lista AniList.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

const pageContainer = "mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={spaceGrotesk.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:flex focus:min-h-11 focus:items-center focus:rounded-control focus:bg-raised focus:px-4 focus:text-small focus:font-semibold"
        >
          Vai al contenuto
        </a>
        <header className="sticky top-0 z-40 h-16 border-b border-border bg-bg">
          <div className={`${pageContainer} flex h-full items-center`}>
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-control text-h3"
            >
              Anime Tracker
            </Link>
          </div>
        </header>
        <main id="contenuto" className={`${pageContainer} flex-1 py-12`}>
          {children}
        </main>
        <footer className="border-t border-border">
          <p className={`${pageContainer} py-8 text-small text-text-muted`}>
            Anime Tracker è un client non ufficiale per AniList, non affiliato
            ad AniList. Dati forniti da{" "}
            <a
              href="https://anilist.co"
              className="rounded-control text-cyan underline underline-offset-2"
            >
              AniList
            </a>
            .
          </p>
        </footer>
      </body>
    </html>
  );
}
