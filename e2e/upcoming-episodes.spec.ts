import { expect, test } from "@playwright/test";

// Schedule from e2e/fake-anilist.mjs, relative to when it started: +2h, +7d, +14d, +21d, and one already aired.
test.use({ timezoneId: "Europe/Rome" });

test("upcoming episodes are sorted, without aired ones, in the browser's time zone", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/anime/1");

  const section = page.getByRole("region", { name: "Prossimi episodi" });
  await expect(section.getByText("nel fuso del tuo browser (Europe/Rome)")).toBeVisible();

  const rows = section.getByRole("listitem");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText("Prossimo: Ep. 13");
  await expect(rows.nth(0)).toContainText(/tra (1|2) or[ae]/);
  await expect(rows.nth(1)).toContainText("Ep. 14");
  await expect(rows.nth(1)).toContainText("tra 7 giorni");
  await expect(rows.nth(3)).toContainText("Ep. 16");
  await expect(rows.nth(0).locator("time")).toHaveAttribute("datetime", /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/);

  await expect(page.locator("header").filter({ hasText: "Hoshi no Kioku" })).toContainText("Prossimo episodio: Ep. 13");
  // Times are only computed in the browser, so server and client HTML must not disagree.
  expect(errors.filter((text) => /hydrat/i.test(text))).toEqual([]);
});

test("an anime with nothing scheduled says so", async ({ page }) => {
  await page.goto("/anime/4");

  await expect(page.getByRole("region", { name: "Prossimi episodi" })).toContainText("Nessun episodio in programma.");
  await expect(page.getByText("Trama non disponibile.")).toBeVisible();
});
