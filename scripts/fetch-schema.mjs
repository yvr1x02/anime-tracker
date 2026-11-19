// Downloads the AniList schema with one introspection request and saves it as SDL.
// Run only when the schema needs refreshing: every request counts against AniList's rate limit.
import { writeFile } from "node:fs/promises";
import { buildClientSchema, getIntrospectionQuery, printSchema } from "graphql";

const ENDPOINT = "https://graphql.anilist.co";
const OUTPUT = "schema/anilist.graphql";

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
});

if (!response.ok) {
  throw new Error(`AniList responded ${response.status} ${response.statusText}`);
}

const { data, errors } = await response.json();
if (errors?.length) {
  throw new Error(`AniList introspection failed: ${errors.map((e) => e.message).join("; ")}`);
}

// buildClientSchema validates the payload, so a malformed response never overwrites the saved schema.
const sdl = printSchema(buildClientSchema(data));
await writeFile(OUTPUT, `${sdl}\n`);
console.log(`Saved ${OUTPUT}`);
