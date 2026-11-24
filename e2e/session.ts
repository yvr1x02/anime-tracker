import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

export const FAKE_ANILIST = "http://localhost:3999";

/** The test user of this Playwright worker: each has its own list in the fake AniList (e2e/fake-anilist.mjs). */
function testUser() {
  return String(test.info().workerIndex);
}

/** Restores this worker's test list, and stops any failing saves left on it. */
export async function resetMyList(request: APIRequestContext) {
  await request.post(`${FAKE_ANILIST}/__reset`, { data: { user: testUser() } });
}

/** Makes this worker's next saves fail with a 500. */
export async function failNextSaves(request: APIRequestContext, count: number) {
  await request.post(`${FAKE_ANILIST}/__fail-saves`, { data: { user: testUser(), count } });
}

/** Logs in through the fake AniList, which approves straight away, as this worker's test user. */
export async function logIn(page: Page, from = "/") {
  // Cookies do not tell ports apart: only the fake's authorize path gets it, never the app.
  await page.context().addCookies([{ name: "e2e-user", value: testUser(), domain: "localhost", path: "/oauth/authorize" }]);
  await page.goto(from);
  await page.getByRole("banner").getByRole("link", { name: "Accedi" }).click();
  // Wait for the client-side navigation to land, or the click below can be lost while it finishes.
  await expect(page.getByRole("heading", { level: 1, name: "Accedi con AniList" })).toBeVisible();
  await expect(page).toHaveURL(/\/accesso/);
  await page.getByRole("link", { name: "Accedi con AniList" }).click();
  // "Esci" shows at every width; the name is hidden on phones.
  await expect(page.getByRole("banner").getByRole("button", { name: "Esci" })).toBeVisible();
}
