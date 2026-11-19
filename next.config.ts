import type { NextConfig } from "next";

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
