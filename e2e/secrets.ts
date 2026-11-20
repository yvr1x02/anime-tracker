// Fake, recognisable values for the e2e login: the tests check they never reach the browser or the logs.
export const e2eOAuth = {
  clientId: "e2e-client-id",
  clientSecret: "e2e-canary-client-secret-7c1f2a9e",
  /** Prefix of every token the fake AniList issues (one per login). */
  accessToken: "e2e-canary-access-token-3b8d6e40",
  viewer: { id: 7, name: "UtenteDiProva" },
};

/** The app server's output during the e2e run (playwright.config.ts). */
export const SERVER_LOG = ".next/e2e-server.log";
