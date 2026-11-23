import { type APIRequestContext, type Page, expect, test } from "@playwright/test";
import { MAX_WEEKS_AHEAD, addDays, currentMonday, localDate, weekRangeLabel, weekWindow } from "../src/lib/week";
import { FAKE_ANILIST } from "./session";

// Episodes of e2e/fake-anilist.mjs, relative to when it started: Hoshi no Kioku Ep. 12 one hour before (aired),
// Ep. 13 two hours after, Ep. 14 a week after; Serie in corso Ep. 6 three days after; an adult anime tomorrow.
const ROME = "Europe/Rome";
test.use({ timezoneId: ROME });

const HOUR = 3600;
async function fakeStart(request: APIRequestContext): Promise<number> {
  return (await (await request.get(`${FAKE_ANILIST}/__started`)).json()).startedAt;
}
const day = (page: Page, date: string) => page.locator(`section[aria-labelledby="giorno-${date}"]`);
const thisMonday = () => currentMonday(Date.now(), ROME);

test("the current week, Monday to Sunday in the browser's time zone, without adult anime", async ({ page, request }) => {
  const startedAt = await fakeStart(request);
  await page.goto("/calendario");

  await expect(page.getByRole("heading", { level: 1, name: "Calendario" })).toBeVisible();
  await expect(page.getByText(weekRangeLabel(thisMonday()), { exact: true })).toBeVisible();
  await expect(page.getByText("nel fuso del tuo browser (Europe/Rome)")).toBeVisible();
  await expect(page.locator("section[aria-labelledby^=giorno-]")).toHaveCount(7);

  const ep13 = (startedAt + 2 * HOUR) * 1000;
  test.skip(currentMonday(ep13, ROME) !== thisMonday(), "Ep. 13 falls in next week right now");
  const row = day(page, localDate(ep13, ROME)).getByRole("link", { name: /Hoshi no Kioku Ep\. 13/ });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("href", "/anime/1");
  await expect(page.getByText("Solo per adulti")).toHaveCount(0);
});

test("today's column is marked, with Adesso between aired and upcoming episodes", async ({ page, request }) => {
  const startedAt = await fakeStart(request);
  const aired = (startedAt - HOUR) * 1000;
  const upcoming = (startedAt + 2 * HOUR) * 1000;
  const today = localDate(Date.now(), ROME);
  test.skip(localDate(aired, ROME) !== today || localDate(upcoming, ROME) !== today, "Ep. 12 and 13 are not both today now");
  await page.goto("/calendario");

  const column = day(page, today);
  await expect(column.getByRole("heading")).toContainText("Oggi");
  await expect(column.getByRole("link", { name: /Già uscito: Hoshi no Kioku Ep\. 12/ })).toBeVisible();
  const items = column.locator("li");
  await expect(items.first()).toHaveText(/Hoshi no Kioku.*Ep\. 12/);
  await expect(items.nth(1)).toHaveText("Adesso");
  await expect(items.nth(2)).toHaveText(/Hoshi no Kioku.*Ep\. 13/);
});

test("from the keyboard, the next week and back", async ({ page }) => {
  await page.goto("/calendario");
  const next = page.getByRole("link", { name: "Settimana successiva" });
  await next.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(`/calendario?settimana=${addDays(thisMonday(), 7)}`);
  await expect(page.getByText(weekRangeLabel(addDays(thisMonday(), 7)), { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Torna a questa settimana" }).click();
  await expect(page.getByText(weekRangeLabel(thisMonday()), { exact: true })).toBeVisible();
});

test("12 weeks ahead is the last; beyond, a bad or past week goes back to this one", async ({ page }) => {
  const last = addDays(thisMonday(), 7 * MAX_WEEKS_AHEAD);
  await page.goto(`/calendario?settimana=${last}`);
  await expect(page.getByText(weekRangeLabel(last), { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settimana successiva" })).toHaveCount(0);

  await page.goto(`/calendario?settimana=${addDays(last, 7)}`);
  await expect(page.getByText(weekRangeLabel(thisMonday()), { exact: true })).toBeVisible();

  for (const bad of ["oggi", addDays(thisMonday(), 2), addDays(thisMonday(), -14)]) {
    await page.goto(`/calendario?settimana=${bad}`);
    await expect(page.getByText(weekRangeLabel(thisMonday()), { exact: true })).toBeVisible();
  }
});

test("a week AniList gives only in part is never shown, and the failure is not cached", async ({ page, request }) => {
  // A week no other test opens, failing on its third page once.
  const monday = addDays(thisMonday(), 70);
  await request.post(`${FAKE_ANILIST}/__fail-schedule`, { data: { from: weekWindow(monday).from } });

  await page.goto(`/calendario?settimana=${monday}`);
  await expect(page.getByRole("heading", { level: 1, name: "Pagina non disponibile" })).toBeVisible();
  await expect(page.getByText(weekRangeLabel(monday))).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(weekRangeLabel(monday), { exact: true })).toBeVisible();
  await expect(page.locator("section[aria-labelledby^=giorno-]")).toHaveCount(7);
});

test.describe("on a 390px phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the current week starts today", async ({ page }) => {
    await page.goto("/calendario");
    const today = localDate(Date.now(), ROME);

    // The heading also holds the desktop label, hidden here: what a screen reader hears is "Oggi".
    await expect(day(page, today).getByRole("heading")).toHaveAccessibleName("Oggi");
    const earlier = addDays(today, -1);
    test.skip(earlier < thisMonday(), "today is Monday: no earlier day to hide");
    await expect(day(page, earlier)).toBeHidden();
  });
});

test.describe("Solo la mia lista", () => {
  // Hoshi no Kioku is watched in the demo list and completed by the logged-in user; Senza palinsesto the other
  // way round. Both have an episode in the next hours.
  async function bothThisWeek(request: APIRequestContext) {
    const startedAt = await fakeStart(request);
    const hoshi = (startedAt + 2 * HOUR) * 1000;
    const senza = (startedAt + 3 * HOUR) * 1000;
    test.skip(
      currentMonday(hoshi, ROME) !== thisMonday() || currentMonday(senza, ROME) !== thisMonday(),
      "the episodes fall in next week right now",
    );
  }
  const calendar = (page: Page) => page.locator("main");

  test("without login it filters on the demo list, says so, and drops completed anime", async ({ page, request }) => {
    await bothThisWeek(request);
    await page.goto("/calendario");
    await expect(calendar(page).getByRole("link", { name: /Senza palinsesto Ep\. 1/ })).toBeVisible();

    await page.getByRole("group", { name: "Quali anime" }).getByRole("button", { name: "Solo la mia lista" }).click();

    await expect(page.getByText("Modalità demo: episodi degli anime nella lista pubblica di UtenteDemo su AniList.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Solo gli anime della lista dimostrativa.");
    await expect(calendar(page).getByRole("link", { name: /Hoshi no Kioku Ep\. 13/ })).toBeVisible();
    await expect(calendar(page).getByRole("link", { name: /Senza palinsesto/ })).toHaveCount(0);
  });
});
