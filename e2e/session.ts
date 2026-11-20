import { type Page, expect } from "@playwright/test";

export const FAKE_ANILIST = "http://localhost:3999";

/** Logs in through the fake AniList, which approves straight away. */
export async function logIn(page: Page, from = "/") {
  await page.goto(from);
  await page.getByRole("banner").getByRole("link", { name: "Accedi" }).click();
  // Wait for the client-side navigation to land, or the click below can be lost while it finishes.
  await expect(page.getByRole("heading", { level: 1, name: "Accedi con AniList" })).toBeVisible();
  await expect(page).toHaveURL(/\/accesso/);
  await page.getByRole("link", { name: "Accedi con AniList" }).click();
  // "Esci" shows at every width; the name is hidden on phones.
  await expect(page.getByRole("banner").getByRole("button", { name: "Esci" })).toBeVisible();
}
