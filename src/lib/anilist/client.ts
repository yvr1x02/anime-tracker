import type { TypedDocumentString } from "@/gql/graphql";

export const ANILIST_URL = "https://graphql.anilist.co";

export type AniListResult<T> = {
  data: T;
  /** When AniList produced the data (its `Date` header): it stays in the fetch cache with the body. */
  fetchedAt: string | null;
};

export class AniListError extends Error {
  /** HTTP or GraphQL status; undefined when the request never got an answer. */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AniListError";
    this.status = status;
  }
}

export class AniListRateLimitError extends AniListError {
  /** Seconds to wait, or null when AniList did not say. */
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super("AniList rate limit reached", 429);
    this.name = "AniListRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type GraphQLResponse<T> = {
  data?: T | null;
  errors?: { message: string; status?: number }[];
};

export async function requestAniList<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
  init: RequestInit = {},
  url: string = ANILIST_URL,
): Promise<AniListResult<TResult>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: document.toString(), variables }),
    });
  } catch (cause) {
    throw new AniListError(`AniList unreachable: ${String(cause)}`);
  }

  if (response.status === 429) {
    throw new AniListRateLimitError(retryAfterSeconds(response.headers));
  }

  const body = (await response.json().catch(() => null)) as GraphQLResponse<TResult> | null;
  const firstError = body?.errors?.[0];
  if (!response.ok || firstError || !body?.data) {
    throw new AniListError(
      firstError?.message ?? `AniList responded ${response.status}`,
      firstError?.status ?? response.status,
    );
  }

  return { data: body.data, fetchedAt: response.headers.get("Date") };
}

// Servers can read Retry-After; browsers only see X-RateLimit-Reset, the one AniList exposes through CORS.
function retryAfterSeconds(headers: Headers): number | null {
  const retryAfter = Number(headers.get("Retry-After"));
  if (headers.has("Retry-After") && Number.isFinite(retryAfter)) return Math.max(0, Math.ceil(retryAfter));

  const reset = Number(headers.get("X-RateLimit-Reset"));
  if (headers.has("X-RateLimit-Reset") && Number.isFinite(reset)) {
    return Math.max(0, Math.ceil(reset - Date.now() / 1000));
  }
  return null;
}
