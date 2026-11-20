import "server-only";
import { AniListError } from "@/lib/anilist/client";
import { UserAnimeListQuery } from "@/lib/anilist/queries";
import { requestAniListCached } from "@/lib/anilist/server";
import { listEntries } from "@/lib/list";

// ADR-0004: the demo list is the same for everyone, so it is cached for an hour like other public data.
export const DEMO_REVALIDATE_SECONDS = 3600;

/**
 * The demo profile's public list, or null when it is not set, does not exist or is not public. La mia lista
 * and Cosa guardo stasera? make the same request, so they share one fetch-cache entry.
 */
export async function readDemoList() {
  const userName = process.env.ANILIST_DEMO_USERNAME;
  if (!userName) return null;
  try {
    const { data, fetchedAt } = await requestAniListCached(UserAnimeListQuery, { userName }, DEMO_REVALIDATE_SECONDS);
    return { userName, entries: listEntries(data.MediaListCollection), fetchedAt };
  } catch (error) {
    if (error instanceof AniListError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}
