import { defineConfig, devices } from "@playwright/test";

// Not 3000: another local server may already be listening there.
const port = 3100;
const baseURL = `http://localhost:${port}`;
const fakeAniListURL = "http://localhost:3999";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Always test the build made for this run; fail if something already holds a port.
  // The fetch cache survives builds (ADR-0003): it's emptied so the fake AniList's data is always read anew.
  webServer: [
    { command: "node e2e/fake-anilist.mjs", url: fakeAniListURL, reuseExistingServer: false },
    {
      command: `rm -rf .next/cache/fetch-cache && npm run build && npm run start -- --port ${port}`,
      url: baseURL,
      env: { ANILIST_API_URL: fakeAniListURL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
