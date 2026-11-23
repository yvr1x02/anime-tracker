import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockAniList, searchResults } from "./anilist-browser";
import { logIn } from "./session";

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. Every new page gets an entry here.
const wcagAA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const path of ["/", "/pagina-che-non-esiste", "/anime/1", "/anime/4", "/anime/5", "/ricerca", "/accesso", "/accesso?esito=uscito", "/lista", "/calendario", "/statistiche"]) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
    expect(
      violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })),
    ).toEqual([]);
  });
}

test("no WCAG A/AA violations on search results", async ({ page }) => {
  await mockAniList(page, [{ status: 200, media: searchResults }]);
  await page.goto("/ricerca?q=hoshi");
  await expect(page.getByRole("article")).toHaveCount(2);
  // Half-faded cards in the cascade would be measured with too little contrast.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
  const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test("no WCAG A/AA violations on the logged-in list", async ({ page }) => {
  await logIn(page, "/lista");
  await expect(page.getByRole("article")).toHaveCount(2);
  const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test("no WCAG A/AA violations with the entry editor open", async ({ page }) => {
  await logIn(page, "/lista");
  await page.getByRole("button", { name: /^Modifica: / }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test("no WCAG A/AA violations on search results and the detail page, logged in", async ({ page }) => {
  await logIn(page);
  await mockAniList(page, [{ status: 200, media: searchResults }]);
  await page.goto("/ricerca?q=hoshi");
  await expect(page.getByRole("button", { name: /: nella mia lista$/ })).toHaveCount(2);
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
  const search = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(search.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);

  await page.goto("/anime/1");
  await expect(page.getByRole("button", { name: "Nella mia lista: Hoshi no Kioku" })).toBeVisible();
  const detail = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(detail.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test("no WCAG A/AA violations on the Home, logged in with Continua a guardare", async ({ page }) => {
  await logIn(page, "/");
  await expect(page.getByRole("region", { name: "Continua a guardare" }).getByRole("article")).not.toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});

test("no WCAG A/AA violations on the Home with Cosa guardo stasera? suggestions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Serata intera" }).click();
  await expect(page.getByRole("region", { name: "Cosa guardo stasera?" }).getByRole("article")).toHaveCount(3);
  const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
});
