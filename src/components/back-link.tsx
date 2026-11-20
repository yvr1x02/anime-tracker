"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef } from "react";

// True once the visitor has moved between pages of the app, so "back" stays inside it.
let navigatedInApp = false;

/** Mounted once in the layout: notices client-side navigations. */
export function NavigationTracker() {
  const pathname = usePathname();
  const firstPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== firstPathname.current) navigatedInApp = true;
  }, [pathname]);

  return null;
}

/**
 * "← Torna indietro" (docs/DESIGN.md, Dettaglio): back in history when the previous page is in the app,
 * so a search keeps its results; otherwise, for a page opened directly, a plain link to the Home.
 */
export function BackLink() {
  const router = useRouter();

  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    const newTab = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!navigatedInApp || newTab) return;
    event.preventDefault();
    router.back();
  }

  return (
    <Link
      href="/"
      onClick={goBack}
      className="inline-flex min-h-11 items-center gap-1 rounded-control text-small text-cyan underline-offset-2 hover:underline"
    >
      <span aria-hidden="true">←</span> Torna indietro
    </Link>
  );
}
