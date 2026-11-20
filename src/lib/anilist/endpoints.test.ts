import { afterEach, describe, expect, it, vi } from "vitest";
import { ANILIST_API_URL, ANILIST_OAUTH_URL, aniListEndpoints, assertRealAniListOnVercel } from "./endpoints";

describe("aniListEndpoints", () => {
  it("uses AniList's own addresses by default", () => {
    expect(aniListEndpoints({})).toEqual({ api: ANILIST_API_URL, oauth: ANILIST_OAUTH_URL });
  });

  it("lets the tests point at a fake AniList", () => {
    const env = { ANILIST_API_URL: "http://localhost:3999", ANILIST_OAUTH_URL: "http://localhost:3999/oauth" };
    expect(aniListEndpoints(env)).toEqual({ api: env.ANILIST_API_URL, oauth: env.ANILIST_OAUTH_URL });
  });
});

describe("assertRealAniListOnVercel", () => {
  it("accepts any address outside Vercel, as the e2e tests need", () => {
    expect(() => assertRealAniListOnVercel({ ANILIST_API_URL: "http://localhost:3999" })).not.toThrow();
  });

  it("accepts AniList's addresses on Vercel, set or left empty", () => {
    expect(() => assertRealAniListOnVercel({ VERCEL: "1" })).not.toThrow();
    expect(() =>
      assertRealAniListOnVercel({ VERCEL: "1", ANILIST_API_URL, ANILIST_OAUTH_URL }),
    ).not.toThrow();
  });

  it.each([
    ["ANILIST_API_URL", "http://localhost:3999"],
    ["ANILIST_API_URL", "https://graphql.anilist.co.example.com"],
    ["ANILIST_OAUTH_URL", "http://localhost:3999/oauth"],
    ["ANILIST_OAUTH_URL", "https://anilist.co/api/v2/oauth/../../evil"],
  ])("refuses %s=%s on Vercel", (name, value) => {
    expect(() => assertRealAniListOnVercel({ VERCEL: "1", [name]: value })).toThrow(name);
  });
});

describe("next.config.ts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("stops the build and the server on Vercel with a fake AniList", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ANILIST_OAUTH_URL", "http://localhost:3999/oauth");
    await expect(import("../../../next.config")).rejects.toThrow("ANILIST_OAUTH_URL");
  });
});
