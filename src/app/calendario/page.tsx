import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WeekCalendar } from "@/components/week-calendar";
import { CALENDAR_REVALIDATE_SECONDS, readWeek } from "@/lib/calendar";
import { pageContainer } from "@/lib/page-container";
import { mondayOf, parseDayParam, utcCurrentMonday } from "@/lib/week";

export const metadata: Metadata = {
  title: "Calendario",
};

/**
 * The week's episodes, one day at a time (SPEC, "Calendario"). The server only knows UTC: it reads the week of
 * ?giorno= (or the UTC current week) with margins for every time zone, and the browser lays it out in its own.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const { giorno, settimana } = await searchParams;
  // Links from before M7 named the week by its Monday: that Monday is now the day.
  if (typeof settimana === "string" && giorno === undefined) redirect(`/calendario?giorno=${encodeURIComponent(settimana)}`);
  const utcMonday = utcCurrentMonday();
  const asked = typeof giorno === "string" ? giorno : null;
  const day = asked === null ? null : parseDayParam(asked, utcMonday);
  // A malformed day, one in a past week or one too far ahead never reaches AniList.
  if (asked !== null && !day) redirect("/calendario");
  const monday = day ? mondayOf(day) : utcMonday;
  const week = await readWeek(monday);

  return (
    <div className={`${pageContainer} py-12`}>
      <h1 className="text-h1">Calendario</h1>
      <WeekCalendar
        monday={monday}
        asked={day !== null}
        episodes={week.episodes}
        fetchedAt={week.fetchedAt}
        maxAgeSeconds={CALENDAR_REVALIDATE_SECONDS}
      />
    </div>
  );
}
