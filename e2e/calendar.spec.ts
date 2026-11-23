import { type APIRequestContext, type Page, expect, test } from "@playwright/test";
import { MAX_WEEKS_AHEAD, addDays, currentMonday, fullDayLabel, localDate, weekRangeLabel, weekWindow } from "../src/lib/week";
import { FAKE_ANILIST } from "./session";

// Episodes of e2e/fake-anilist.mjs hang on noon in Rome of the day it started: Hoshi no Kioku Ep. 12 at 11:00
// (aired), Ep. 13 at 14:00, Senza palinsesto Ep. 1 at 15:00, an adult anime the next day, Serie in corso Ep. 6
// three days later, Hoshi no Kioku Ep. 14 a week later. The browser's clock is fixed at that noon (page.clock),
// so no test depends on when it runs.
const ROME = "Europe/Rome";
test.use({ timezoneId: ROME });

const HOUR = 3600;
let noon = 0;
const today = () => localDate(noon * 1000, ROME);
const thisMonday = () => currentMonday(noon * 1000, ROME);

async function fixClock(page: Page, request: APIRequestContext) {
  noon = (await (await request.get(`${FAKE_ANILIST}/__started`)).json()).noon;
  await page.clock.setFixedTime(noon * 1000);
}
test.beforeEach(async ({ page, request }) => fixClock(page, request));

const tab = (page: Page, date: string) => page.getByRole("tab", { name: new RegExp(`^${fullDayLabel(date)}\\b`) });
const panel = (page: Page) => page.getByRole("tabpanel");

test("opens on today: the week's seven days with their counts, without adult anime", async ({ page }) => {
  await page.goto("/calendario");

  await expect(page.getByRole("heading", { level: 1, name: "Calendario" })).toBeVisible();
  await expect(page.getByText(weekRangeLabel(thisMonday()), { exact: true })).toBeVisible();
  await expect(page.getByText("nel fuso del tuo browser (Europe/Rome)")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Giorni della settimana" }).getByRole("tab")).toHaveCount(7);

  await expect(tab(page, today())).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, today())).toHaveAccessibleName(`${fullDayLabel(today())}, oggi, 3 episodi`);
  await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(fullDayLabel(today()));
  const row = panel(page).getByRole("link", { name: /Hoshi no Kioku Ep\. 13/ });
  await expect(row).toHaveAttribute("href", "/anime/1");

  // The adult anime airs tomorrow: it is never counted nor shown.
  const tomorrow = addDays(today(), 1);
  if (tomorrow < addDays(thisMonday(), 7)) await expect(tab(page, tomorrow)).toHaveAccessibleName(/, 0 episodi$/);
  await expect(page.getByText("Solo per adulti")).toHaveCount(0);
});

test("today has aired episodes muted and Adesso before the first to come", async ({ page }) => {
  await page.goto("/calendario");

  await expect(panel(page).getByRole("link", { name: /Già uscito: Hoshi no Kioku Ep\. 12/ })).toBeVisible();
  const items = panel(page).locator("li");
  await expect(items).toHaveText([/Hoshi no Kioku.*Ep\. 12/, "Adesso", /Hoshi no Kioku.*Ep\. 13/, /Senza palinsesto.*Ep\. 1/]);
});

test("from the keyboard the arrows, Home and End choose the day; the address follows without history entries", async ({ page }) => {
  await page.goto("/ricerca");
  await page.goto("/calendario");
  const sunday = addDays(thisMonday(), 6);

  await tab(page, today()).focus();
  await page.keyboard.press("End");
  await expect(tab(page, sunday)).toBeFocused();
  await expect(tab(page, sunday)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`/calendario?giorno=${sunday}`);
  await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(fullDayLabel(sunday));

  // From Sunday the right arrow wraps to Monday; Home stays there; the left arrow goes back to Sunday.
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, thisMonday())).toBeFocused();
  await page.keyboard.press("Home");
  await expect(tab(page, thisMonday())).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, sunday)).toHaveAttribute("aria-selected", "true");

  // One tab stop: Tab leaves the strip for the panel's content.
  await expect(page.getByRole("tab", { selected: false }).first()).toHaveAttribute("tabindex", "-1");

  await page.goBack();
  await expect(page).toHaveURL(/\/ricerca$/);
});

