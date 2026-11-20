import { defineConfig, devices } from "@playwright/test";
import { SERVER_LOG, e2eOAuth } from "./e2e/secrets";

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
    {
      command: "node e2e/fake-anilist.mjs",
      url: fakeAniListURL,
      env: {
        E2E_CLIENT_ID: e2eOAuth.clientId,
        E2E_CLIENT_SECRET: e2eOAuth.clientSecret,
        E2E_ACCESS_TOKEN: e2eOAuth.accessToken,
      },
      reuseExistingServer: false,
    },
    {
      // The server's output also goes to a file, which e2e/login.spec.ts searches for leaked secrets.
      command: `rm -rf .next/cache/fetch-cache && npm run build && npm run start -- --port ${port} 2>&1 | tee ${SERVER_LOG}`,
      url: baseURL,
      env: {
        ANILIST_API_URL: fakeAniListURL,
        ANILIST_OAUTH_URL: `${fakeAniListURL}/oauth`,
        ANILIST_CLIENT_ID: e2eOAuth.clientId,
        ANILIST_CLIENT_SECRET: e2eOAuth.clientSecret,
        ANILIST_REDIRECT_URI: `${baseURL}/api/auth/callback`,
        ANILIST_DEMO_USERNAME: "UtenteDemo",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
