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
  const genres = page.getByRole("region", { name: "Generi" }).getByRole("listitem");
  await expect(genres).toHaveText(["Avventura", "Fantascienza", "Isekai"]);
  // WCAG 3.1.2: only the untranslated genre is marked as English.
  await expect(genres.and(page.locator('[lang="en"]'))).toHaveText(["Isekai"]);
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

test.describe("a long title (docs/DESIGN.md, Dettaglio)", () => {
  // e2e/fake-anilist.mjs, anime 14: a light-novel-length romaji title and a long English one.
  const romaji =
    "Tensei Shita Shisho wa Isekai no Toshokan de Kyou mo Shizuka ni Hon wo Narabete Imasu ga, Naze ka Maou-sama ga Maiban Kashidashi Mado ni Yatte Kuru Ken ni Tsuite";
  const english =
    "The Reincarnated Librarian Quietly Shelves Books in Another World's Library Every Day, but the Demon King Comes to the Lending Desk Every Night";

  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ]) {
    test(`at ${width}×${height} it takes 3 lines, the English one 2, whole in the page, and the cover stays above the fold`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/anime/1");
      const displaySize = await page.locator("h1").evaluate((h1) => getComputedStyle(h1).fontSize);
      await page.goto("/anime/14");

      // Only clamped on screen: the accessible name and the title attribute are the whole title.
      const title = page.getByRole("heading", { level: 1, name: romaji, exact: true });
      await expect(title).toHaveAttribute("title", romaji);
      await expect(title).toHaveText(romaji);
      const subtitle = page.getByText(english, { exact: true });
      await expect(subtitle).toHaveAttribute("title", english);

      const lines = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return { clamp: style.webkitLineClamp, lines: Math.round(element.clientHeight / parseFloat(style.lineHeight)), fontSize: style.fontSize };
      };
      expect(await title.evaluate(lines)).toEqual({ clamp: "3", lines: 3, fontSize: displaySize });
      expect(await subtitle.evaluate(lines)).toMatchObject({ clamp: "2", lines: 2 });

      const cover = await page.locator(".detail-cover").boundingBox();
      expect(cover!.y + cover!.height).toBeLessThanOrEqual(height);
    });
  }
});
