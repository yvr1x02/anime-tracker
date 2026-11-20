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

// AniList's GenreCollection on 2026-11-20. A Map, so names like "constructor" can't hit Object's prototype.
const genreLabels = new Map([
  ["Action", "Azione"],
  ["Adventure", "Avventura"],
  ["Comedy", "Commedia"],
  ["Drama", "Drammatico"],
  ["Ecchi", "Ecchi"],
  ["Fantasy", "Fantasy"],
  ["Hentai", "Hentai"],
  ["Horror", "Horror"],
  ["Mahou Shoujo", "Majokko"],
  ["Mecha", "Mecha"],
  ["Music", "Musica"],
  ["Mystery", "Mistero"],
  ["Psychological", "Psicologico"],
  ["Romance", "Sentimentale"],
  ["Sci-Fi", "Fantascienza"],
  ["Slice of Life", "Vita quotidiana"],
  ["Sports", "Sport"],
  ["Supernatural", "Soprannaturale"],
  ["Thriller", "Thriller"],
]);

/** Italian name of an AniList genre; a genre AniList adds later keeps its English name. */
export function genreLabel(genre: string): string {
  return genreLabels.get(genre) ?? genre;
}

/** "en" for a genre missing from the table, shown in English, so screen readers switch voice (WCAG 3.1.2). */
export function genreLang(genre: string): "en" | undefined {
  return genreLabels.has(genre) ? undefined : "en";
}
