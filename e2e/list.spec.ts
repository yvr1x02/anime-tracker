import { expect, test } from "@playwright/test";

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

test("the header marks La mia lista as the current page", async ({ page }) => {
  await page.goto("/lista");

  await expect(
    page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "La mia lista" }),
  ).toHaveAttribute("aria-current", "page");
});
