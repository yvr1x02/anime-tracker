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

export type BackAnimations = { copies: number; mostAtOnce: number; pageFades: number };

/**
 * Records the way back drawn by hand (cover-transition.tsx) from now on: copies of the cover added to the page, the
 * most of them on the page at once, and fades of the page's content. Read with `backAnimations`.
 */
export async function recordBackAnimations(page: Page) {
  await page.evaluate(() => {
    const seen: BackAnimations = { copies: 0, mostAtOnce: 0, pageFades: 0 };
    Object.assign(window, { __backAnimations: seen });
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) if (node instanceof HTMLElement && "coverFlight" in node.dataset) seen.copies++;
      seen.mostAtOnce = Math.max(seen.mostAtOnce, document.querySelectorAll("[data-cover-flight]").length);
    }).observe(document.body, { childList: true });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
      if (this.id === "contenuto") seen.pageFades++;
      return animate.apply(this, args);
    };
  });
}

export function backAnimations(page: Page): Promise<BackAnimations> {
  return page.evaluate(() => (window as unknown as { __backAnimations: BackAnimations }).__backAnimations);
}
