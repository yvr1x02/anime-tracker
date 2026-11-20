import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BackLink } from "@/components/back-link";
import { CoverImage } from "@/components/cover-image";
import { DataFreshness } from "@/components/data-freshness";
import { KanjiBackdrop } from "@/components/kanji-backdrop";
import { DetailListAction } from "@/components/list-actions";
import { NextEpisode, UpcomingEpisodes } from "@/components/upcoming-episodes";
import { AniListError } from "@/lib/anilist/client";
import { AnimeDetailQuery } from "@/lib/anilist/queries";
import { requestAniListCached } from "@/lib/anilist/server";
import {
  animeTitle,
  episodesLabel,
  formatLabel,
  formatSeasonLine,
  genreLabel,
  genreLang,
  seasonText,
  statusLabel,
} from "@/lib/anime-labels";
import { coverTintProps } from "@/lib/cover-tint";
import { descriptionToParagraphs } from "@/lib/description";
import { pageContainer } from "@/lib/page-container";

// ADR-0003: detail data is cached for one hour.
const REVALIDATE_SECONDS = 3600;
const MAX_GRAPHQL_INT = 2_147_483_647;

// Empty list: every detail page is rendered on its first visit, then cached and revalidated (ISR).
export function generateStaticParams() {
  return [];
}

const getAnime = cache(async (rawId: string) => {
  const id = /^[1-9]\d{0,9}$/.test(rawId) ? Number(rawId) : NaN;
  if (!(id <= MAX_GRAPHQL_INT)) notFound();

  try {
    const { data, fetchedAt } = await requestAniListCached(AnimeDetailQuery, { id }, REVALIDATE_SECONDS);
    if (!data.Media) notFound();
    return { anime: data.Media, fetchedAt };
  } catch (error) {
    if (error instanceof AniListError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: PageProps<"/anime/[id]">): Promise<Metadata> {
  const { anime } = await getAnime((await params).id);
  return {
    title: animeTitle(anime.title),
    description: descriptionToParagraphs(anime.description)[0]?.slice(0, 160),
  };
}

export default async function AnimeDetailPage({ params }: PageProps<"/anime/[id]">) {
  const { anime, fetchedAt } = await getAnime((await params).id);
  const title = animeTitle(anime.title);
  const englishTitle = anime.title?.english && anime.title.english !== title ? anime.title.english : null;
  const paragraphs = descriptionToParagraphs(anime.description);
  const genres = (anime.genres ?? []).filter((genre): genre is string => Boolean(genre));
  const studios = (anime.studios?.nodes ?? []).filter((studio) => studio !== null);
  const season = seasonText(anime.season, anime.seasonYear);
  const label = formatSeasonLine(anime.format, anime.season, anime.seasonYear);
  const facts = [
    anime.episodes && episodesLabel(anime.episodes),
    anime.duration && `${anime.duration} min`,
    studios[0]?.name,
  ].filter(Boolean);
  const info = [
    ["Formato", anime.format && formatLabel[anime.format]],
    ["Episodi", anime.episodes],
    ["Durata", anime.duration && `${anime.duration} min a episodio`],
    ["Stagione", season],
    ["Stato", anime.status && statusLabel[anime.status]],
  ].filter((row): row is [string, string | number] => Boolean(row[1]));
  const tint = coverTintProps(anime.coverImage?.color);

  return (
    <article className={tint.className} style={tint.style}>
      <header className="detail-header relative">
        {anime.title?.native && <KanjiBackdrop text={anime.title.native} />}
        <div className={`${pageContainer} relative pt-6 pb-14`}>
          <BackLink />
          <div className="mt-4 grid items-end gap-8 md:grid-cols-[minmax(12rem,18rem)_1fr]">
            <CoverImage
              cover={anime.coverImage}
              title={title}
              sizes="(min-width: 768px) 18rem, min(18rem, 100vw - 2rem)"
              eager
              className="detail-cover max-w-72 rounded-panel"
            />
            <div>
              {label && <p className="text-label uppercase text-ink-muted">{label}</p>}
              <h1 className="mt-2 text-display text-balance">{title}</h1>
              {englishTitle && <p className="mt-3 text-h3 text-ink-muted">{englishTitle}</p>}
              {facts.length > 0 && (
                <p className="mt-4 text-small text-ink-muted tabular-nums">{facts.join(" · ")}</p>
              )}
              <NextEpisode schedule={anime.airingSchedule?.nodes} />
              {/* The personal part comes from the browser, so the page itself stays cached (ADR-0004). */}
              <DetailListAction
                media={{
                  id: anime.id,
                  isAdult: false,
                  title: anime.title,
                  coverImage: anime.coverImage,
                  format: anime.format,
                  season: anime.season,
                  seasonYear: anime.seasonYear,
                  episodes: anime.episodes,
                  nextAiringEpisode: null,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className={`${pageContainer} grid gap-16 pt-16 pb-24 lg:grid-cols-[1fr_20rem]`}>
        <div className="flex max-w-[65ch] flex-col gap-14">
          <section aria-labelledby="trama">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 id="trama" className="text-h2">
                Trama
              </h2>
              {paragraphs.length > 0 && <p className="text-small text-ink-muted">(in inglese, da AniList)</p>}
            </div>
            {paragraphs.length > 0 ? (
              // AniList only has English plots: lang lets screen readers switch voice (WCAG 3.1.2).
              <div lang="en">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="mt-4 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-ink-muted">Trama non disponibile.</p>
            )}
          </section>

          {genres.length > 0 && (
            <section aria-labelledby="generi">
              <h2 id="generi" className="text-h2">
                Generi
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <li key={genre} lang={genreLang(genre)} className="genre-chip rounded-full px-3 py-1 text-small">
                    {genreLabel(genre)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <UpcomingEpisodes schedule={anime.airingSchedule?.nodes} />
        </div>

        <aside aria-label="Scheda" className="flex flex-col gap-4 self-start lg:sticky lg:top-[88px]">
          <section aria-labelledby="informazioni" className="rounded-panel bg-surface px-6 py-5">
            <h2 id="informazioni" className="text-h3">
              Informazioni
            </h2>
            <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-small">
              {info.map(([term, value]) => (
                <div key={term} className="contents">
                  <dt className="text-ink-muted">{term}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
              {anime.title?.native && (
                <div className="contents">
                  <dt className="text-ink-muted">Titolo originale</dt>
                  <dd lang="ja">{anime.title.native}</dd>
                </div>
              )}
            </dl>
          </section>

          {studios.length > 0 && (
            <section aria-labelledby="studi" className="rounded-panel bg-surface px-6 py-5">
              <h2 id="studi" className="text-h3">
                Studi
              </h2>
              <ul className="mt-3 text-small">
                {studios.map((studio) => (
                  <li key={studio.id}>{studio.name}</li>
                ))}
              </ul>
            </section>
          )}

          <DataFreshness fetchedAt={fetchedAt} maxAgeSeconds={REVALIDATE_SECONDS} />
        </aside>
      </div>
    </article>
  );
}
