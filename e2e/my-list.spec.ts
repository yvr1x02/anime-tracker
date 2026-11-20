import { expect, test } from "@playwright/test";
import { FAKE_ANILIST, logIn } from "./session";

// The logged-in user's list lives in the fake AniList and changes: these tests run one at a time, from a reset.
test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ request }) => {
  await request.post(`${FAKE_ANILIST}/__reset`);
});

test("logged in, La mia lista is the user's own list, without the demo notice", async ({ page }) => {
  await logIn(page, "/lista");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Senza palinsesto");
  await expect(cards.nth(0)).toContainText("Sto guardando · 0 visti");
  await expect(cards.nth(1)).toContainText("Completato · 12 visti · voto 9");
  await expect(page.getByText(/Modalità demo/)).toHaveCount(0);
});

test("the list is read once per session, not on every visit", async ({ page }) => {
  await logIn(page, "/lista");
  await expect(page.getByRole("article")).toHaveCount(2);
  const reads: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/list")) reads.push(request.url());
  });

  await page.getByRole("link", { name: "Ricerca" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ricerca" })).toBeVisible();
  await page.getByRole("link", { name: "La mia lista" }).click();

  await expect(page.getByRole("article")).toHaveCount(2);
  expect(reads).toEqual([]);
});

test("a token AniList refuses ends the session: message, and all session cookies gone", async ({ page, context, request }) => {
  await logIn(page);
  // As if the user revoked the app on AniList: from now on the fake answers "Invalid token" to this token.
  const token = (await context.cookies()).find((cookie) => cookie.name === "__Host-session")!.value;
  await request.post(`${FAKE_ANILIST}/__revoke`, { data: { token } });

  await page.goto("/lista");

  await expect(page.getByRole("status")).toContainText("La sessione con AniList è scaduta o è stata revocata.");
  await expect.poll(async () => (await context.cookies()).map((cookie) => cookie.name)).toEqual([]);
});

test("/api/list without a session answers 401 and is never cached", async ({ request }) => {
  const response = await request.get("/api/list");

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
