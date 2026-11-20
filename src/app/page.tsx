import { AnimeCard } from "@/components/anime-card";
import { FeaturedAnime } from "@/components/featured-anime";
import { ListToggle } from "@/components/list-actions";
import { SeasonAnimeQuery } from "@/lib/anilist/queries";
import { requestAniListCached } from "@/lib/anilist/server";
import { seasonLabel } from "@/lib/anime-labels";
import { cardGrid } from "@/lib/card-grid";
import { pageContainer } from "@/lib/page-container";
import { currentSeason } from "@/lib/season";

// ADR-0003: the season is the same for everyone and changes little, so it is cached for 6 hours.
const REVALIDATE_SECONDS = 21_600;
// One featured and 24 in the grid: four rows of six at 1280px. No further pages, as in the search.
const SEASON_SIZE = 25;

export default async function Home() {
  const { season, year } = currentSeason();
  const { data } = await requestAniListCached(
    SeasonAnimeQuery,
    { season, seasonYear: year, perPage: SEASON_SIZE },
    REVALIDATE_SECONDS,
  );
  const [featured, ...others] = (data.Page?.media ?? []).filter((item) => item !== null);

  return (
    <div className={`${pageContainer} pt-5 pb-12`}>
      {/* docs/DESIGN.md, "Home": two columns from 1024px, stacked below. */}
      <header className="grid items-end gap-8 pb-3 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-label uppercase text-cyan">Stagione in corso</p>
          <h1 className="mt-2 text-display-xl">
            {seasonLabel[season]}
            <br />
            {year}
          </h1>
          <p className="mt-4 max-w-md text-ink-muted">Gli anime di questa stagione su AniList, dal più popolare.</p>
        </div>
        {featured && (
          <div className="lg:max-w-xl">
            <FeaturedAnime anime={featured} />
          </div>
        )}
      </header>

      <section aria-labelledby="stagione" className="mt-4">
        {/* For screen readers: a visible heading would push the first row below 800px (docs/DESIGN.md). */}
        <h2 id="stagione" className="sr-only">
          Gli altri anime della stagione
        </h2>
        {!featured ? (
          <p className="text-ink-muted">AniList non ha ancora anime per questa stagione.</p>
        ) : (
          <ul className={cardGrid}>
            {others.map((item) => (
              <li key={item.id}>
                {/* The query asks for isAdult: false. */}
                <AnimeCard anime={item} action={<ListToggle media={{ ...item, isAdult: false }} />} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
