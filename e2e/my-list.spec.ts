import { expect, test } from "@playwright/test";
import { mockAniList, searchResults } from "./anilist-browser";
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
  await expect(cards.nth(1)).toContainText("Completato · 12 visti · voto 9,0");
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

const card = (page: import("@playwright/test").Page, title: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });

function entryRequests(page: import("@playwright/test").Page) {
  const bodies: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/list/entry") && request.method() === "POST") bodies.push(request.postDataJSON());
  });
  return bodies;
}

test.describe("editing", () => {
  test.use({ timezoneId: "Europe/Rome" });

  test("+1 clicks show at once and go to AniList as one request, 800ms after the last", async ({ page }) => {
    await logIn(page, "/lista");
    const bodies = entryRequests(page);
    const anime = card(page, "Senza palinsesto");
    // A one-episode film: the button goes once the total is reached.
    await anime.getByRole("button", { name: "+1 episodio visto: Senza palinsesto" }).click();

    await expect(anime).toContainText("1 visto");
    await expect(anime.getByRole("button", { name: /\+1/ })).toHaveCount(0);
    expect(bodies).toEqual([]);
    await expect.poll(() => bodies).toEqual([{ mediaId: 4, progress: 1 }]);
  });

  test("when AniList completes the entry by itself, the card shows what AniList returned", async ({ page }) => {
    await logIn(page, "/lista");
    const bodies = entryRequests(page);
    const anime = card(page, "Senza palinsesto");

    // The last episode of a one-episode film: only the episodes are sent, AniList answers COMPLETED.
    await anime.getByRole("button", { name: "+1 episodio visto: Senza palinsesto" }).click();

    await expect.poll(() => bodies).toEqual([{ mediaId: 4, progress: 1 }]);
    await expect(anime).toContainText("Completato · 1 visto");
    await page.getByRole("group", { name: "Filtra per stato" }).getByRole("button", { name: "Completato (2)" }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await page.reload();
    await expect(card(page, "Senza palinsesto")).toContainText("Completato · 1 visto");
  });

  test("several quick +1 clicks are grouped", async ({ page }) => {
    // Hoshi no Kioku back to Sto guardando with 0 episodes, through the API, to have room for clicks.
    await logIn(page, "/lista");
    await page.evaluate(() =>
      fetch("/api/list/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: 1, status: "CURRENT", progress: 0 }),
      }),
    );
    await page.reload();
    const bodies = entryRequests(page);
    const plusOne = card(page, "Hoshi no Kioku").getByRole("button", { name: "+1 episodio visto: Hoshi no Kioku" });

    await plusOne.click();
    await plusOne.click();
    await plusOne.click();

    await expect(card(page, "Hoshi no Kioku")).toContainText("3 visti");
    await expect.poll(() => bodies).toEqual([{ mediaId: 1, progress: 3 }]);
    await page.waitForTimeout(1000);
    expect(bodies).toHaveLength(1);
  });

  test("a +1 still waiting is sent when the page is left", async ({ page }) => {
    await logIn(page, "/lista");
    await card(page, "Senza palinsesto").getByRole("button", { name: /\+1/ }).click();

    await page.goto("/ricerca");
    await page.goto("/lista");

    await expect(card(page, "Senza palinsesto")).toContainText("1 visto");
  });

  test("Completato fills the episodes and the end date, in the browser's time zone", async ({ page }) => {
    await logIn(page, "/lista");
    const bodies = entryRequests(page);
    await card(page, "Senza palinsesto").getByRole("button", { name: "Modifica: Senza palinsesto" }).click();
    const dialog = page.getByRole("dialog", { name: "Modifica «Senza palinsesto»" });

    await dialog.getByLabel("Stato").selectOption({ label: "Completato" });
    await dialog.getByRole("button", { name: "Salva" }).click();

    await expect(dialog).toBeHidden();
    await expect(card(page, "Senza palinsesto")).toContainText("Completato · 1 visto");
    const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date()).split("-");
    await expect
      .poll(() => bodies)
      .toEqual([{ mediaId: 4, status: "COMPLETED", completedAt: { year: +year, month: +month, day: +day }, progress: 1 }]);
    await page.reload();
    await expect(card(page, "Senza palinsesto")).toContainText("Completato · 1 visto");
  });

  test("the editor sends only what changed", async ({ page }) => {
    await logIn(page, "/lista");
    const bodies = entryRequests(page);
    await card(page, "Hoshi no Kioku").getByRole("button", { name: "Modifica: Hoshi no Kioku" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Note").fill("Da rivedere");
    await dialog.getByRole("button", { name: "Salva" }).click();

    await expect.poll(() => bodies).toEqual([{ mediaId: 1, notes: "Da rivedere" }]);
  });

  test("the score takes one decimal, 8,5 is sent as 8.5 and shown as 8,5", async ({ page }) => {
    await logIn(page, "/lista");
    const bodies = entryRequests(page);
    const edit = card(page, "Hoshi no Kioku").getByRole("button", { name: "Modifica: Hoshi no Kioku" });
    await edit.click();
    const dialog = page.getByRole("dialog");
    const score = dialog.getByLabel("Voto");
    await expect(score).toHaveValue("9,0");

    await score.fill("8,55");
    await dialog.getByRole("button", { name: "Salva" }).click();
    await expect(score).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByText(/^Voto non valido/)).toBeVisible();
    expect(bodies).toEqual([]);

    await score.fill("8,5");
    await dialog.getByRole("button", { name: "Salva" }).click();

    await expect(card(page, "Hoshi no Kioku")).toContainText("12 visti · voto 8,5");
    await expect.poll(() => bodies).toEqual([{ mediaId: 1, score: 8.5 }]);
    await page.reload();
    await expect(card(page, "Hoshi no Kioku")).toContainText("12 visti · voto 8,5");
  });

  test("an empty score clears it", async ({ page }) => {
    await logIn(page, "/lista");
    const bodies = entryRequests(page);
    await card(page, "Hoshi no Kioku").getByRole("button", { name: "Modifica: Hoshi no Kioku" }).click();

    await page.getByRole("dialog").getByLabel("Voto").fill("");
    await page.getByRole("dialog").getByRole("button", { name: "Salva" }).click();

    await expect(card(page, "Hoshi no Kioku")).toContainText("Completato · 12 visti");
    await expect(card(page, "Hoshi no Kioku")).not.toContainText("voto");
    await expect.poll(() => bodies).toEqual([{ mediaId: 1, score: 0 }]);
  });

  test("a change AniList refuses goes back and says so", async ({ page, request }) => {
    await request.post(`${FAKE_ANILIST}/__fail-saves`, { data: { count: 1 } });
    await logIn(page, "/lista");

    await card(page, "Senza palinsesto").getByRole("button", { name: /\+1/ }).click();
    await expect(card(page, "Senza palinsesto")).toContainText("1 visto");

    // Next.js has its own alert region for route changes: pick ours by its text.
    await expect(page.getByRole("alert").filter({ hasText: "la modifica non è stata salvata" })).toBeVisible();
    await expect(card(page, "Senza palinsesto")).toContainText("0 visti");
  });

  test("removing asks for confirmation first", async ({ page }) => {
    await logIn(page, "/lista");
    await card(page, "Hoshi no Kioku").getByRole("button", { name: "Modifica: Hoshi no Kioku" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("button", { name: "Elimina dalla lista" }).click();
    await expect(dialog.getByText("Eliminare «Hoshi no Kioku» dalla lista su AniList? Non si può annullare.")).toBeFocused();
    await dialog.getByRole("button", { name: "Non eliminare" }).click();
    await dialog.getByRole("button", { name: "Elimina dalla lista" }).click();
    await dialog.getByRole("button", { name: "Elimina", exact: true }).click();

    await expect(card(page, "Hoshi no Kioku")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(1);
  });

  test("Esc closes the editor and focus goes back to its button", async ({ page }) => {
    await logIn(page, "/lista");
    const edit = card(page, "Hoshi no Kioku").getByRole("button", { name: "Modifica: Hoshi no Kioku" });
    await edit.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(edit).toBeFocused();
  });
});

test("the change routes refuse other sites, missing sessions and bad input", async ({ page, request }) => {
  const save = { mediaId: 1, progress: 2 };
  expect((await request.post("/api/list/entry", { data: save, headers: { Origin: "http://localhost:3100" } })).status()).toBe(401);

  await logIn(page, "/lista");
  const fromPage = (path: string, body: unknown, origin?: string) =>
    page.request.post(path, { data: body, headers: { Origin: origin ?? "http://localhost:3100" } });
  expect((await fromPage("/api/list/entry", save, "https://evil.example")).status()).toBe(403);
  expect((await fromPage("/api/list/entry/delete", { id: 201 }, "https://evil.example")).status()).toBe(403);
  expect((await fromPage("/api/list/entry", { mediaId: 1, score: 42 })).status()).toBe(400);
  expect((await fromPage("/api/list/entry/delete", { id: "201" })).status()).toBe(400);
});

test.describe("from cards and the detail page", () => {
  test.use({ timezoneId: "Europe/Rome" });

  test("logged out, the card's + leads to the login and says why", async ({ page }) => {
    await mockAniList(page, [{ status: 200, media: searchResults }]);
    await page.goto("/ricerca?q=hoshi");

    await page.getByRole("link", { name: "Accedi con AniList per aggiungere «Hoshi no Kioku» alla tua lista" }).click();

    await expect(page).toHaveURL("/accesso?da=%2Fricerca%3Fq%3Dhoshi");
  });

  test("the card's + adds to Da vedere; pressed again it asks before removing", async ({ page }) => {
    await logIn(page);
    await mockAniList(page, [{ status: 200, media: searchResults }]);
    await page.goto("/ricerca?q=hoshi");
    const bodies = entryRequests(page);
    // Senza palinsesto is in the list already; Hoshi no Kioku too. Remove Hoshi, then add it back.
    const toggle = page.getByRole("button", { name: "Hoshi no Kioku: nella mia lista" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("Eliminare «Hoshi no Kioku» dalla lista su AniList?");
    await confirm.getByRole("button", { name: "Non eliminare" }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toBeFocused();

    await toggle.click();
    await page.getByRole("dialog").getByRole("button", { name: "Elimina", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => bodies).toEqual([{ mediaId: 1, status: "PLANNING" }]);
    await page.goto("/lista");
    await expect(card(page, "Hoshi no Kioku")).toContainText("Da vedere · 0 visti");
  });

  test("the detail page adds with the chosen status, then shows the entry", async ({ page }) => {
    await logIn(page);
    await page.goto("/lista");
    await card(page, "Hoshi no Kioku").getByRole("button", { name: "Modifica: Hoshi no Kioku" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Elimina dalla lista" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Elimina", exact: true }).click();
    await expect(card(page, "Hoshi no Kioku")).toHaveCount(0);
    const bodies = entryRequests(page);

    await page.goto("/anime/1");
    await page.getByRole("button", { name: "Aggiungi alla lista: Hoshi no Kioku" }).click();
    const dialog = page.getByRole("dialog", { name: "Aggiungi «Hoshi no Kioku» alla lista" });
    await dialog.getByLabel("Stato").selectOption({ label: "Sto guardando" });
    await dialog.getByRole("button", { name: "Salva" }).click();

    await expect(page.getByRole("button", { name: "Nella mia lista: Hoshi no Kioku" })).toBeVisible();
    await expect(page.getByText("Sto guardando · 0 visti")).toBeVisible();
    const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date()).split("-");
    await expect
      .poll(() => bodies)
      .toEqual([{ mediaId: 1, status: "CURRENT", startedAt: { year: +year, month: +month, day: +day } }]);
  });

  test("logged out, the detail page's button leads to the login", async ({ page }) => {
    await page.goto("/anime/1");

    await page.getByRole("link", { name: "Aggiungi alla lista" }).click();

    await expect(page).toHaveURL("/accesso?da=%2Fanime%2F1");
  });
});

test.describe("Continua a guardare", () => {
  test("shows the user's arrears on the Home, and leaves once caught up", async ({ page }) => {
    await logIn(page, "/");
    const section = page.getByRole("region", { name: "Continua a guardare" });

    // Senza palinsesto: Sto guardando, 0 of 1 episodes, finished. Hoshi no Kioku is completed: not here.
    await expect(section.getByRole("article")).toHaveCount(1);
    await expect(section.getByRole("article")).toContainText("Senza palinsesto");
    await expect(section.getByRole("article")).toContainText("Ti manca 1 episodio");
    // With the section there, the season grid's heading shows, to tell the two grids apart. (toBeVisible
    // would pass for a 1px screen-reader-only heading too: the position says whether it is laid out.)
    await expect(page.getByRole("heading", { name: "Gli altri anime della stagione" })).toHaveCSS("position", "static");

    await section.getByRole("button", { name: "+1 episodio visto: Senza palinsesto" }).click();

    // Caught up with the last card: the section stays for now, so focus has a place, then is gone next visit.
    await expect(section.getByRole("article")).toHaveCount(0);
    await expect(section.getByText("Sei in pari: nessun episodio arretrato.")).toBeVisible();
    const listRead = page.waitForResponse((response) => response.url().endsWith("/api/list"));
    await page.reload();
    await listRead;
    await expect(section).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Gli altri anime della stagione" })).toHaveCSS("position", "absolute");
  });

  test("from the keyboard, catching up moves focus to the next card, then to the heading, and says so", async ({ page }) => {
    await logIn(page, "/");
    // A second card with one episode to go: Hoshi no Kioku back to Sto guardando at 11 of 12.
    await page.evaluate(() =>
      fetch("/api/list/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: 1, status: "CURRENT", progress: 11 }),
      }),
    );
    await page.reload();
    const section = page.getByRole("region", { name: "Continua a guardare" });
    await expect(section.getByRole("article")).toHaveCount(2);

    // Newest change first: Hoshi no Kioku, then Senza palinsesto.
    await section.getByRole("button", { name: "+1 episodio visto: Hoshi no Kioku" }).focus();
    await page.keyboard.press("Enter");

    await expect(section.getByRole("link", { name: "Senza palinsesto", exact: true })).toBeFocused();
    await expect(section.getByRole("status")).toHaveText("Sei in pari con Hoshi no Kioku");
    await expect(section.getByRole("article")).toHaveCount(1);

    await page.keyboard.press("Tab");
    await expect(section.getByRole("button", { name: "+1 episodio visto: Senza palinsesto" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(section.getByRole("heading", { name: "Continua a guardare" })).toBeFocused();
    await expect(section.getByRole("status")).toHaveText("Sei in pari con Senza palinsesto");
    await expect(section.getByText("Sei in pari: nessun episodio arretrato.")).toBeVisible();
  });

  test("from the keyboard, catching up in the editor moves focus past the card once the dialog closes", async ({ page }) => {
    await logIn(page, "/");
    await page.evaluate(() =>
      fetch("/api/list/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: 1, status: "CURRENT", progress: 10 }),
      }),
    );
    await page.reload();
    const section = page.getByRole("region", { name: "Continua a guardare" });
    await expect(section.getByRole("article")).toHaveCount(2);

    // Hoshi no Kioku, 10 of 12: the episodes set to 12 in the editor.
    await section.getByRole("button", { name: "Modifica: Hoshi no Kioku" }).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Episodi visti/).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("12");
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(section.getByRole("link", { name: "Senza palinsesto", exact: true })).toBeFocused();
    await expect(section.getByRole("status")).toHaveText("Sei in pari con Hoshi no Kioku");
    await expect(section.getByRole("article")).toHaveCount(1);

    // Senza palinsesto, the last card: Completato fills the episodes, so that is catching up too.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(section.getByRole("button", { name: "Modifica: Senza palinsesto" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog.getByLabel("Stato")).toBeFocused();
    await page.keyboard.type("Comp");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(section.getByRole("heading", { name: "Continua a guardare" })).toBeFocused();
    await expect(section.getByRole("status")).toHaveText("Sei in pari con Senza palinsesto");
    await expect(section.getByText("Sei in pari: nessun episodio arretrato.")).toBeVisible();
  });

  test("a card leaving for another status also moves focus, with its own announcement", async ({ page }) => {
    await logIn(page, "/");
    const section = page.getByRole("region", { name: "Continua a guardare" });
    await expect(section.getByRole("article")).toHaveCount(1);

    await section.getByRole("button", { name: "Modifica: Senza palinsesto" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog").getByLabel("Stato")).toBeFocused();
    await page.keyboard.type("In p");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(section.getByRole("heading", { name: "Continua a guardare" })).toBeFocused();
    await expect(section.getByRole("status")).toHaveText("Senza palinsesto non è più in Continua a guardare");
    await expect(section.getByText("Nessun altro anime da continuare.")).toBeVisible();
  });
});
