"use client";

import { useSyncExternalStore } from "react";
import { type Viewer, viewerFromCookies } from "./cookies";

const noSubscription = () => () => {};

/**
 * The logged-in user from the display cookie: `undefined` until the browser has read it (server render and
 * hydration), then the viewer or null. For what to draw only, never for access (ADR-0004, point 7).
 */
export function useViewer(): Viewer | null | undefined {
  const cookies = useSyncExternalStore(
    noSubscription,
    () => document.cookie,
    () => undefined,
  );
  return cookies === undefined ? undefined : viewerFromCookies(cookies);
}
