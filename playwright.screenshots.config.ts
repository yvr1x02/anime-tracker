import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// npm run screenshots: the README's images, from the fake AniList's showcase data (e2e/showcase.mjs). Same servers
// as the e2e tests, with FAKE_SHOWCASE=1, so it cannot run at the same time as them.
const [fake, app] = base.webServer as NonNullable<Extract<typeof base.webServer, unknown[]>>;

export default defineConfig({
  ...base,
  testDir: "./scripts",
  testMatch: "screenshots.spec.ts",
  projects: undefined,
  webServer: [{ ...fake, env: { ...fake.env, FAKE_SHOWCASE: "1" } }, app],
});
