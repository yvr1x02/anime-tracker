"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FocusEvent, type KeyboardEvent, useRef, useState } from "react";

// Ricerca left the list in M7: the header's Cerca button opens the quick search.
const items = [
  { href: "/lista", label: "La mia lista" },
  { href: "/calendario", label: "Calendario" },
  { href: "/statistiche", label: "Statistiche" },
] as const;

/**
 * Header navigation from 640px (docs/DESIGN.md, "Header e navigazione"): the current page has aria-current and
 * the bar. Below 640px it is not displayed, so the one landmark is PhoneNav's.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principale" className="hidden sm:block">
      <ul className="flex">
        {items.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="nav-link relative flex min-h-11 items-center rounded-control px-3 text-small whitespace-nowrap font-medium text-ink-muted hover:text-ink aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Below 640px: a Menu button opening the items under the header (APG disclosure navigation, not role="menu").
 * Esc closes it and gives focus back to the button; leaving it with the focus, or picking an item, closes it.
 */
export function PhoneNav() {
  const pathname = usePathname();
  // Open for the page it was opened on: a new page closes it, whatever led there.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const button = useRef<HTMLButtonElement>(null);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    button.current?.focus();
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  return (
    <nav aria-label="Principale" onKeyDown={onKeyDown} onBlur={onBlur} className="sm:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="menu-principale"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 text-small font-medium"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
          {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
        {/* Under 360px only the icon: the header's row must fit 320px (WCAG 1.4.10). The name stays Menu. */}
        <span className="max-[359px]:sr-only">Menu</span>
      </button>
      <ul id="menu-principale" hidden={!open} className="absolute inset-x-0 top-16 border-b border-border bg-surface py-2">
        {items.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center border-l-2 border-transparent px-4 font-medium text-ink-muted aria-[current=page]:border-ink aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
