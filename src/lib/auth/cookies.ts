// Shared by server and browser: no secrets here, only names, lifetimes and the display cookie's format.

/** The AniList token, HttpOnly: the page's JavaScript never sees it (ADR-0004). */
export const SESSION_COOKIE = "__Host-session";
/** Id and name of the logged-in user, readable by the page only to show the name (ADR-0004, point 7). */
export const VIEWER_COOKIE = "__Host-viewer";
/** OAuth `state` and the page to return to, for the 10 minutes of a login. */
export const OAUTH_STATE_COOKIE = "__Host-oauth-state";

/** 30 days, shorter than AniList's one-year token. The viewer cookie uses the same. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3600;
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export type Viewer = { id: number; name: string };

// base64url: characters no cookie encoding touches, so the value reads back the same in the browser.
function toBase64Url(text: string): string {
  const binary = String.fromCharCode(...new TextEncoder().encode(text));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function serializeViewer(viewer: Viewer): string {
  return toBase64Url(JSON.stringify({ id: viewer.id, name: viewer.name }));
}

/** The viewer from a `document.cookie` string, or null. Display only: never a reason to grant access. */
export function viewerFromCookies(cookieHeader: string): Viewer | null {
  const raw = cookieHeader
    .split(/;\s*/)
    .find((cookie) => cookie.startsWith(`${VIEWER_COOKIE}=`))
    ?.slice(VIEWER_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(fromBase64Url(raw));
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      "name" in value &&
      Number.isInteger(value.id) &&
      typeof value.name === "string" &&
      value.name !== ""
    ) {
      return { id: value.id as number, name: value.name };
    }
  } catch {
    // A malformed cookie just means "not logged in" for display purposes.
  }
  return null;
}
