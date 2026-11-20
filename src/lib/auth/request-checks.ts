import { AniListError } from "@/lib/anilist/client";

/** Only paths inside the app: "/ricerca?q=x" yes; "//evil.example", "https://…", "/\\evil" no. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  const base = "http://app.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}` : "/";
  } catch {
    return "/";
  }
}

/**
 * CSRF check for POSTs that use the session (ADR-0004): the browser's Origin must be this site.
 * A missing Origin is refused too: modern browsers always send it on POST.
 */
export function isSameOrigin(originHeader: string | null, requestUrl: string): boolean {
  return originHeader !== null && originHeader === new URL(requestUrl).origin;
}

/**
 * The token no longer works: the session ends and both cookies go (ADR-0004, point 7). AniList answers an
 * invalid token with HTTP 400 "Invalid token" (checked on 2026-11-20); 401 is covered too.
 */
export function isInvalidTokenError(error: unknown): boolean {
  return error instanceof AniListError && (error.status === 401 || error.message === "Invalid token");
}
