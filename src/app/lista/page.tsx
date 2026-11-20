import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AnimeList } from "@/components/anime-list";
import { DataFreshness } from "@/components/data-freshness";
import { MyList } from "@/components/my-list";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { DEMO_REVALIDATE_SECONDS, readDemoList } from "@/lib/demo-list";
import { pageContainer } from "@/lib/page-container";

export const metadata: Metadata = {
  title: "La mia lista",
};

export default async function ListPage() {
  // Only picks which list to draw: the user's own entries come from /api/list, which checks the session.
  const loggedIn = (await cookies()).has(SESSION_COOKIE);
  const demo = loggedIn ? null : await readDemoList();

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