test("a day in the address opens on that day, in its week", async ({ page }) => {
  const serie = localDate((noon + 3 * 24 * HOUR) * 1000, ROME);
  await page.goto(`/calendario?giorno=${serie}`);

  await expect(page.getByText(weekRangeLabel(currentMonday((noon + 3 * 24 * HOUR) * 1000, ROME)), { exact: true })).toBeVisible();
  await expect(tab(page, serie)).toHaveAttribute("aria-selected", "true");
  await expect(panel(page).getByRole("link", { name: /Serie in corso Ep\. 6/ })).toBeVisible();
});

test("the next week opens on Monday; back to this week opens on today", async ({ page }) => {
  await page.goto("/calendario");
  const nextMonday = addDays(thisMonday(), 7);

  await page.getByRole("link", { name: "Settimana successiva" }).click();
  await expect(page).toHaveURL(`/calendario?giorno=${nextMonday}`);
  await expect(page.getByText(weekRangeLabel(nextMonday), { exact: true })).toBeVisible();
  await expect(tab(page, nextMonday)).toHaveAttribute("aria-selected", "true");

  const ep14 = addDays(today(), 7);
  await tab(page, ep14).click();
  await expect(panel(page).getByRole("link", { name: /Hoshi no Kioku Ep\. 14/ })).toBeVisible();

  await page.getByRole("link", { name: "Torna a questa settimana" }).click();
  await expect(tab(page, today())).toHaveAttribute("aria-selected", "true");
});

test("old ?settimana= links go to ?giorno= on that Monday", async ({ page }) => {
  const nextMonday = addDays(thisMonday(), 7);
  await page.goto(`/calendario?settimana=${nextMonday}`);

  await expect(page).toHaveURL(`/calendario?giorno=${nextMonday}`);
  await expect(tab(page, nextMonday)).toHaveAttribute("aria-selected", "true");
});

test("12 weeks ahead is the last; a day beyond, in a past week or malformed goes back to today", async ({ page }) => {
  const last = addDays(thisMonday(), 7 * MAX_WEEKS_AHEAD);
  await page.goto(`/calendario?giorno=${last}`);
  await expect(page.getByText(weekRangeLabel(last), { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settimana successiva" })).toHaveCount(0);

  for (const bad of [addDays(last, 7), "oggi", addDays(thisMonday(), -14), "2026-02-30"]) {
    await page.goto(`/calendario?giorno=${bad}`);
    await expect(page.getByText(weekRangeLabel(thisMonday()), { exact: true })).toBeVisible();
    await expect(tab(page, today())).toHaveAttribute("aria-selected", "true");
  }
});

test("a week AniList gives only in part is never shown, and the failure is not cached", async ({ page, request }) => {
  // A week no other test opens, failing on its third page once.
  const monday = addDays(thisMonday(), 70);
  await request.post(`${FAKE_ANILIST}/__fail-schedule`, { data: { from: weekWindow(monday).from } });

  await page.goto(`/calendario?giorno=${monday}`);
  await expect(page.getByRole("heading", { level: 1, name: "Pagina non disponibile" })).toBeVisible();
  await expect(page.getByText(weekRangeLabel(monday))).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(weekRangeLabel(monday), { exact: true })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(7);
});

test.describe("on a 390px phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the seven days fit across, and the page does not scroll sideways", async ({ page }) => {
    await page.goto("/calendario");
    await expect(tab(page, today())).toHaveAttribute("aria-selected", "true");

    for (const box of await page.getByRole("tab").evaluateAll((tabs) => tabs.map((item) => item.getBoundingClientRect().toJSON()))) {
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.right).toBeLessThanOrEqual(390 - 16);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test.describe("Solo la mia lista", () => {
  // Hoshi no Kioku is watched in the demo list and completed by the logged-in user; Senza palinsesto the other
  // way round. Both air today.
  test("without login it filters on the demo list, says so, drops completed anime and updates the counts", async ({ page }) => {
    await page.goto("/calendario");
    await expect(panel(page).getByRole("link", { name: /Senza palinsesto Ep\. 1/ })).toBeVisible();

    await page.getByRole("group", { name: "Quali anime" }).getByRole("button", { name: "Solo la mia lista" }).click();

    await expect(page.getByText("Modalità demo: episodi degli anime nella lista pubblica di UtenteDemo su AniList.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Solo gli anime della lista dimostrativa.");
    await expect(panel(page).getByRole("link", { name: /Hoshi no Kioku Ep\. 13/ })).toBeVisible();
    await expect(panel(page).getByRole("link", { name: /Senza palinsesto/ })).toHaveCount(0);
    await expect(tab(page, today())).toHaveAccessibleName(`${fullDayLabel(today())}, oggi, 2 episodi`);
  });
});
