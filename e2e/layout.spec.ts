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

test("the header has La mia lista, Calendario and Statistiche, then Cerca with its shortcut", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Principale" });

  await expect(nav.getByRole("link")).toHaveText(["La mia lista", "Calendario", "Statistiche"]);
  const search = page.getByRole("banner").getByRole("button", { name: "Cerca", exact: true });
  await expect(search).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
  await expect(search.locator("kbd")).toHaveText(/^(⌘K|Ctrl K)$/);
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
});

test.describe("header on a 360px phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("one row: the lens named Cerca, Accedi and Menu, with no sideways scroll", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");

    await expect(header.getByRole("button", { name: "Cerca", exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "Cerca", exact: true }).locator("kbd")).toBeHidden();
    await expect(header.getByRole("link", { name: "Accedi" })).toBeVisible();
    expect((await header.boundingBox())!.height).toBe(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  });

  test("Menu opens the items from the keyboard; Esc closes it and focus goes back to the button", async ({ page }) => {
    await page.goto("/calendario");
    const menu = page.getByRole("button", { name: "Menu" });
    const items = page.getByRole("navigation", { name: "Principale" }).getByRole("link");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(items.first()).toBeHidden();

    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(items).toHaveText(["La mia lista", "Calendario", "Statistiche"]);
    await expect(items.nth(1)).toHaveAttribute("aria-current", "page");

    await page.keyboard.press("Tab");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
  });

  test("leaving the menu with the focus closes it; picking an item goes there and closes it", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    const items = page.getByRole("navigation", { name: "Principale" }).getByRole("link");

    await menu.click();
    await items.last().focus();
    await page.keyboard.press("Tab");
    await expect(menu).toHaveAttribute("aria-expanded", "false");

    await menu.click();
    await items.getByText("Statistiche").click();
    await expect(page).toHaveURL(/\/statistiche$/);
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(items.first()).toBeHidden();
  });
});
