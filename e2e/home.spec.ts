import { expect, test } from "@playwright/test";
import { seasonLabel } from "../src/lib/anime-labels";
import { currentSeason } from "../src/lib/season";

// Season data from e2e/fake-anilist.mjs: Hoshi no Kioku, Senza palinsesto, Lista personalizzata.
test("the Home shows the current season, most popular first", async ({ page }) => {
  const { season, year } = currentSeason();
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${seasonLabel[season]}${year}`);
  await expect(page.getByText("Stagione in corso")).toBeVisible();
  // The most popular is featured in the header, with its next episode; the others are in the grid.
  const featured = page.getByRole("article", { name: "Hoshi no Kioku" });
  await expect(featured).toContainText("N. 1 della stagione");
  await expect(featured.getByRole("link", { name: "Hoshi no Kioku", exact: true })).toHaveAttribute("href", "/anime/1");
  await expect(featured).toContainText("Prossimo episodio: Ep. 13");
  const cards = page.getByRole("region", { name: "Gli altri anime della stagione" }).getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Senza palinsesto");
});

test("logged out, a season card's + leads to the login", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Accedi con AniList per aggiungere «Senza palinsesto» alla tua lista" }).click();

  await expect(page).toHaveURL("/accesso?da=%2F");
});

test("logged out, the Home has no Continua a guardare and no space waiting for it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("article", { name: "Hoshi no Kioku" })).toBeVisible();
  // Give the browser time to read the cookie: nothing personal may appear.
  await page.waitForTimeout(500);

  await expect(page.getByRole("heading", { name: "Continua a guardare" })).toHaveCount(0);
  await expect(page.locator("[aria-busy]")).toHaveCount(0);
});
