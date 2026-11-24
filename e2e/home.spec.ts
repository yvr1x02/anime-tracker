import { type APIRequestContext, type Page, expect, test } from "@playwright/test";
import { seasonLabel } from "../src/lib/anime-labels";
import { currentSeason } from "../src/lib/season";
import { FAKE_ANILIST } from "./session";

/** The browser's clock at noon of the fake's day, as in e2e/calendar.spec.ts: the strip then has its episodes. */
async function atNoon(page: Page, request: APIRequestContext, plusHours = 0) {
  const { noon } = await (await request.get(`${FAKE_ANILIST}/__started`)).json();
  await page.clock.setFixedTime((noon + plusHours * 3600) * 1000);
}

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
  // Logged out, with nothing above the grid, its heading is for screen readers only.
  await expect(page.getByRole("heading", { name: "Gli altri anime della stagione" })).toHaveCSS("position", "absolute");
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

test("at 1280×800, with the strip, the first row starts above the fold with at least 100px of covers", async ({ page, request }) => {
  // docs/DESIGN.md, "Home" (rule of 2026-11-23): the first row begins within 800px, its covers at least 100px in.
  await atNoon(page, request);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "In onda ora" })).toBeVisible();
  const firstRow = page.getByRole("region", { name: "Gli altri anime della stagione" }).getByRole("article");
  await expect(firstRow.first()).toBeVisible();

  const tops = await firstRow.evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().top));
  expect(Math.max(...tops)).toBeLessThanOrEqual(800 - 100);
});

test.describe("In onda ora", () => {
  test("appearing, it moves nothing: its room is kept from the server's page (CLS)", async ({ page, request }) => {
    await atNoon(page, request);
    await page.addInitScript(() => {
      const shifts = { total: 0 };
      Object.assign(window, { __shifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
          if (!entry.hadRecentInput) shifts.total += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/");
    await expect(page.getByRole("region", { name: "In onda ora" })).toBeVisible();
    await page.waitForTimeout(500);

    expect(await page.evaluate(() => (window as unknown as { __shifts: { total: number } }).__shifts.total)).toBeLessThan(0.01);
  });

  test("its items are 44px tall to touch, as tall as the strip", async ({ page, request }) => {
    await atNoon(page, request);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const strip = page.getByRole("region", { name: "In onda ora" });

    for (const box of await strip.getByRole("link").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height)))
      expect(box).toBeGreaterThanOrEqual(44);
    expect((await strip.boundingBox())!.height).toBe(44);
  });

  test.use({ timezoneId: "Europe/Rome" });

  // At noon: Hoshi no Kioku Ep. 13 at 14:00 and Senza palinsesto Ep. 1 at 15:00; the adult anime tomorrow never shows.
  test("shows the next 24 hours as links, each once for screen readers and the keyboard", async ({ page, request }) => {
    await atNoon(page, request);
    await page.goto("/");
    const strip = page.getByRole("region", { name: "In onda ora" });

    const items = strip.getByRole("link");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toHaveText(/^Hoshi no Kioku · Ep\. 13 · (lun|mar|mer|gio|ven|sab|dom) 14:00$/);
    await expect(items.first()).toHaveAttribute("href", "/anime/1");
    await expect(items.nth(1)).toContainText("Senza palinsesto · Ep. 1");
    await expect(strip.locator("ul[inert]")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByText("Solo per adulti")).toHaveCount(0);
  });

  test("it moves by itself; Pausa stops it and Riprendi starts it again", async ({ page, request }) => {
    await atNoon(page, request);
    await page.goto("/");
    const strip = page.getByRole("region", { name: "In onda ora" });
    const track = strip.locator(".airing-strip-track");
    await expect(track).toHaveCSS("animation-name", "strip-scroll");
    await expect(track).toHaveCSS("animation-play-state", "running");

    await strip.getByRole("button", { name: "Pausa" }).click();
    // Paused by the button, not only by the focus it has.
    await page.mouse.move(0, 0);
    await page.getByRole("heading", { level: 1 }).click();
    await expect(track).toHaveCSS("animation-play-state", "paused");

    await strip.getByRole("button", { name: "Riprendi" }).click();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(track).toHaveCSS("animation-play-state", "running");
  });

  test("focus on an item stops it", async ({ page, request }) => {
    await atNoon(page, request);
    await page.goto("/");
    const strip = page.getByRole("region", { name: "In onda ora" });

    await strip.getByRole("link").first().focus();
    await expect(strip.locator(".airing-strip-track")).toHaveCSS("animation-play-state", "paused");
  });

  test("with reduced motion it stands still, without the copy nor the button", async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await atNoon(page, request);
    await page.goto("/");
    const strip = page.getByRole("region", { name: "In onda ora" });

    await expect(strip.getByRole("link")).toHaveCount(2);
    await expect(strip.locator(".airing-strip-track")).toHaveCSS("animation-name", "none");
    await expect(strip.locator("ul[inert]")).toBeHidden();
    await expect(strip.getByRole("button")).toBeHidden();
  });

  test("nothing airing in the next 24 hours: no strip", async ({ page, request }) => {
    // Four days after noon: Serie in corso was the day before, Hoshi no Kioku Ep. 14 is three days on.
    await atNoon(page, request, 4 * 24);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(page.getByRole("region", { name: "In onda ora" })).toHaveCount(0);
  });
});
