"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages join the list as they arrive (La mia lista in M2, Calendario in M4…).
const items = [{ href: "/ricerca", label: "Ricerca" }] as const;

/** Header navigation (docs/DESIGN.md, "Header e navigazione"): the current page has aria-current and the bar. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principale">
      <ul className="flex">
        {items.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="nav-link relative flex min-h-11 items-center rounded-control px-3 text-small font-medium text-ink-muted hover:text-ink aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
