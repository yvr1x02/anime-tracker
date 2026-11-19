import { graphql } from "@/gql";

// Fields checked against schema/anilist.graphql. Every query excludes adult anime (isAdult: false, see SPEC).
export const AnimeDetailQuery = graphql(`
  query AnimeDetail($id: Int!) {
    Media(id: $id, type: ANIME, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        medium
        large
        extraLarge
        color
      }
      description(asHtml: false)
      genres
      studios(isMain: true) {
        nodes {
          id
          name
        }
      }
      format
      status
      episodes
      duration
      season
      seasonYear
    }
  }
`);
