import type { MediaListStatus } from "@/gql/graphql";

export type FuzzyDate = { year: number | null; month: number | null; day: number | null };

/** A change to a list entry: only the fields the user touched. Score is 1–10, or 0 to clear it. */
export type EntryChange = {
  status?: MediaListStatus;
  progress?: number;
  score?: number;
  notes?: string;
  startedAt?: FuzzyDate;
  completedAt?: FuzzyDate;
};

type Current = { status: MediaListStatus | null; startedAt: FuzzyDate | null } | null;

const isEmpty = (date: FuzzyDate | null | undefined) => !date?.year;

/** Today in the viewer's time zone; `timeZone` is only passed by tests. */
export function today(nowMs = Date.now(), timeZone?: string): FuzzyDate {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "numeric", day: "numeric", timeZone })
    .formatToParts(nowMs)
    .reduce<Record<string, number>>((all, part) => ({ ...all, [part.type]: Number(part.value) }), {});
  return { year: parts.year, month: parts.month, day: parts.day };
}

/**
 * SPEC, "Regole automatiche", added to the same request (ADR-0004): moving to Sto guardando fills an empty
 * start date; moving to Completato fills the end date and sets the episodes seen to the total, when known.
 */
export function applyListRules(
  current: Current,
  change: EntryChange,
  todayDate: FuzzyDate,
  totalEpisodes: number | null,
): EntryChange {
  const ruled = { ...change };
  const statusChanged = change.status !== undefined && change.status !== current?.status;
  if (statusChanged && change.status === "CURRENT" && isEmpty(current?.startedAt) && !change.startedAt) {
    ruled.startedAt = todayDate;
  }
  if (statusChanged && change.status === "COMPLETED") {
    ruled.completedAt = change.completedAt ?? todayDate;
    if (totalEpisodes) ruled.progress = totalEpisodes;
  }
  return ruled;
}
