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
export function useMyList(enabled = true) {
  return useQuery({
    queryKey: MY_LIST_KEY,
    queryFn: ({ signal }) => fetchMyList(signal),
    staleTime: Infinity,
    enabled,
  });
}

/**
 * Where an anime stands for this viewer: unknown while the browser reads the cookie, logged out, or logged
 * in with its entry (null when not in the list). A session AniList ended counts as logged out.
 */
export function useListEntry(mediaId: number, loggedIn: boolean | undefined) {
  const list = useMyList(loggedIn === true);
  if (loggedIn === undefined) return { state: "unknown" } as const;
  if (!loggedIn || list.error instanceof NotLoggedInError) return { state: "logged-out" } as const;
  return { state: "logged-in", entry: list.data?.find((item) => item.media.id === mediaId) ?? null } as const;
}

export type DemoList = { userName: string; entries: ListEntry[] };

/**
 * Without login, Cosa guardo stasera? uses the demo profile's public list from our server (cached there for
 * an hour). Only asked for once a time is picked; a 404 means the demo profile is not available.
 */
export function useDemoList(enabled: boolean) {
  return useQuery({
    queryKey: ["demo-list"],
    queryFn: ({ signal }) => callListApi<DemoList>("/api/demo-list", { signal }),
    staleTime: 60 * 60 * 1000,
    enabled,
  });
}
