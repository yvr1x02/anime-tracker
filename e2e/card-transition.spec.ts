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
