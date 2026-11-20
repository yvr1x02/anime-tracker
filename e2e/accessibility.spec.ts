import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. Every new page gets an entry here.
const wcagAA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const path of ["/", "/pagina-che-non-esiste", "/anime/1", "/anime/4", "/anime/5"]) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(wcagAA).analyze();
    expect(
      violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })),
    ).toEqual([]);
  });
}
