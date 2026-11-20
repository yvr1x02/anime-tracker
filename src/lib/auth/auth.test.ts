import { describe, expect, it } from "vitest";
import { VIEWER_COOKIE, serializeViewer, viewerFromCookies } from "./cookies";
import { AniListError, AniListRateLimitError } from "@/lib/anilist/client";
import { isInvalidTokenError, isSameOrigin, safeReturnPath } from "./request-checks";

describe("safeReturnPath", () => {
  it.each([
    ["/ricerca?q=frieren", "/ricerca?q=frieren"],
    ["/anime/1", "/anime/1"],
    ["/lista", "/lista"],
  ])("keeps %s", (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });

  it.each([null, undefined, "", "ricerca", "//evil.example", "/\\evil.example", "https://evil.example/", "javascript:alert(1)"])(
    "sends %j to the Home",
    (value) => {
      expect(safeReturnPath(value)).toBe("/");
    },
  );
});

describe("isSameOrigin", () => {
  const url = "https://anime-tracker-three.vercel.app/api/auth/logout";

  it("accepts this site", () => {
    expect(isSameOrigin("https://anime-tracker-three.vercel.app", url)).toBe(true);
  });

  it.each([null, "null", "https://evil.example", "http://anime-tracker-three.vercel.app"])("refuses %j", (origin) => {
    expect(isSameOrigin(origin, url)).toBe(false);
  });
});

describe("viewer cookie", () => {
  it("round-trips id and name, with other cookies around it", () => {
    const value = serializeViewer({ id: 42, name: "Utente; con = segni" });
    expect(viewerFromCookies(`a=1; ${VIEWER_COOKIE}=${value}; b=2`)).toEqual({ id: 42, name: "Utente; con = segni" });
  });

  it("keeps names with accents and symbols", () => {
    const value = serializeViewer({ id: 1, name: "Àlex_ñ" });
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(viewerFromCookies(`${VIEWER_COOKIE}=${value}`)).toEqual({ id: 1, name: "Àlex_ñ" });
  });

  it.each([
    "",
    "a=1",
    `${VIEWER_COOKIE}=`,
    `${VIEWER_COOKIE}=%7B`,
    `${VIEWER_COOKIE}=${btoa('{"id":"1","name":"x"}')}`,
    `${VIEWER_COOKIE}=${btoa('{"id":1,"name":""}')}`,
  ])(
    "is null for %j",
    (cookies) => {
      expect(viewerFromCookies(cookies)).toBeNull();
    },
  );
});

describe("isInvalidTokenError", () => {
  it("recognises AniList's answer to a bad token, and a 401", () => {
    expect(isInvalidTokenError(new AniListError("Invalid token", 400))).toBe(true);
    expect(isInvalidTokenError(new AniListError("Unauthorized", 401))).toBe(true);
  });

  it.each([new AniListError("Not Found.", 404), new AniListRateLimitError(30), new Error("Invalid token")])(
    "leaves other failures alone: %s",
    (error) => {
      expect(isInvalidTokenError(error)).toBe(false);
    },
  );
});
