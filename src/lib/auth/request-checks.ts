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
