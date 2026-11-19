import type { MediaFormat, MediaSeason, MediaStatus } from "@/gql/graphql";

export const formatLabel: Record<MediaFormat, string> = {
  TV: "TV",
  TV_SHORT: "TV breve",
  MOVIE: "Film",
  SPECIAL: "Speciale",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Video musicale",
  MANGA: "Manga",
  NOVEL: "Light novel",
  ONE_SHOT: "One shot",
};

export const seasonLabel: Record<MediaSeason, string> = {
  WINTER: "Inverno",
  SPRING: "Primavera",
  SUMMER: "Estate",
  FALL: "Autunno",
};

export const statusLabel: Record<MediaStatus, string> = {
  FINISHED: "Concluso",
  RELEASING: "In corso",
  NOT_YET_RELEASED: "Non ancora uscito",
  CANCELLED: "Cancellato",
  HIATUS: "In pausa",
};

export function episodesLabel(episodes: number): string {
  return episodes === 1 ? "1 episodio" : `${episodes} episodi`;
}
