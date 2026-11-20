import type { MediaListStatus } from "@/gql/graphql";
import type { FuzzyDate } from "./list-rules";
import { isValidScore, toScoreRaw } from "./score";

const STATUSES: readonly MediaListStatus[] = ["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"];
const MAX_GRAPHQL_INT = 2_147_483_647;
export const MAX_NOTES_LENGTH = 2000;

export type SaveEntryVariables = {
  mediaId: number;
  status?: MediaListStatus;
  progress?: number;
  scoreRaw?: number;
  notes?: string;
  startedAt?: FuzzyDate;
  completedAt?: FuzzyDate;
};

const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function parseDate(value: unknown): FuzzyDate | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null) return null;
  const { year, month, day } = value as Record<string, unknown>;
  const ok = isInt(year, 1900, 2200) && isInt(month, 1, 12) && isInt(day, 1, 31);
  return ok ? { year, month, day } : null;
}

/**
 * The body of POST /api/list/entry, checked at the trust boundary: only known fields, in range. Returns the
 * mutation's variables (score 1,0–10,0 becomes scoreRaw = score × 10, 0 clears it), or null if anything is off.
 */
export function parseSaveEntry(body: unknown): SaveEntryVariables | null {
  if (typeof body !== "object" || body === null) return null;
  const { mediaId, status, progress, score, notes, startedAt, completedAt } = body as Record<string, unknown>;
  if (!isInt(mediaId, 1, MAX_GRAPHQL_INT)) return null;
  const variables: SaveEntryVariables = { mediaId };

  if (status !== undefined) {
    if (!STATUSES.includes(status as MediaListStatus)) return null;
    variables.status = status as MediaListStatus;
  }
  if (progress !== undefined) {
    if (!isInt(progress, 0, 100_000)) return null;
    variables.progress = progress;
  }
  if (score !== undefined) {
    if (!isValidScore(score)) return null;
    variables.scoreRaw = toScoreRaw(score);
  }
  if (notes !== undefined) {
    if (typeof notes !== "string" || notes.length > MAX_NOTES_LENGTH) return null;
    variables.notes = notes;
  }
  for (const [key, value] of [["startedAt", startedAt], ["completedAt", completedAt]] as const) {
    const date = parseDate(value);
    if (date === null) return null;
    if (date) variables[key] = date;
  }
  return variables;
}

/** The body of POST /api/list/entry/delete: the entry id, or null. */
export function parseDeleteEntry(body: unknown): number | null {
  const id = typeof body === "object" && body !== null ? (body as Record<string, unknown>).id : undefined;
  return isInt(id, 1, MAX_GRAPHQL_INT) ? id : null;
}
