import { expect, test } from "@playwright/test";

// Data comes from e2e/fake-anilist.mjs.
test("detail page shows the anime from AniList", async ({ page }) => {
  await page.goto("/anime/1");

  await expect(page).toHaveTitle("Hoshi no Kioku · Anime Tracker");
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeVisible();
  await expect(page.getByText("Memory of the Stars")).toBeVisible();
  await expect(page.getByText("TV · Autunno 2026", { exact: true })).toBeVisible();

  const info = page.getByRole("complementary", { name: "Scheda" });
  await expect(info.getByText("Concluso")).toBeVisible();
  await expect(info.getByText("Studio di Prova")).toBeVisible();
  // AniList's English genres in Italian; one missing from the table stays in English.
  await expect(page.getByRole("region", { name: "Generi" }).getByRole("listitem")).toHaveText([
    "Avventura",
    "Fantascienza",
    "Isekai",
  ]);
});

test("description is shown as plain text, with markup removed", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.goto("/anime/1");

  const plot = page.getByRole("region", { name: "Trama" });
  await expect(plot.getByText("(in inglese, da AniList)")).toBeVisible();
  await expect(plot.locator('[lang="en"] p')).toHaveText([
    "Una storia inventata per i test & nient'altro.",
    "Secondo paragrafo con corsivo.",
  ]);
  await expect(plot.locator("script, img, i")).toHaveCount(0);
  // WCAG 3.1.2: the English plot is marked as such on an Italian page.
  await expect(plot.locator('[lang="en"]')).toHaveCount(1);
  await expect(plot.locator('[lang="en"] p')).toHaveCount(2);
  expect(dialogs).toEqual([]);
});

for (const path of ["/anime/2", "/anime/3", "/anime/abc", "/anime/0", "/anime/99999999999"]) {
  test(`unknown, adult or invalid id gives the 404 page: ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Pagina non trovata" })).toBeVisible();
  });
}
