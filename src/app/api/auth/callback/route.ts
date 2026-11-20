import { type NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/auth/cookies";
import { safeReturnPath } from "@/lib/auth/request-checks";
import {
  clearOAuthState,
  exchangeCodeForToken,
  fetchViewer,
  logLoginFailure,
  oauthConfig,
  readOAuthState,
  setSession,
} from "@/lib/auth/server";

/** AniList sends the user back here with `code` and `state` (ADR-0004). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = readOAuthState(request.cookies.get(OAUTH_STATE_COOKIE)?.value);
  const config = oauthConfig();

  function backToLogin(outcome: "annullato" | "errore" | "non-disponibile") {
    const response = NextResponse.redirect(new URL(`/accesso?esito=${outcome}`, request.url));
    clearOAuthState(response);
    return response;
  }

  if (!config) return backToLogin("non-disponibile");
  if (params.has("error")) return backToLogin("annullato");
  const code = params.get("code");
  // No saved state, or a different one: the login didn't start here. Refused (CSRF on login).
  if (!saved || !code || params.get("state") !== saved.state) return backToLogin("errore");

  let token: string;
  try {
    token = await exchangeCodeForToken(config, code);
  } catch (error) {
    logLoginFailure("token", error);
    return backToLogin("errore");
  }

  let viewer;
  try {
    viewer = await fetchViewer(token);
  } catch (error) {
    logLoginFailure("viewer", error);
    return backToLogin("errore");
  }

  const response = NextResponse.redirect(new URL(safeReturnPath(saved.returnTo), request.url));
  setSession(response, token, viewer);
  clearOAuthState(response);
  return response;
}
