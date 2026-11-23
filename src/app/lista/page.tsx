import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AnimeList } from "@/components/anime-list";
import { DataFreshness } from "@/components/data-freshness";
import { DemoNotice, DemoUnavailable } from "@/components/demo-notice";
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
          <DemoNotice userName={demo.userName} path="/lista" />
          <AnimeList entries={demo.entries} />
          <div className="mt-8">
            <DataFreshness fetchedAt={demo.fetchedAt} maxAgeSeconds={DEMO_REVALIDATE_SECONDS} />
          </div>
        </>
      ) : (
        <DemoUnavailable path="/lista" />
      )}
    </div>
  );
}
