import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema/anilist.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/gql/**"],
  generates: {
    "src/gql/": { preset: "client", config: { documentMode: "string" } },
  },
};

export default config;
