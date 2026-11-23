import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { NavigationTracker } from "@/components/back-link";
import { ListEditingProvider } from "@/components/list-editing";
import { QueryProvider } from "@/components/query-provider";
import { SearchButton } from "@/components/search-button";
import { PhoneNav, SiteNav } from "@/components/site-nav";
import { pageContainer } from "@/lib/page-container";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={spaceGrotesk.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:m-2 focus:flex focus:min-h-11 focus:items-center focus:self-start focus:rounded-control focus:bg-raised focus:px-4 focus:text-small focus:font-semibold"
        >
          Vai al contenuto
        </a>
        <header className="sticky top-0 z-40 h-16 border-b border-border bg-bg">
          <div className={`${pageContainer} flex h-full items-center justify-between gap-4`}>
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-control text-h3 whitespace-nowrap"
            >
              Anime Tracker
            </Link>
            {/* Same order on screen and for the keyboard: navigation, Cerca, account; on phones Menu comes last. */}
            <div className="flex min-w-0 items-center sm:gap-2">
              <SiteNav />
              <SearchButton />
              {/* Suspense: AccountMenu reads the address, which static pages only know in the browser. */}
              <Suspense fallback={null}>
                <AccountMenu />
              </Suspense>
              <PhoneNav />
            </div>
          </div>
        </header>
        <main id="contenuto" className="flex-1">
          <QueryProvider>
            <ListEditingProvider>{children}</ListEditingProvider>
          </QueryProvider>
          <NavigationTracker />
        </main>
        <footer className="border-t border-border">
          <p className={`${pageContainer} py-8 text-small text-ink-muted`}>
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
