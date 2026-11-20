import { afterEach, describe, expect, it, vi } from "vitest";
import { TypedDocumentString } from "@/gql/graphql";
import { AniListError, AniListRateLimitError, requestAniList } from "./client";

const query = new TypedDocumentString<{ Media: { id: number } }, { id: number }>(
  "query Test($id: Int) { Media(id: $id) { id } }",
);

function mockFetch(response: Response | Error) {
  const spy = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal("fetch", spy);
  return spy;
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, ...init });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("requestAniList", () => {
  it("posts the query and variables and returns data with AniList's Date", async () => {
    const date = "Thu, 19 Nov 2026 16:21:38 GMT";
    const spy = mockFetch(json({ data: { Media: { id: 1 } } }, { headers: { Date: date } }));

    const result = await requestAniList(query, { id: 1 }, {}, "https://example.test/graphql");

    expect(result).toEqual({ data: { Media: { id: 1 } }, fetchedAt: date });
    expect(spy).toHaveBeenCalledWith(
      "https://example.test/graphql",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: query.toString(), variables: { id: 1 } }),
      }),
    );
  });

  it("reads Retry-After on a 429", async () => {
    mockFetch(new Response(null, { status: 429, headers: { "Retry-After": "30" } }));

    const error = await requestAniList(query, { id: 1 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AniListRateLimitError);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 30 });
  });

  it("falls back to X-RateLimit-Reset, the only header browsers can read", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-19T16:00:00Z"));
    const reset = Date.parse("2026-11-19T16:00:42Z") / 1000;
    mockFetch(new Response(null, { status: 429, headers: { "X-RateLimit-Reset": String(reset) } }));

    await expect(requestAniList(query, { id: 1 })).rejects.toMatchObject({ retryAfterSeconds: 42 });
  });

  it("reports no wait time when AniList gives none", async () => {
    mockFetch(new Response(null, { status: 429 }));

    await expect(requestAniList(query, { id: 1 })).rejects.toMatchObject({ retryAfterSeconds: null });
  });

  it("keeps the status of a GraphQL error, such as a missing anime", async () => {
    mockFetch(json({ data: { Media: null }, errors: [{ message: "Not Found.", status: 404 }] }, { status: 404 }));

    const error = await requestAniList(query, { id: 1 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AniListError);
    expect(error).toMatchObject({ status: 404, message: "Not Found." });
  });

  it("rejects GraphQL errors even with HTTP 200", async () => {
    mockFetch(json({ data: null, errors: [{ message: "Invalid query" }] }));

    await expect(requestAniList(query, { id: 1 })).rejects.toMatchObject({ status: 200, message: "Invalid query" });
  });

  it("rejects a response that is not JSON", async () => {
    mockFetch(new Response("<html>Bad gateway</html>", { status: 502 }));

    await expect(requestAniList(query, { id: 1 })).rejects.toMatchObject({ status: 502 });
  });

  it("wraps network failures", async () => {
    mockFetch(new TypeError("fetch failed"));

    const error = await requestAniList(query, { id: 1 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AniListError);
    expect(error).toMatchObject({ status: undefined });
  });
});
