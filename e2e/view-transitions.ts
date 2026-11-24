import type { Page } from "@playwright/test";

/**
 * Records each View Transition the page starts, as the names of its animated parts ("cover-1", "root"), so a
 * test can tell a cover morph from a plain fade. Call before the page loads.
 */
export async function recordViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const recorded: string[][] = [];
    Object.assign(window, { __viewTransitions: recorded });
    const start = Document.prototype.startViewTransition;
    Document.prototype.startViewTransition = function (this: Document, update) {
      const transition = start.call(this, update);
      transition.ready.then(
        () =>
          recorded.push([
            ...new Set(
              document.documentElement
                .getAnimations({ subtree: true })
                .map((animation) => (animation.effect as KeyframeEffect).pseudoElement?.match(/^::view-transition-\w+\((.+)\)$/)?.[1])
                .filter((name): name is string => Boolean(name)),
            ),
          ]),
        () => recorded.push(["skipped"]),
      );
      return transition;
    };
  });
}

/** The animated names of each View Transition recorded so far. */
export function viewTransitions(page: Page): Promise<string[][]> {
  return page.evaluate(() => (window as unknown as { __viewTransitions: string[][] }).__viewTransitions);
}

/** Counts the covers that fly back by hand from now on (cover-transition.tsx), in `window.__coverFlights`. */
export async function recordCoverFlights(page: Page) {
  await page.evaluate(() => {
    const counter = { count: 0 };
    Object.defineProperty(window, "__coverFlights", { get: () => counter.count, configurable: true });
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) if (node instanceof HTMLElement && "coverFlight" in node.dataset) counter.count++;
    }).observe(document.body, { childList: true });
  });
}
