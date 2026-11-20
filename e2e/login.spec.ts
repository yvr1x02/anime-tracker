import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { type Page, expect, test } from "@playwright/test";
import { mockAniList, searchResults } from "./anilist-browser";
import { SERVER_LOG, e2eOAuth } from "./secrets";
import { logIn } from "./session";

// The fake AniList (e2e/fake-anilist.mjs) approves every login straight away.
const header = (page: Page) => page.getByRole("banner");


test("login goes through AniList and back to the page it started from", async ({ page }) => {
  await mockAniList(page, [{ status: 200, media: searchResults }]);
  await page.goto("/ricerca?q=hoshi");
  await header(page).getByRole("link", { name: "Accedi" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Accedi con AniList" })).toBeVisible();
  // ADR-0004: the unofficial-client statement sits next to the login button.
  await expect(page.getByText("Anime Tracker è un client non ufficiale per AniList, non affiliato ad AniList.").first()).toBeVisible();
  await page.getByRole("link", { name: "Accedi con AniList" }).click();

  await expect(page).toHaveURL("/ricerca?q=hoshi");
  await expect(header(page).getByText(e2eOAuth.viewer.name)).toBeVisible();
  await expect(header(page).getByRole("button", { name: "Esci" })).toBeVisible();
});

test("the session cookie is HttpOnly and __Host-, the name cookie holds only id and name", async ({ page, context }) => {
  await logIn(page);

  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === "__Host-session");
  expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
  expect(session!.value.startsWith(e2eOAuth.accessToken)).toBe(true);
  expect(session!.expires - Date.now() / 1000).toBeGreaterThan(29 * 24 * 3600);
  const viewer = cookies.find((cookie) => cookie.name === "__Host-viewer");
  expect(viewer).toMatchObject({ httpOnly: false, secure: true, path: "/" });
  expect(JSON.parse(Buffer.from(viewer!.value, "base64url").toString())).toEqual(e2eOAuth.viewer);
  expect(Math.abs(viewer!.expires - session!.expires)).toBeLessThan(5);
  const user = cookies.find((cookie) => cookie.name === "__Host-session-user");
  expect(user).toMatchObject({ value: "7", httpOnly: true, secure: true, path: "/" });
  expect(await page.evaluate(() => document.cookie)).not.toContain(e2eOAuth.accessToken);
});

test("the client secret and the token never reach the browser or the server log", async ({ page }) => {
  const seen: string[] = [];
  page.on("response", async (response) => {
    seen.push(response.url(), JSON.stringify(await response.allHeaders()));
    if (response.status() < 300 || response.status() >= 400) seen.push(await response.text().catch(() => ""));
  });
  await logIn(page, "/anime/1");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Hoshi no Kioku" })).toBeVisible();

  // Set-Cookie of the session is the one place the token may travel: drop it, check the rest.
  const browserTraffic = seen.join("\n").replace(/__Host-session=[^;\s"]+/g, "");
  expect(browserTraffic).not.toContain(e2eOAuth.clientSecret);
  expect(browserTraffic).not.toContain(e2eOAuth.accessToken);

  // Every file the browser could download, not only those this page loaded.
  const staticDir = ".next/static";
  for (const file of await readdir(staticDir, { recursive: true, withFileTypes: true })) {
    if (!file.isFile()) continue;
    const content = await readFile(path.join(file.parentPath, file.name), "utf8");
    expect(content, file.name).not.toContain(e2eOAuth.clientSecret);
  }

  const log = await readFile(SERVER_LOG, "utf8");
  expect(log).not.toContain(e2eOAuth.clientSecret);
  expect(log).not.toContain(e2eOAuth.accessToken);
});

test("a callback without the state saved at the start is refused", async ({ page, context }) => {
  await page.goto("/api/auth/callback?code=e2e-code&state=forged");

  await expect(page).toHaveURL("/accesso?esito=errore");
  await expect(page.getByRole("status")).toHaveText(
    "Non è stato possibile completare l'accesso. Riprova tra qualche minuto.",
  );
  expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain("__Host-session");
});

test("a login refused on AniList says so", async ({ page }) => {
  await page.goto("/api/auth/callback?error=access_denied");

  await expect(page.getByRole("status")).toHaveText("Accesso annullato: non hai autorizzato Anime Tracker su AniList.");
});

test("the return path stays inside the app", async ({ page }) => {
  await page.goto("/accesso?da=//evil.example/path");
  await page.getByRole("link", { name: "Accedi con AniList" }).click();

  await expect(page).toHaveURL("/");
});

test("logout removes both cookies and explains how to revoke access", async ({ page, context }) => {
  await logIn(page);

  await header(page).getByRole("button", { name: "Esci" }).click();

  await expect(page).toHaveURL("/accesso?esito=uscito");
  await expect(page.getByRole("status")).toContainText("impostazioni del tuo account AniList");
  expect((await context.cookies()).map((cookie) => cookie.name)).toEqual([]);
  await expect(header(page).getByRole("link", { name: "Accedi" })).toBeVisible();
});

test("logout from another site is refused", async ({ page, context }) => {
  await logIn(page);

  const response = await page.request.post("/api/auth/logout", { headers: { Origin: "https://evil.example" } });

  expect(response.status()).toBe(403);
  expect((await context.cookies()).map((cookie) => cookie.name)).toContain("__Host-session");
});

test("on a 360px phone the header stays on one line, logged out and in", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const fits = async () => {
    await expect(page.getByRole("link", { name: "La mia lista" })).toBeVisible();
    const { scroll, width, headerHeight, linkHeight } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
      headerHeight: document.querySelector("header")!.getBoundingClientRect().height,
      linkHeight: document.querySelector('nav a[href="/lista"]')!.getBoundingClientRect().height,
    }));
    expect(scroll).toBeLessThanOrEqual(width);
    expect(headerHeight).toBe(64);
    expect(linkHeight).toBe(44);
  };

  await page.goto("/lista");
  await expect(header(page).getByRole("link", { name: "Accedi" })).toBeVisible();
  await fits();

  await logIn(page, "/lista");
  await fits();
});
