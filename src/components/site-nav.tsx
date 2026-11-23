"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages join the list as they arrive (Statistiche in M6…).
const items = [
  { href: "/ricerca", label: "Ricerca" },
  { href: "/lista", label: "La mia lista" },
  { href: "/calendario", label: "Calendario" },
] as const;

/** Header navigation (docs/DESIGN.md, "Header e navigazione"): the current page has aria-current and the bar. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    // On phones the items scroll sideways inside the 64px header (a stopgap until M7's mobile menu).
    <nav aria-label="Principale" className="nav-scroll min-w-0">
      <ul className="flex">
        {items.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="nav-link relative flex min-h-11 items-center rounded-control px-2 text-small whitespace-nowrap sm:px-3 font-medium text-ink-muted hover:text-ink aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
