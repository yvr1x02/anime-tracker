import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema/anilist.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/gql/**"],
  generates: {
    // No fragment masking: a fragment's fields stay plain properties of the query types.
    "src/gql/": { preset: "client", presetConfig: { fragmentMasking: false }, config: { documentMode: "string" } },
  },
};

export default config;
