import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DataFreshness } from "@/components/data-freshness";
import { DemoNotice, DemoUnavailable } from "@/components/demo-notice";
import { ListStats } from "@/components/list-stats";
import { MyStats } from "@/components/my-stats";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { DEMO_REVALIDATE_SECONDS, readDemoList } from "@/lib/demo-list";
import { pageContainer } from "@/lib/page-container";

export const metadata: Metadata = {
  title: "Statistiche",
};

export default async function StatsPage() {
  // As La mia lista: the user's own list comes from /api/list; without login, the cached demo list.
  const loggedIn = (await cookies()).has(SESSION_COOKIE);
  const demo = loggedIn ? null : await readDemoList();

  return (
    <div className={`${pageContainer} py-12`}>
      <h1 className="text-h1">Statistiche</h1>
      {loggedIn ? (
        <MyStats />
      ) : demo ? (
        <>
          <DemoNotice userName={demo.userName} path="/statistiche" />
          <ListStats entries={demo.entries} />
          <div className="mt-8">
            <DataFreshness fetchedAt={demo.fetchedAt} maxAgeSeconds={DEMO_REVALIDATE_SECONDS} />
          </div>
        </>
      ) : (
        <DemoUnavailable path="/statistiche" />
      )}
    </div>
  );
}
