import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CoverImage } from "@/components/cover-image";
import { KanjiBackdrop } from "@/components/kanji-backdrop";
import { AniListError } from "@/lib/anilist/client";
import { AnimeDetailQuery } from "@/lib/anilist/queries";
import { requestAniListCached } from "@/lib/anilist/server";
import { episodesLabel, formatLabel, seasonLabel, statusLabel } from "@/lib/anime-labels";
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
    const { data } = await requestAniListCached(AnimeDetailQuery, { id }, REVALIDATE_SECONDS);
    if (!data.Media) notFound();
    return data.Media;
  } catch (error) {
    if (error instanceof AniListError && error.status === 404) notFound();
    throw error;
  }
});

type Anime = Awaited<ReturnType<typeof getAnime>>;

function mainTitle(anime: Anime): string {
  return anime.title?.romaji ?? anime.title?.english ?? anime.title?.native ?? "Anime senza titolo";
}

export async function generateMetadata({ params }: PageProps<"/anime/[id]">): Promise<Metadata> {
  const anime = await getAnime((await params).id);
  return {
    title: mainTitle(anime),
    description: descriptionToParagraphs(anime.description)[0]?.slice(0, 160),
  };
}

export default async function AnimeDetailPage({ params }: PageProps<"/anime/[id]">) {
  const anime = await getAnime((await params).id);
  const title = mainTitle(anime);
  const englishTitle = anime.title?.english && anime.title.english !== title ? anime.title.english : null;
  const paragraphs = descriptionToParagraphs(anime.description);
  const genres = (anime.genres ?? []).filter((genre): genre is string => Boolean(genre));
  const studios = (anime.studios?.nodes ?? []).filter((studio) => studio !== null);
  const season =
    anime.season && anime.seasonYear ? `${seasonLabel[anime.season]} ${anime.seasonYear}` : anime.seasonYear?.toString();
  const label = [anime.format && formatLabel[anime.format], season].filter(Boolean).join(" · ");
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
        <div className={`${pageContainer} relative grid items-end gap-8 pt-6 pb-14 md:grid-cols-[minmax(12rem,18rem)_1fr]`}>
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
          </div>
        </div>
      </header>

      <div className={`${pageContainer} grid gap-16 pt-16 pb-24 lg:grid-cols-[1fr_20rem]`}>
        <div className="flex max-w-[65ch] flex-col gap-14">
          <section aria-labelledby="trama">
            <h2 id="trama" className="text-h2">
              Trama
            </h2>
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={index} className="mt-4 whitespace-pre-line">
                  {paragraph}
                </p>
              ))
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
                  <li key={genre} className="genre-chip rounded-full px-3 py-1 text-small">
                    {genre}
                  </li>
                ))}
              </ul>
            </section>
          )}
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
        </aside>
      </div>
    </article>
  );
}
