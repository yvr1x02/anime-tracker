import { expect, test } from "@playwright/test";
import { recordViewTransitions, viewTransitions } from "./view-transitions";

// docs/DESIGN.md, "View Transitions": card → Detail. Season data from e2e/fake-anilist.mjs; Hoshi no Kioku (1) is the featured anime.
test("the card's cover becomes the Detail's cover, focus goes to the title and back to the card", async ({ page }) => {
  await recordViewTransitions(page);
  await page.goto("/");
  const card = page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link");

  await card.click();

  await expect(page).toHaveURL("/anime/1");
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();
  await expect.poll(() => viewTransitions(page)).toEqual([expect.arrayContaining(["cover-1", "root"])]);

  // Back runs without a transition (React does not animate a popstate), but focus still finds the card.
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(card).toBeFocused();
});

test("with reduced motion nothing has a name: the page only fades", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordViewTransitions(page);
  await page.goto("/");

  await page.getByRole("heading", { level: 2, name: "Hoshi no Kioku" }).getByRole("link").click();

  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeFocused();
  await expect.poll(() => viewTransitions(page)).toEqual([["root"]]);
});

test("a Detail page opened directly leaves focus alone", async ({ page }) => {
  await page.goto("/anime/1");
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeVisible();

  await expect(page.locator("body")).toBeFocused();
});
