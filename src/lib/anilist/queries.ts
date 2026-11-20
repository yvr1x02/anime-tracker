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
        status
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
        duration
        nextAiringEpisode {
          episode
          airingAt
        }
      }
    }
  }
`);

// The Home (ADR-0003: server, cached 6 hours). The fields are those of AnimeCardData.
export const SeasonAnimeQuery = graphql(`
  query SeasonAnime($season: MediaSeason!, $seasonYear: Int!, $perPage: Int!) {
    Page(page: 1, perPage: $perPage) {
      media(season: $season, seasonYear: $seasonYear, type: ANIME, isAdult: false, sort: [POPULARITY_DESC]) {
        id
        status
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
        duration
        nextAiringEpisode {
          episode
          airingAt
        }
      }
    }
  }
`);

// The calendar (ADR-0003, "Calendario"): a week's pages all in one request, so it arrives and is cached whole.
// airingSchedules has no isAdult filter: isAdult comes back and src/lib/schedule.ts drops those.
export const WeekSchedulePage = graphql(`
  fragment WeekSchedulePage on Page {
    pageInfo {
      hasNextPage
    }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: [TIME]) {
      id
      episode
      airingAt
      media {
        id
        isAdult
        title {
          romaji
          english
          native
        }
        coverImage {
          medium
          color
        }
        format
      }
    }
  }
`);

export const WeekScheduleQuery = graphql(`
  query WeekSchedule($from: Int!, $to: Int!) {
    p1: Page(page: 1, perPage: 50) {
      ...WeekSchedulePage
    }
    p2: Page(page: 2, perPage: 50) {
      ...WeekSchedulePage
    }
    p3: Page(page: 3, perPage: 50) {
      ...WeekSchedulePage
    }
    p4: Page(page: 4, perPage: 50) {
      ...WeekSchedulePage
    }
    p5: Page(page: 5, perPage: 50) {
      ...WeekSchedulePage
    }
    p6: Page(page: 6, perPage: 50) {
      ...WeekSchedulePage
    }
  }
`);

// Sent once at login, with the new token, to show the user's name (ADR-0004).
export const ViewerQuery = graphql(`
  query Viewer {
    Viewer {
      id
      name
    }
  }
`);

// The fields of a list entry, shared by the list and by the answer to a change. MediaListCollection has no
// isAdult filter, so isAdult comes back and src/lib/list.ts drops those. POINT_10_DECIMAL keeps one decimal
// whatever scoring system the user picked on AniList (POINT_10 would truncate 8.9 to 8).
export const ListEntryFields = graphql(`
  fragment ListEntryFields on MediaList {
    id
    status
    progress
    score(format: POINT_10_DECIMAL)
    notes
    updatedAt
    createdAt
    startedAt {
      year
      month
      day
    }
    completedAt {
      year
      month
      day
    }
    media {
      id
      isAdult
      status
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
      duration
      nextAiringEpisode {
        episode
        airingAt
      }
    }
  }
`);

// One request for a whole list (ADR-0004): the demo profile by name, the logged-in user by id.
export const UserAnimeListQuery = graphql(`
  query UserAnimeList($userId: Int, $userName: String) {
    MediaListCollection(userId: $userId, userName: $userName, type: ANIME, forceSingleCompletedList: true) {
      lists {
        entries {
          ...ListEntryFields
        }
      }
    }
  }
`);

// One change per request (ADR-0004); only the fields the user changed are sent. scoreRaw is the score out of 100.
export const SaveListEntryMutation = graphql(`
  mutation SaveListEntry(
    $mediaId: Int!
    $status: MediaListStatus
    $progress: Int
    $scoreRaw: Int
    $notes: String
    $startedAt: FuzzyDateInput
    $completedAt: FuzzyDateInput
  ) {
    SaveMediaListEntry(
      mediaId: $mediaId
      status: $status
      progress: $progress
      scoreRaw: $scoreRaw
      notes: $notes
      startedAt: $startedAt
      completedAt: $completedAt
    ) {
      ...ListEntryFields
    }
  }
`);

export const DeleteListEntryMutation = graphql(`
  mutation DeleteListEntry($id: Int!) {
    DeleteMediaListEntry(id: $id) {
      deleted
    }
  }
`);
