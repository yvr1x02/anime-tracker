"use client";

import { dataFreshnessMessage } from "@/lib/data-freshness";
import { useNow } from "@/lib/use-now";

/**
 * ADR-0003's neutral note when the data is older than its cache time. Checked in the browser:
 * the page HTML is cached too, so the server's clock at render time says nothing about the visit.
 */
export function DataFreshness({ fetchedAt, maxAgeSeconds }: { fetchedAt: string | null; maxAgeSeconds: number }) {
  const now = useNow();
  const message = now === null ? null : dataFreshnessMessage(fetchedAt, maxAgeSeconds, now);
  return message && <p className="text-small text-ink-muted">{message}</p>;
}
