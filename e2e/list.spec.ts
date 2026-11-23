import { type Page, expect, test } from "@playwright/test";

// Demo list from e2e/fake-anilist.mjs (profile UtenteDemo).
test("without login, La mia lista shows the demo profile's public list, read only", async ({ page }) => {
  await page.goto("/lista");

  await expect(page.getByText("Modalità demo: lista pubblica di UtenteDemo su AniList, in sola lettura.")).toBeVisible();
  const cards = page.getByRole("article");
  // Entry 101 is also in a custom list, 104 only there; the adult anime (103) never shows.
  await expect(cards).toHaveCount(5);
  await expect(cards.filter({ hasText: "Hoshi no Kioku" })).toContainText("Sto guardando · 5 visti · voto 8,0");
  await expect(page.getByText("Solo per adulti")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Aggiungi|Modifica|Elimina/ })).toHaveCount(0);
});

test("status filters show their counts and only the chosen status", async ({ page }) => {
  await page.goto("/lista");
  const filters = page.getByRole("group", { name: "Filtra per stato" });
  await expect(filters.getByRole("button", { name: "Tutti (5)" })).toHaveAttribute("aria-pressed", "true");

  await filters.getByRole("button", { name: "Completato (1)" }).click();

  await expect(filters.getByRole("button", { name: "Completato (1)" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Senza palinsesto");

  await filters.getByRole("button", { name: "Droppato (0)" }).click();
  await expect(page.getByText("Nessun anime in «Droppato».")).toBeVisible();
});

// Demo scores: 8 (Hoshi no Kioku, Sto guardando), 8,5 (Senza palinsesto, Completato), 6 (Serie in corso).
test.describe("score chart", () => {
  const bar = (page: Page, name: RegExp) => page.getByRole("group", { name: "Filtra per voto" }).getByRole("button", { name });

  test("shows ten bars with their counts, and the same numbers in a table", async ({ page }) => {
    await page.goto("/lista");
    const bars = page.getByRole("group", { name: "Filtra per voto" }).getByRole("button");

    await expect(bars).toHaveCount(10);
    await expect(bar(page, /^Voto 8: 2 anime$/)).toHaveAttribute("aria-pressed", "false");
    await expect(bar(page, /^Voto 6: 1 anime$/)).toBeVisible();
    await expect(bar(page, /^Voto 1: 0 anime$/)).toBeVisible();

    const table = page.getByRole("table", { name: "Distribuzione dei voti" });
    await expect(table).toBeHidden();
    await page.getByText("Dati del grafico in tabella").click();
    await expect(table.getByRole("row", { name: "8 2" })).toBeVisible();
    await expect(table.getByRole("row", { name: "10 0" })).toBeVisible();
  });

  test("from the keyboard a bar filters, together with the status, and pressed again clears", async ({ page }) => {
    await page.goto("/lista");
    const statuses = page.getByRole("group", { name: "Filtra per stato" });

    await bar(page, /^Voto 8:/).focus();
    await page.keyboard.press("Enter");

    await expect(bar(page, /^Voto 8:/)).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\/lista\?voto=8$/);
    await expect(page.getByRole("article")).toHaveCount(2);

    await statuses.getByRole("button", { name: "Completato (1)" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toContainText("Senza palinsesto");

    await statuses.getByRole("button", { name: "Droppato (0)" }).click();
    await expect(page.getByText("Nessun anime con voto 8 in «Droppato».")).toBeVisible();

    await bar(page, /^Voto 8:/).focus();
    await page.keyboard.press("Space");
    await expect(bar(page, /^Voto 8:/)).toHaveAttribute("aria-pressed", "false");
    await expect(page).toHaveURL(/\/lista$/);
    await expect(page.getByText("Nessun anime in «Droppato».")).toBeVisible();
  });

  test("a bar with no anime gives an empty list with its message", async ({ page }) => {
    await page.goto("/lista");

    await bar(page, /^Voto 3:/).click();

    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByText("Nessun anime con voto 3.")).toBeVisible();
  });

  test("?voto= opens the list filtered and survives a reload; a bad value is ignored", async ({ page }) => {
    await page.goto("/lista?voto=6");
    await expect(bar(page, /^Voto 6:/)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toContainText("Serie in corso");

    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(1);

    await page.goto("/lista?voto=8.5");
    await expect(page.getByRole("article")).toHaveCount(5);
    await expect(page.getByRole("group", { name: "Filtra per voto" }).locator("[aria-pressed=true]")).toHaveCount(0);
  });

  test("bars change the address without adding history entries", async ({ page }) => {
    await page.goto("/ricerca");
    await page.goto("/lista");

    await bar(page, /^Voto 8:/).click();
    await bar(page, /^Voto 6:/).click();
    await expect(page).toHaveURL(/\?voto=6$/);
    await page.goBack();

    await expect(page).toHaveURL(/\/ricerca$/);
  });

  test("on a 390px phone the ten bars fit, each at least 24px wide", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lista");
    const bars = page.getByRole("group", { name: "Filtra per voto" }).getByRole("button");

    for (const box of await bars.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()))) {
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.right).toBeLessThanOrEqual(390 - 16);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test("the header marks La mia lista as the current page", async ({ page }) => {
  await page.goto("/lista");

  await expect(
    page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "La mia lista" }),
  ).toHaveAttribute("aria-current", "page");
});

test("/api/demo-list gives the demo profile's public list, for Cosa guardo stasera?", async ({ request }) => {
  const response = await request.get("/api/demo-list");

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.userName).toBe("UtenteDemo");
  expect(body.entries).toHaveLength(5);
});
