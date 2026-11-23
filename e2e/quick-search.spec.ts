import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import { mockAniList, searchResults } from "./anilist-browser";

// The quick search (SPEC and DESIGN, "Ricerca rapida"). Browser requests are answered by page.route.
const ok = { status: 200, media: searchResults };
const dialog = (page: Page) => page.getByRole("dialog", { name: "Cerca un anime" });
const field = (page: Page) => dialog(page).getByRole("combobox", { name: "Cerca un anime" });
const cerca = (page: Page) => page.getByRole("banner").getByRole("button", { name: "Cerca", exact: true });

test("Ctrl+K opens it from any page; results come as you type, with the page's rules", async ({ page }) => {
  const searches = await mockAniList(page, [ok]);
  await page.goto("/calendario");
  await expect(cerca(page)).toBeVisible();

  await page.keyboard.press("Control+k");
  await expect(dialog(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.type("ho");
  await page.waitForTimeout(800);
  expect(searches).toEqual([]);
  await page.keyboard.type("shi", { delay: 100 });

  const options = dialog(page).getByRole("listbox", { name: "Risultati" }).getByRole("option");
  await expect(options).toHaveText([/Hoshi no Kioku\s*TV · 2026/, /Senza palinsesto\s*Film · 2025/]);
  await expect(dialog(page).getByRole("status")).toHaveText("2 risultati per «hoshi»");
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  expect(searches).toEqual(["hoshi"]);
});

test("arrows move through the results and wrap while focus stays in the field; Enter opens the detail", async ({ page }) => {
  await mockAniList(page, [ok]);
  await page.goto("/");
  await cerca(page).click();
  await field(page).pressSequentially("hoshi");
  const options = dialog(page).getByRole("option");
  await expect(options).toHaveCount(2);

  await page.keyboard.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await expect(field(page)).toHaveAttribute("aria-activedescendant", "ricerca-rapida-1");
  await expect(field(page)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowUp");
  await expect(options.last()).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/anime/4");
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Senza palinsesto" })).toBeVisible();
});

test("one Esc closes it and focus goes back where it was", async ({ page }) => {
  await mockAniList(page, [ok]);
  await page.goto("/");

  await cerca(page).focus();
  await page.keyboard.press("Enter");
  await field(page).pressSequentially("hoshi");
  await expect(dialog(page).getByRole("option")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(cerca(page)).toBeFocused();

  // Opened with the shortcut from a link: focus returns to that link.
  const link = page.getByRole("link", { name: "Calendario" });
  await link.focus();
  await page.keyboard.press("Control+k");
  await expect(field(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(link).toBeFocused();
});

test("Tutti i risultati, or Enter with nothing highlighted, opens the page without a new request", async ({ page }) => {
  const searches = await mockAniList(page, [ok]);
  await page.goto("/");
  await cerca(page).click();
  await field(page).pressSequentially("hoshi");
  await expect(dialog(page).getByRole("option")).toHaveCount(2);

  await dialog(page).getByRole("link", { name: "Tutti i risultati per «hoshi»" }).click();
  await expect(page).toHaveURL("/ricerca?q=hoshi");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(searches).toEqual(["hoshi"]);

  await page.goto("/");
  await cerca(page).click();
  await field(page).pressSequentially("hoshi");
  await expect(dialog(page).getByRole("option")).toHaveCount(2);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/ricerca?q=hoshi");
});

test("no results: the hint about romaji and English", async ({ page }) => {
  await mockAniList(page, [{ status: 200, media: [] }]);
  await page.goto("/");
  await cerca(page).click();
  await field(page).pressSequentially("zzzz");

  await expect(dialog(page).getByRole("status")).toContainText("Nessun risultato per «zzzz».");
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
});

test("on /ricerca the shortcut goes to the page's own field", async ({ page }) => {
  await page.goto("/ricerca");
  await page.getByRole("heading", { level: 1, name: "Ricerca" }).click();

  await page.keyboard.press("Control+k");
  await expect(page.getByRole("searchbox", { name: "Titolo dell'anime" })).toBeFocused();
  await expect(dialog(page)).toBeHidden();
});

test("no WCAG A/AA violations with the quick search open on results", async ({ page }) => {
  await mockAniList(page, [ok]);
  await page.goto("/");
  await cerca(page).click();
  await field(page).pressSequentially("hoshi");
  await expect(dialog(page).getByRole("option")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await expect(dialog(page).getByRole("option").first()).toHaveAttribute("aria-selected", "true");

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test.describe("on a 390px phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the lens is named Cerca and the quick search fills the screen", async ({ page }) => {
    await page.goto("/");
    await cerca(page).click();

    // Measured once the 150ms opening (from scale 0.98) is over.
    await expect.poll(async () => (await dialog(page).boundingBox())?.width).toBe(390);
    expect((await dialog(page).boundingBox())!.height).toBe(844);
    await expect(field(page)).toBeFocused();
  });
});
