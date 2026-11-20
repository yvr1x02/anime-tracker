import type { MediaSeason } from "@/gql/graphql";

/**
 * The season airing now, from SPEC ("Home"): winter January–March, spring April–June, summer July–September,
 * autumn October–December. UTC: it runs on the server, where the cached Home is built.
 */
export function currentSeason(date: Date = new Date()): { season: MediaSeason; year: number } {
  const seasons: MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];
  return { season: seasons[Math.floor(date.getUTCMonth() / 3)], year: date.getUTCFullYear() };
}
