"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useViewer } from "@/lib/auth/use-viewer";

/**
 * "Accedi" or the user's name with "Esci". The name comes from the display cookie (ADR-0004, point 7):
 * shared pages stay cached because the server never reads cookies to draw the header.
 */
export function AccountMenu() {
  const viewer = useViewer();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  if (viewer === undefined) return null;

  if (!viewer) {
    const here = search ? `${pathname}?${search}` : pathname;
    return (
      <Link
        href={pathname === "/accesso" ? "/accesso" : `/accesso?da=${encodeURIComponent(here)}`}
        className="flex min-h-11 items-center rounded-control px-2 text-small font-medium whitespace-nowrap text-cyan sm:px-3"
      >
        Accedi
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Hidden on phones, where the header has room only for the navigation and "Esci". */}
      <span className="hidden max-w-40 truncate text-small text-ink-muted sm:inline">{viewer.name}</span>
      {/* A real form POST: the new page load also empties the in-memory query cache. */}
      <form method="post" action="/api/auth/logout">
        <button type="submit" className="flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-small font-medium whitespace-nowrap sm:px-3">
          Esci
        </button>
      </form>
    </div>
  );
}
