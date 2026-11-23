import { type Page, expect, test } from "@playwright/test";

// Demo list from e2e/fake-anilist.mjs: Hoshi no Kioku (Sto guardando, 5 × 24 min, voto 8), Serie in corso
// (Sto guardando, 3 × 24 min, voto 6), Senza palinsesto (Completato, 1 × 90 min, voto 8,5), two in Da vedere.
const number = (page: Page, label: string) => page.locator("dl > div").filter({ hasText: label }).locator("dd");

test("without login, Statistiche shows the demo list's numbers, with the notice", async ({ page }) => {
  await page.goto("/statistiche");

  await expect(page.getByRole("heading", { level: 1, name: "Statistiche" })).toBeVisible();
  await expect(page.getByText("Modalità demo: lista pubblica di UtenteDemo su AniList, in sola lettura.")).toBeVisible();
  await expect(number(page, "Episodi visti")).toHaveText("9");
  // 120 + 72 + 90 minutes = 4,7 hours.
  await expect(number(page, "Ore guardate")).toHaveText("5");
  await expect(number(page, "Voto medio")).toHaveText("7,5");
  await expect(number(page, "Sto guardando")).toHaveText("2");
  await expect(number(page, "Da vedere")).toHaveText("2");
  await expect(number(page, "Completato")).toHaveText("1");
  await expect(number(page, "Droppato")).toHaveText("0");
});

test("genres and studios leave out Da vedere, ties in alphabetical order", async ({ page }) => {
  await page.goto("/statistiche");

  const genres = page.getByRole("table", { name: /generi per numero di anime/ }).getByRole("row");
  await expect(genres).toHaveText([/Genere\s*Anime/, /Fantascienza\s*2/, /Avventura\s*1/, /Azione\s*1/, /Isekai\s*1/]);
  await expect(page.getByRole("rowheader", { name: "Isekai" })).toHaveAttribute("lang", "en");
  await expect(page.getByText("Sentimentale")).toHaveCount(0);

  // Studio Notte would count 2 with Film lungo, which is in Da vedere.
  const studios = page.getByRole("region", { name: "Studi più presenti" }).getByRole("listitem");
  await expect(studios).toHaveText(["Studio di Prova · 1 anime", "Studio Notte · 1 anime"]);
});

test("a score bar is a link to La mia lista filtered on that score", async ({ page }) => {
  await page.goto("/statistiche");
  const chart = page.getByRole("region", { name: "Distribuzione dei voti" });
  await expect(chart.getByRole("link")).toHaveCount(10);

  await chart.getByRole("link", { name: "Voto 8: 2 anime, apri La mia lista" }).focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/lista\?voto=8$/);
  await expect(page.getByRole("button", { name: "Voto 8: 2 anime" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("the header marks Statistiche as the current page", async ({ page }) => {
  await page.goto("/statistiche");

  await expect(
    page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Statistiche" }),
  ).toHaveAttribute("aria-current", "page");
});

test("on a 390px phone the page does not scroll sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/statistiche");
  await expect(number(page, "Episodi visti")).toBeVisible();

  // The header's own sideways scroll (until M7's menu) is inside the nav, not the page.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
