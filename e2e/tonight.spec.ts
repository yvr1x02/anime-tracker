import { type Page, expect, test } from "@playwright/test";


// Demo list of e2e/fake-anilist.mjs: Hoshi no Kioku (watching, 7 to go, finished), Serie in corso (watching,
// 2 behind, airing), Lista personalizzata (Da vedere, 2 × 30 min, 150 days in the list), Film lungo
// (Da vedere, 150 min, 40 days in the list). The logged-in user has Senza palinsesto (a 90-minute film).
const picker = (page: Page) => page.getByRole("region", { name: "Cosa guardo stasera?" });
const times = (page: Page) => picker(page).getByRole("group", { name: "Quanto tempo hai?" });
const suggestion = (page: Page, title: string) =>
  picker(page).getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });

test("without login, 30 minuti suggests from the demo list, asked for only now", async ({ page }) => {
  const demoReads: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/demo-list")) demoReads.push(request.url());
  });
  await page.goto("/");
  await expect(times(page).getByRole("button", { name: "30 minuti" })).toBeVisible();
  expect(demoReads).toEqual([]);

  await times(page).getByRole("button", { name: "30 minuti" }).click();

  await expect(times(page).getByRole("button", { name: "30 minuti" })).toHaveAttribute("aria-pressed", "true");
  await expect(picker(page).getByRole("status")).toHaveText("3 proposte per 30 minuti");
  await expect(picker(page).getByText("Modalità demo: proposte dalla lista pubblica di UtenteDemo su AniList.")).toBeVisible();
  await expect(picker(page).getByRole("article")).toHaveCount(3);
  await expect(suggestion(page, "Serie in corso")).toContainText("Sei indietro di 2 episodi: stasera 1, 24 minuti");
  await expect(suggestion(page, "Hoshi no Kioku")).toContainText("Ti mancano 7 episodi: stasera 1, 24 minuti");
  await expect(suggestion(page, "Lista personalizzata")).toContainText("Comincia: 1 episodio in 30 minuti");
  await expect(suggestion(page, "Lista personalizzata")).toContainText("È nella tua lista da 4 mesi");
  // Only three candidates for 30 minutes: one page, so no button to page through them.
  await expect(picker(page).getByRole("button", { name: /Altre proposte|Ricomincia dalle prime/ })).toHaveCount(0);
  // With suggestions above it, the season grid's heading is no longer screen-reader only (sr-only is absolute).
  await expect(page.getByRole("heading", { name: "Gli altri anime della stagione" })).toHaveCSS("position", "static");

  await times(page).getByRole("button", { name: "1 ora" }).click();
  await expect(picker(page).getByRole("status")).toHaveText("3 proposte per 1 ora");
  await expect(suggestion(page, "Lista personalizzata")).toContainText("2 episodi in 1 ora: stanno nella tua ora");
  expect(demoReads).toHaveLength(1);
});

test("from the keyboard, the whole evening, Altre proposte and Ricomincia dalle prime, focus staying on the button", async ({ page }) => {
  await page.goto("/");
  await times(page).getByRole("button", { name: "Serata intera" }).focus();
  await page.keyboard.press("Enter");

  await expect(picker(page).getByRole("status")).toHaveText("3 proposte per la serata intera");
  // One of each kind first: finish it, airing, then the oldest Da vedere that fits whole.
  const titles = picker(page).getByRole("article").getByRole("heading");
  await expect(titles).toHaveText(["Hoshi no Kioku", "Serie in corso", "Lista personalizzata"]);
  await expect(suggestion(page, "Hoshi no Kioku")).toContainText("Ti mancano 7 episodi: la finisci in 2 ore e 48 minuti");

  const more = picker(page).getByRole("button", { name: "Altre proposte" });
  await more.focus();
  await page.keyboard.press("Enter");

  await expect(picker(page).getByRole("status")).toHaveText("Un'altra proposta per la serata intera");
  await expect(titles).toHaveText(["Film lungo"]);
  await expect(suggestion(page, "Film lungo")).toContainText("Film di 2 ore e 30 minuti: sta nella tua serata");
  await expect(suggestion(page, "Film lungo")).toContainText("È nella tua lista da 1 mese");
  // The suggestions are over: the same button now starts again from the first ones.
  const restart = picker(page).getByRole("button", { name: "Ricomincia dalle prime" });
  await expect(restart).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(picker(page).getByRole("status")).toHaveText("Di nuovo le prime 3 proposte per la serata intera");
  await expect(titles).toHaveText(["Hoshi no Kioku", "Serie in corso", "Lista personalizzata"]);
  await expect(picker(page).getByRole("button", { name: "Altre proposte" })).toBeFocused();

  // A new time choice starts fresh: no "Di nuovo".
  await times(page).getByRole("button", { name: "2 ore" }).click();
  await expect(picker(page).getByRole("status")).not.toContainText("Di nuovo");
});
