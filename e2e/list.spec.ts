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
test.describe("score filter", () => {
  const label = (page: Page, score: number) => page.getByRole("button", { name: `Voto ${score}, togli il filtro` });

  test("La mia lista has no score chart, and no label without ?voto=", async ({ page }) => {
    await page.goto("/lista");

    await expect(page.getByRole("article")).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "Distribuzione dei voti" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /togli il filtro/ })).toHaveCount(0);
  });

  test("?voto= filters together with the status, with a label showing it", async ({ page }) => {
    await page.goto("/lista?voto=8");
    const statuses = page.getByRole("group", { name: "Filtra per stato" });

    await expect(label(page, 8)).toHaveText("Voto 8 ×");
    await expect(page.getByRole("article")).toHaveCount(2);

    await statuses.getByRole("button", { name: "Completato (1)" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toContainText("Senza palinsesto");

    await statuses.getByRole("button", { name: "Droppato (0)" }).click();
    await expect(page.getByText("Nessun anime con voto 8 in «Droppato».")).toBeVisible();
  });

  test("from the keyboard the label clears the filter, focus goes to the status filter in use", async ({ page }) => {
    await page.goto("/lista?voto=8");
    await page.getByRole("group", { name: "Filtra per stato" }).getByRole("button", { name: "Sto guardando (2)" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);

    await label(page, 8).focus();
    await page.keyboard.press("Enter");

    await expect(label(page, 8)).toHaveCount(0);
    await expect(page).toHaveURL(/\/lista$/);
    await expect(page.getByRole("button", { name: "Sto guardando (2)" })).toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: "Filtro per voto tolto" })).toHaveCount(1);
    await expect(page.getByRole("article")).toHaveCount(2);
  });

  test("?voto= survives a reload; a bad value is ignored", async ({ page }) => {
    await page.goto("/lista?voto=6");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toContainText("Serie in corso");
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(1);

    await page.goto("/lista?voto=8.5");
    await expect(page.getByRole("article")).toHaveCount(5);
    await expect(page.getByRole("button", { name: /togli il filtro/ })).toHaveCount(0);
  });

  test("a score with no anime gives an empty list with its message", async ({ page }) => {
    await page.goto("/lista?voto=3");

    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByText("Nessun anime con voto 3.")).toBeVisible();
  });

  test("clearing the filter adds no history entry", async ({ page }) => {
    await page.goto("/ricerca");
    await page.goto("/lista?voto=8");

    await label(page, 8).click();
    await expect(page).toHaveURL(/\/lista$/);
    await page.goBack();

    await expect(page).toHaveURL(/\/ricerca$/);
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
