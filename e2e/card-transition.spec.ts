import { expect, test } from "@playwright/test";
import { backAnimations, recordBackAnimations, recordViewTransitions, viewTransitions } from "./view-transitions";

// docs/DESIGN.md, "View Transitions": card → Detail. Season data from e2e/fake-anilist.mjs; Hoshi no Kioku (1) is the featured anime.
test("the card's cover becomes the Detail's cover, focus goes to the title and back to the card", async ({ page }) => {
  await recordViewTransitions(page);
  await page.goto("/");
  const card = page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link");

  await card.click();

  await expect(page).toHaveURL("/anime/1");
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();
  await expect.poll(() => viewTransitions(page)).toEqual([expect.arrayContaining(["cover-1", "root"])]);

  // Back has no View Transition (React does not animate a popstate): the cover flies back by hand.
  await recordBackAnimations(page);
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(card).toBeFocused();
  await expect.poll(() => backAnimations(page)).toEqual({ copies: 1, mostAtOnce: 1, pageFades: 1 });
  await expect(page.locator("[data-cover-flight]")).toHaveCount(0);
  await expect(page.locator(".featured-anime [data-cover]")).toHaveCSS("visibility", "visible");
});

test("with reduced motion nothing has a name: the page only fades", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordViewTransitions(page);
  await page.goto("/");

  await page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link").click();

  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();
  await expect.poll(() => viewTransitions(page)).toEqual([["root"]]);

  await recordBackAnimations(page);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link")).toBeFocused();
  await expect.poll(() => backAnimations(page)).toEqual({ copies: 0, mostAtOnce: 0, pageFades: 1 });
});

test("Back three times in a row while the cover flies: one copy at a time, none left, focus on the card", async ({ page }) => {
  // History: Home, Detail, Home, Detail. The first and third Back fly the cover home; the second stops the first.
  const featured = page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link");
  await page.goto("/");
  await featured.click();
  await expect(page).toHaveURL("/anime/1");
  await page.getByRole("banner").getByRole("link", { name: "Anime Tracker" }).click();
  await featured.click();
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();
  await recordBackAnimations(page);

  // 100ms apart: each Back lands inside the 400ms of the flight before.
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) {
      history.back();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  await expect(page).toHaveURL("/");
  await expect(featured).toBeFocused();
  await expect.poll(() => backAnimations(page)).toMatchObject({ copies: 2, mostAtOnce: 1 });
  await expect(page.locator("[data-cover-flight]")).toHaveCount(0);
  await expect(page.locator(".featured-anime [data-cover]")).toHaveCSS("visibility", "visible");
});

test("a Detail page opened directly leaves focus alone", async ({ page }) => {
  await page.goto("/anime/1");
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeVisible();

  await expect(page.locator("body")).toBeFocused();
});

test("a link clicked while the cover flies: the copy goes with the page, nothing left running", async ({ page }) => {
  const featured = page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link");
  await page.goto("/");
  await featured.click();
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();

  // Back, then Calendario 80ms into the 400ms flight; counted in the page, where Playwright's own steps take no time.
  const seen = await page.evaluate(async () => {
    const flying = () => document.querySelectorAll("[data-cover-flight]").length;
    history.back();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const during = flying();
    const card = document.querySelector<HTMLElement>(".featured-anime [data-cover]")!;
    document.querySelector<HTMLElement>('header a[href="/calendario"]')!.click();
    while (location.pathname !== "/calendario" || card.isConnected) await new Promise((resolve) => setTimeout(resolve, 5));
    await Promise.resolve();
    const running = document
      .getAnimations()
      .filter((animation) => ((animation.effect as KeyframeEffect).target as HTMLElement | null)?.dataset.coverFlight !== undefined);
    return { during, after: flying(), running: running.length, cardVisibility: card.style.visibility };
  });

  expect(seen).toEqual({ during: 1, after: 0, running: 0, cardVisibility: "" });
  await expect(page.locator("[data-cover-flight]")).toHaveCount(0);
});

// The card lifts by 6px (--y, a 400ms transition) under the pointer and with a keyboard focus ring.
for (const how of ["mouse", "keyboard"] as const) {
  test(`the copy lands where the card ends up, lifted (${how})`, async ({ page }) => {
    const featured = page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link");
    await page.goto("/");
    if (how === "mouse") {
      // The pointer stays on the card it clicked: back on the Home the card is under it.
      await featured.click();
    } else {
      await page.mouse.move(1, 1);
      await featured.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();
    // The copy's landing box is its own box: the flight animates only a transform, back to none.
    await page.evaluate(() => {
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes)
            if (node instanceof HTMLElement && "coverFlight" in node.dataset) {
              const { left, top, width, height } = node.style;
              Object.assign(window, { __landing: { x: parseFloat(left), y: parseFloat(top), width: parseFloat(width), height: parseFloat(height) } });
            }
      }).observe(document.body, { childList: true });
    });

    await page.goBack();

    await expect(featured).toBeFocused();
    await expect(page.locator("[data-cover-flight]")).toHaveCount(0);
    // Every finite animation done, including the card's lift (the airing strip loops for ever).
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity),
    );
    // The case under test: the card is lifted.
    expect(await page.locator(".featured-anime").evaluate((card) => getComputedStyle(card).getPropertyValue("--y"))).toBe("-6px");
    const landing = await page.evaluate(() => (window as unknown as { __landing: DOMRectInit }).__landing);
    const card = (await page.locator(".featured-anime [data-cover]").boundingBox())!;
    for (const side of ["x", "y", "width", "height"] as const) expect(Math.abs(landing[side]! - card[side])).toBeLessThanOrEqual(1);
  });
}
