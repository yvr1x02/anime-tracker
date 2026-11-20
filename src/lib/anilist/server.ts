import type { TypedDocumentString } from "@/gql/graphql";
import { requestAniList } from "./client";
import { aniListEndpoints } from "./endpoints";

/**
 * Server-side AniList request through Next's fetch cache (ADR-0003): stale data keeps being served
 * if a refresh fails. ANILIST_API_URL lets the e2e tests point the server at a fake AniList.
 */
export function requestAniListCached<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
  revalidateSeconds: number,
) {
  return requestAniList(
    document,
    variables,
    { cache: "force-cache", next: { revalidate: revalidateSeconds } },
    aniListEndpoints().api,
  );
}
