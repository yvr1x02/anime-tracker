"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The header's Cerca (docs/DESIGN.md, "Header e navigazione"): text and shortcut from 640px, the lens alone
 * below. The shortcut is written only in the browser, which knows whether it runs on a Mac.
 */
export function SearchButton() {
  const mac = useSyncExternalStore(noSubscription, isMac, () => null);

  return (
    <Link
      href="/ricerca"
      aria-keyshortcuts="Meta+K Control+K"
      className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control text-small font-medium text-ink-muted hover:text-ink sm:px-3"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M12.5 12.5L17 17" />
      </svg>
      {/* The name is "Cerca" at every width: the text is only hidden visually on phones. */}
      <span className="sr-only sm:not-sr-only">Cerca</span>
      {mac !== null && (
        <kbd aria-hidden="true" className="hidden rounded-[0.25rem] border border-border-strong px-1.5 text-label sm:inline">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      )}
    </Link>
  );
}
