"use client";

import { useQuery } from "@tanstack/react-query";
import { AniListError, AniListRateLimitError } from "@/lib/anilist/client";
import { NotLoggedInError } from "@/lib/auth/errors";
import type { ListEntry } from "@/lib/list";

export const MY_LIST_KEY = ["my-list"] as const;

/** GET /api/list, with our server's answers turned into the errors the retry rules know. */
async function fetchMyList(signal: AbortSignal): Promise<ListEntry[]> {
  let response: Response;
  try {
    response = await fetch("/api/list", { signal, cache: "no-store" });
  } catch (cause) {
    throw new AniListError(`List unreachable: ${String(cause)}`);
  }
  if (response.status === 401) throw new NotLoggedInError();
  if (response.status === 429) {
    const body = (await response.json().catch(() => null)) as { retryAfterSeconds?: number | null } | null;
    throw new AniListRateLimitError(body?.retryAfterSeconds ?? null);
  }
  if (!response.ok) throw new AniListError("List request failed", response.status);
  return (await response.json()) as ListEntry[];
}

/** The logged-in user's list, read once per session and then updated by each change (ADR-0004). */
export function useMyList() {
  return useQuery({
    queryKey: MY_LIST_KEY,
    queryFn: ({ signal }) => fetchMyList(signal),
    staleTime: Infinity,
  });
}
