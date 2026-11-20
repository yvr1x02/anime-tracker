"use client";

import { useQuery } from "@tanstack/react-query";
import { AniListError, AniListRateLimitError } from "@/lib/anilist/client";
import { NotLoggedInError } from "@/lib/auth/errors";
import type { ListEntry } from "@/lib/list";

export const MY_LIST_KEY = ["my-list"] as const;

/** Our server's answers turned into the errors the retry rules and the messages know. */
async function callListApi<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store", ...init });
  } catch (cause) {
    throw new AniListError(`List API unreachable: ${String(cause)}`);
  }
  if (response.status === 401) throw new NotLoggedInError();
  if (response.status === 429) {
    const body = (await response.json().catch(() => null)) as { retryAfterSeconds?: number | null } | null;
    throw new AniListRateLimitError(body?.retryAfterSeconds ?? null);
  }
  if (!response.ok) throw new AniListError("List API request failed", response.status);
  return (await response.json()) as T;
}

function fetchMyList(signal: AbortSignal): Promise<ListEntry[]> {
  return callListApi("/api/list", { signal });
}

/**
 * POST a change to our server. `keepalive` lets a change still in its 800ms wait reach the server when the
 * page is hidden or closed (ADR-0004); a same-origin fetch carries the cookie and Origin either way.
 */
export function postListChange<T>(path: "/api/list/entry" | "/api/list/entry/delete", body: unknown, keepalive = false) {
  return callListApi<T>(path, {
    method: "POST",
    keepalive,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The logged-in user's list, read once per session and then updated by each change (ADR-0004). */
export function useMyList() {
  return useQuery({
    queryKey: MY_LIST_KEY,
    queryFn: ({ signal }) => fetchMyList(signal),
    staleTime: Infinity,
  });
}
