import { expect, test } from "@playwright/test";
import { mockAniList, searchResults } from "./anilist-browser";

const ok = { status: 200, media: searchResults };

test("searches once, 400ms after typing stops and from 3 characters", async ({ page }) => {
  const searches = await mockAniList(page, [ok]);
  await page.goto("/ricerca");
  const field = page.getByRole("searchbox", { name: "Titolo dell'anime" });

  await field.pressSequentially("ho");
  await page.waitForTimeout(800);
  expect(searches).toEqual([]);

  await field.pressSequentially("shi", { delay: 100 });
  await expect(page.getByRole("status")).toHaveText("2 risultati per «hoshi»");
  expect(searches).toEqual(["hoshi"]);
  await expect(page).toHaveURL("/ricerca?q=hoshi");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.first().getByRole("link", { name: "Hoshi no Kioku" })).toHaveAttribute("href", "/anime/1");
});

test("an address with ?q= fills the field and searches", async ({ page }) => {
  const searches = await mockAniList(page, [ok]);
  await page.goto("/ricerca?q=hoshi");

  await expect(page.getByRole("searchbox", { name: "Titolo dell'anime" })).toHaveValue("hoshi");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(searches).toEqual(["hoshi"]);
});

test("coming back from a detail page keeps the search, without a new request", async ({ page }) => {
  const searches = await mockAniList(page, [ok]);
  await page.goto("/ricerca");
  await page.getByRole("searchbox", { name: "Titolo dell'anime" }).fill("hoshi");
  await page.getByRole("link", { name: "Hoshi no Kioku" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole("searchbox", { name: "Titolo dell'anime" })).toHaveValue("hoshi");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(searches).toEqual(["hoshi"]);
});

test("the back button works after opening a search address directly", async ({ page }) => {
  await mockAniList(page, [ok]);
  await page.goto("/ricerca?q=hoshi");
  await page.getByRole("link", { name: "Hoshi no Kioku" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole("heading", { level: 1, name: "Ricerca" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("no results suggests romaji or English titles", async ({ page }) => {
  await mockAniList(page, [{ status: 200, media: [] }]);
  await page.goto("/ricerca?q=attacco");

  await expect(page.getByRole("status")).toHaveText(
    "Nessun risultato per «attacco». AniList conosce solo alcuni titoli italiani: prova con il titolo in romaji o in inglese.",
  );
});

test("a 429 says how long to wait, then retries once by itself", async ({ page }) => {
  const reset = String(Math.ceil(Date.now() / 1000) + 2);
  const searches = await mockAniList(page, [{ status: 429, headers: { "X-RateLimit-Reset": reset } }, ok]);
  await page.goto("/ricerca?q=hoshi");

  await expect(page.getByRole("status")).toHaveText(/^AniList sta ricevendo troppe richieste\. Riprovo tra [1-3] second[oi]\.$/);
  await expect(page.getByRole("article")).toHaveCount(2, { timeout: 6000 });
  expect(searches).toEqual(["hoshi", "hoshi"]);
});

test("a search that fails twice shows the error, and Riprova tries again", async ({ page }) => {
  const searches = await mockAniList(page, [{ status: 502 }, { status: 502 }, ok]);
  await page.goto("/ricerca?q=hoshi");

  await expect(page.getByRole("status")).toHaveText(
    "Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto.",
  );
  expect(searches).toHaveLength(2);

  await page.getByRole("button", { name: "Riprova" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(searches).toHaveLength(3);
});

test("the header marks Ricerca as the current page only there", async ({ page }) => {
  await page.goto("/ricerca");
  const link = page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Ricerca" });
  await expect(link).toHaveAttribute("aria-current", "page");

  await page.goto("/");
  await expect(link).not.toHaveAttribute("aria-current");
});

test("on a 390px phone the results are in two columns", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAniList(page, [ok]);
  await page.goto("/ricerca?q=hoshi");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(2);
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
  const [first, second] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
  expect(second!.y).toBe(first!.y);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width);
});
