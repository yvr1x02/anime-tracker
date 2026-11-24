import { type Page, expect, test } from "@playwright/test";
import { FAKE_ANILIST, logIn, resetMyList } from "../e2e/session";

// The README's screenshots (playwright.screenshots.config.ts): still (reduced motion), at the fake's noon in Rome.
const OUT = "docs/screenshots";
test.use({ reducedMotion: "reduce", timezoneId: "Europe/Rome", locale: "it-IT" });

async function shoot(page: Page, name: string) {
  // Covers in place, fonts loaded, nothing still loading.
  await page.waitForFunction(() => [...document.images].every((image) => image.complete) && document.fonts.status === "loaded");
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 85 });
}

test("README screenshots", async ({ page, request }) => {
  const { noon } = await (await request.get(`${FAKE_ANILIST}/__started`)).json();
  await page.clock.setFixedTime((noon + 2 * 3600) * 1000);
  await resetMyList(request);
  await page.setViewportSize({ width: 1280, height: 800 });
  await logIn(page, "/");

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Continua a guardare" })).toBeVisible();
  await shoot(page, "home");

  await page.goto("/anime/23");
  await shoot(page, "dettaglio");

  await page.goto("/lista");
  await shoot(page, "la-mia-lista");

  await page.goto("/calendario");
  await shoot(page, "calendario");

  await page.goto("/statistiche");
  await shoot(page, "statistiche");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Continua a guardare" })).toBeVisible();
  await shoot(page, "home-telefono");
});
