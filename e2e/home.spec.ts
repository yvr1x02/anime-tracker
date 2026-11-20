import { expect, test } from "@playwright/test";
import { seasonLabel } from "../src/lib/anime-labels";
import { currentSeason } from "../src/lib/season";

// Season data from e2e/fake-anilist.mjs: Hoshi no Kioku, Senza palinsesto, Lista personalizzata.
test("the Home shows the current season, most popular first", async ({ page }) => {
  const { season, year } = currentSeason();
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${seasonLabel[season]}${year}`);
  await expect(page.getByText("Stagione in corso")).toBeVisible();
  const cards = page.getByRole("region", { name: "Gli anime della stagione" }).getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).getByRole("link", { name: "Hoshi no Kioku", exact: true })).toHaveAttribute("href", "/anime/1");
});

test("logged out, a season card's + leads to the login", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Accedi con AniList per aggiungere «Senza palinsesto» alla tua lista" }).click();

  await expect(page).toHaveURL("/accesso?da=%2F");
});
