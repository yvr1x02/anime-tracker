import { type NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/auth/request-checks";
import { authorizeUrl, newState, oauthConfig, setOAuthState } from "@/lib/auth/server";

/** Starts the Authorization Code Grant (ADR-0004): a fresh `state` in a cookie, then off to AniList. */
export function GET(request: NextRequest) {
  const config = oauthConfig();
  if (!config) return NextResponse.redirect(new URL("/accesso?esito=non-disponibile", request.url));

  const state = newState();
  const response = NextResponse.redirect(authorizeUrl(config, state));
  setOAuthState(response, state, safeReturnPath(request.nextUrl.searchParams.get("da")));
  return response;
}
