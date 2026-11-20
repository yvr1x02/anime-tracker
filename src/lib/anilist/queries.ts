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
      airingSchedule(notYetAired: true, perPage: 4) {
        nodes {
          episode
          airingAt
        }
      }
    }
  }
`);

// Sent from the browser (ADR-0003). The fields are those of AnimeCardData.
export const SearchAnimeQuery = graphql(`
  query SearchAnime($search: String!, $perPage: Int!) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
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
        format
        season
        seasonYear
        episodes
        nextAiringEpisode {
          episode
          airingAt
        }
      }
    }
  }
`);
