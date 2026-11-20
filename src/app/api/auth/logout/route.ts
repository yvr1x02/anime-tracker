import { type NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/auth/request-checks";
import { clearSession } from "@/lib/auth/server";

/**
 * A plain form POST: the browser then loads a new page, so TanStack Query's in-memory cache, with the
 * user's data, is gone too (ADR-0004). 303 turns the POST into a GET of the page that explains revocation.
 */
export function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), request.url)) {
    return new NextResponse("Richiesta non valida.", { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/accesso?esito=uscito", request.url), 303);
  clearSession(response);
  return response;
}
