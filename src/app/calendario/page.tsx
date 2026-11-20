import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WeekCalendar } from "@/components/week-calendar";
import { CALENDAR_REVALIDATE_SECONDS, readWeek } from "@/lib/calendar";
import { pageContainer } from "@/lib/page-container";
import { parseWeekParam, utcCurrentMonday } from "@/lib/week";

export const metadata: Metadata = {
  title: "Calendario",
};

/**
 * The week's episodes (SPEC, "Calendario"). The server only knows UTC: it reads the week of ?settimana= (or the
 * UTC current week) with margins for every time zone, and the browser lays it out in its own.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const { settimana } = await searchParams;
  const utcMonday = utcCurrentMonday();
  const asked = typeof settimana === "string" ? settimana : null;
  const monday = asked === null ? utcMonday : parseWeekParam(asked, utcMonday);
  // A malformed week, a past one or one too far ahead never reaches AniList.
  if (!monday) redirect("/calendario");
  const week = await readWeek(monday);

  return (
    <div className={`${pageContainer} py-12`}>
      <h1 className="text-h1">Calendario</h1>
      <WeekCalendar
        monday={monday}
        asked={asked !== null}
        episodes={week.episodes}
        fetchedAt={week.fetchedAt}
        maxAgeSeconds={CALENDAR_REVALIDATE_SECONDS}
      />
    </div>
  );
}
