// No "server-only" here: next.config.ts imports this file too.

export const ANILIST_API_URL = "https://graphql.anilist.co";
export const ANILIST_OAUTH_URL = "https://anilist.co/api/v2/oauth";

type Env = Record<string, string | undefined>;

/** Where the server talks to AniList. The variables exist only so the e2e tests can use a fake AniList. */
export function aniListEndpoints(env: Env = process.env) {
  return {
    api: env.ANILIST_API_URL || ANILIST_API_URL,
    oauth: env.ANILIST_OAUTH_URL || ANILIST_OAUTH_URL,
  };
}

/**
 * On Vercel (VERCEL is set in every deployment, previews included) only AniList's own addresses are
 * accepted: a wrong value would send users' tokens and the client secret elsewhere. Locally the e2e
 * tests run the production build against a fake AniList, so the check is off there.
 */
export function assertRealAniListOnVercel(env: Env = process.env): void {
  if (!env.VERCEL) return;
  const { api, oauth } = aniListEndpoints(env);
  if (api !== ANILIST_API_URL) throw new Error(`On Vercel ANILIST_API_URL must be unset or ${ANILIST_API_URL}`);
  if (oauth !== ANILIST_OAUTH_URL) throw new Error(`On Vercel ANILIST_OAUTH_URL must be unset or ${ANILIST_OAUTH_URL}`);
}
