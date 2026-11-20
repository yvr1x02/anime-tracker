import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AniListError, AniListRateLimitError, requestAniList } from "@/lib/anilist/client";
import { aniListEndpoints } from "@/lib/anilist/endpoints";
import { ViewerQuery } from "@/lib/anilist/queries";
import { isInvalidTokenError } from "./request-checks";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_USER_COOKIE,
  VIEWER_COOKIE,
  type Viewer,
  serializeViewer,
} from "./cookies";

type OAuthConfig = { clientId: string; clientSecret: string; redirectUri: string };

/** The AniList application's credentials, or null where login is off (Vercel previews): fail closed. */
export function oauthConfig(): OAuthConfig | null {
  const { ANILIST_CLIENT_ID: clientId, ANILIST_CLIENT_SECRET: clientSecret, ANILIST_REDIRECT_URI: redirectUri } =
    process.env;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

// __Host- cookies need Secure and Path=/ with no Domain, on deletion too, or the browser ignores them.
const hostCookie = { secure: true, sameSite: "lax", path: "/" } as const;

export function authorizeUrl(config: OAuthConfig, state: string): URL {
  const url = new URL(`${aniListEndpoints().oauth}/authorize`);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  }).toString();
  return url;
}

export function newState(): string {
  return randomBytes(32).toString("base64url");
}

/** State and return path in one cookie, both in URL-safe characters. */
export function setOAuthState(response: NextResponse, state: string, returnTo: string) {
  const value = `${state}.${Buffer.from(returnTo).toString("base64url")}`;
  response.cookies.set(OAUTH_STATE_COOKIE, value, { ...hostCookie, httpOnly: true, maxAge: OAUTH_STATE_MAX_AGE_SECONDS });
}

export function readOAuthState(value: string | undefined): { state: string; returnTo: string } | null {
  const [state, returnTo] = value?.split(".") ?? [];
  return state && returnTo !== undefined ? { state, returnTo: Buffer.from(returnTo, "base64url").toString() } : null;
}

export function clearOAuthState(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...hostCookie, httpOnly: true, maxAge: 0 });
}

/** POST to AniList's token endpoint. Errors carry only the HTTP status, never the response body. */
export async function exchangeCodeForToken(config: OAuthConfig, code: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${aniListEndpoints().oauth}/token`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      }),
    });
  } catch {
    throw new AniListError("AniList token endpoint unreachable");
  }
  const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!response.ok || typeof body?.access_token !== "string") {
    throw new AniListError("AniList token exchange failed", response.status);
  }
  return body.access_token;
}

export async function fetchViewer(token: string): Promise<Viewer> {
  const { data } = await requestAniList(ViewerQuery, {}, authorizedInit(token), aniListEndpoints().api);
  if (!data.Viewer) throw new AniListError("AniList returned no viewer");
  return data.Viewer;
}

export function setSession(response: NextResponse, token: string, viewer: Viewer) {
  response.cookies.set(SESSION_COOKIE, token, { ...hostCookie, httpOnly: true, maxAge: SESSION_MAX_AGE_SECONDS });
  response.cookies.set(SESSION_USER_COOKIE, String(viewer.id), {
    ...hostCookie,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set(VIEWER_COOKIE, serializeViewer(viewer), {
    ...hostCookie,
    httpOnly: false,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Logout, and any 401 from AniList: both cookies go together (ADR-0004, point 7). */
export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...hostCookie, httpOnly: true, maxAge: 0 });
  response.cookies.set(SESSION_USER_COOKIE, "", { ...hostCookie, httpOnly: true, maxAge: 0 });
  response.cookies.set(VIEWER_COOKIE, "", { ...hostCookie, httpOnly: false, maxAge: 0 });
}

/** Token and user id from the HttpOnly cookies, or null. The only thing personal requests trust. */
export async function readSession(): Promise<{ token: string; userId: number } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const userId = Number(jar.get(SESSION_USER_COOKIE)?.value);
  return token && Number.isInteger(userId) && userId > 0 ? { token, userId } : null;
}

/** Status only: tokens, secrets and response bodies never reach the logs (ADR-0004, point 6). */
export function logLoginFailure(step: string, error: unknown) {
  console.error(`AniList login failed at ${step}: status ${error instanceof AniListError ? error.status : "unknown"}`);
}

/** Personal answers never sit in a shared cache (ADR-0004). */
export const noStore = { "Cache-Control": "private, no-store" };

export function notLoggedIn() {
  return NextResponse.json({ error: "not-logged-in" }, { status: 401, headers: noStore });
}

/**
 * A personal request to AniList failed. Invalid token: 401 and the session cookies go. 429: AniList's wait,
 * for the browser's single retry (ADR-0003). Anything else: 502, logged by status only.
 */
export function personalRequestFailed(error: unknown) {
  if (isInvalidTokenError(error)) {
    const response = notLoggedIn();
    clearSession(response);
    return response;
  }
  if (error instanceof AniListRateLimitError) {
    return NextResponse.json(
      { error: "rate-limited", retryAfterSeconds: error.retryAfterSeconds },
      { status: 429, headers: noStore },
    );
  }
  console.error(`AniList personal request failed: status ${error instanceof AniListError ? error.status : "unknown"}`);
  return NextResponse.json({ error: "anilist-unavailable" }, { status: 502, headers: noStore });
}

/** A request to AniList with the user's token, never cached. */
export function authorizedInit(token: string): RequestInit {
  return { cache: "no-store", headers: { Authorization: `Bearer ${token}` } };
}
