import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema/anilist.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/gql/**"],
  // shortcut: M0 has no queries yet, so an empty document set must not fail; remove once M1 adds the first query.
  ignoreNoDocuments: true,
  generates: {
    "src/gql/": { preset: "client", config: { documentMode: "string" } },
  },
};

export default config;
