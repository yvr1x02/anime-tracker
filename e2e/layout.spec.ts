import { expect, test } from "@playwright/test";

const disclaimer =
  "Anime Tracker è un client non ufficiale per AniList, non affiliato ad AniList. Dati forniti da AniList.";

for (const path of ["/", "/pagina-che-non-esiste"]) {
  test(`footer with the AniList disclaimer on ${path}`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toHaveText(disclaimer);
    await expect(footer.getByRole("link", { name: "AniList" })).toHaveAttribute(
      "href",
      "https://anilist.co",
    );
  });
}

test("Italian 404 page", async ({ page }) => {
  const response = await page.goto("/pagina-che-non-esiste");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Pagina non trovata" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Pagina non trovata · Anime Tracker");
});

test("skip link moves keyboard focus past the header", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Vai al contenuto" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenuto$/);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCount(1);
  // The site header (banner), not the Home's own season header inside <main>.
  await expect(page.getByRole("banner").locator(":focus")).toHaveCount(0);
});

test.describe("on a 390px phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // Regression: the focused skip link used to cover the app name in the header.
  test("focused skip link sits above the header", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Vai al contenuto" });
    await expect(skipLink).toBeFocused();

    const skip = await skipLink.boundingBox();
    const header = await page.getByRole("banner").boundingBox();
    expect(skip!.y + skip!.height).toBeLessThanOrEqual(header!.y);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
});
