import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AnimeList } from "@/components/anime-list";
import { DataFreshness } from "@/components/data-freshness";
import { MyList } from "@/components/my-list";
import { AniListError } from "@/lib/anilist/client";
import { UserAnimeListQuery } from "@/lib/anilist/queries";
import { requestAniListCached } from "@/lib/anilist/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { listEntries } from "@/lib/list";
import { pageContainer } from "@/lib/page-container";

export const metadata: Metadata = {
  title: "La mia lista",
};

// ADR-0004: the demo list is the same for everyone, so it is cached for an hour like other public data.
const DEMO_REVALIDATE_SECONDS = 3600;

/** The demo profile's public list, or null when it is not set, does not exist or is not public. */
async function demoList() {
  const userName = process.env.ANILIST_DEMO_USERNAME;
  if (!userName) return null;
  try {
    const { data, fetchedAt } = await requestAniListCached(UserAnimeListQuery, { userName }, DEMO_REVALIDATE_SECONDS);
    return { userName, entries: listEntries(data.MediaListCollection), fetchedAt };
  } catch (error) {
    if (error instanceof AniListError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}

export default async function ListPage() {
  // Only picks which list to draw: the user's own entries come from /api/list, which checks the session.
  const loggedIn = (await cookies()).has(SESSION_COOKIE);
  const demo = loggedIn ? null : await demoList();

  return (
    <div className={`${pageContainer} py-12`}>
      <h1 className="text-h1">La mia lista</h1>
      {loggedIn ? (
        <MyList />
      ) : demo ? (
        <>
          <p className="mt-6 max-w-2xl rounded-panel bg-surface px-5 py-4">
            Modalità demo: lista pubblica di {demo.userName} su AniList, in sola lettura.{" "}
            <Link href="/accesso?da=%2Flista" className="text-cyan underline underline-offset-2">
              Accedi con AniList
            </Link>{" "}
            per vedere e modificare la tua.
          </p>
          <AnimeList entries={demo.entries} />
          <div className="mt-8">
            <DataFreshness fetchedAt={demo.fetchedAt} maxAgeSeconds={DEMO_REVALIDATE_SECONDS} />
          </div>
        </>
      ) : (
        <p className="mt-6 max-w-2xl text-ink-muted">
          La lista dimostrativa non è disponibile in questo momento.{" "}
          <Link href="/accesso?da=%2Flista" className="text-cyan underline underline-offset-2">
            Accedi con AniList
          </Link>{" "}
          per vedere la tua.
        </p>
      )}
    </div>
  );
}
