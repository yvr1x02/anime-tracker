import { expect, test } from "@playwright/test";

// Data and failures come from e2e/fake-anilist.mjs.
test.use({ timezoneId: "Europe/Rome" });

test("a page AniList can't provide shows the error page", async ({ page }) => {
  const response = await page.goto("/anime/5");

  expect(response?.status()).toBe(500);
  await expect(page).toHaveTitle("Pagina non disponibile · Anime Tracker");
  await expect(page.getByRole("heading", { level: 1, name: "Pagina non disponibile" })).toBeVisible();
  await expect(page.getByText("Non riesco a caricare i dati da AniList. Riprova tra qualche minuto.")).toBeVisible();
  await expect(page.getByText("Dati forniti da AniList")).toBeVisible();
});

test("Riprova loads the page once AniList answers again", async ({ page }) => {
  await page.goto("/anime/6");
  await expect(page.getByRole("heading", { level: 1, name: "Pagina non disponibile" })).toBeVisible();

  await page.getByRole("button", { name: "Riprova" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Errore passeggero" })).toBeVisible();
});

test("data older than its cache time says when it was fetched", async ({ page }) => {
  await page.goto("/anime/4");

  await expect(page.getByText(/^Dati aggiornati (al \d+ \w+ )?alle \d\d:\d\d\.$/)).toBeVisible();
});

test("fresh data has no note", async ({ page }) => {
  await page.goto("/anime/1");

  // The note, like the episode times, only appears once the browser knows its clock.
  await expect(page.getByText("nel fuso del tuo browser (Europe/Rome)")).toBeVisible();
  await expect(page.getByText(/Dati aggiornati/)).toHaveCount(0);
});
