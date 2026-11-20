import type { NextConfig } from "next";
import { assertRealAniListOnVercel } from "./src/lib/anilist/endpoints";

// Read by `next build` and `next start`: on Vercel a fake AniList address stops both (ADR-0004).
assertRealAniListOnVercel();

const nextConfig: NextConfig = {
  // No cacheComponents: ADR-0003 uses fetch cache with revalidate, which survives deploys.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
