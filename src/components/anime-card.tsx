"use client";

import Link from "next/link";
import { type PointerEvent, useEffect, useRef } from "react";
import { CoverImage } from "@/components/cover-image";
import type { MediaFormat, MediaSeason } from "@/gql/graphql";
import { type AiringEpisode, formatNextAiring, toISO, upcomingEpisodes } from "@/lib/airing";
import { animeTitle, episodesLabel, formatSeasonLine } from "@/lib/anime-labels";
import { cardTilt } from "@/lib/card-tilt";
import { coverTintProps } from "@/lib/cover-tint";
import { useNow } from "@/lib/use-now";

/** Fields a query must ask for to draw a card (checked in schema/anilist.graphql). */
export type AnimeCardData = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null } | null;
  coverImage: { medium: string | null; large: string | null; extraLarge: string | null; color: string | null } | null;
  format: MediaFormat | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  episodes: number | null;
  nextAiringEpisode: AiringEpisode | null;
};

// The widest a column of the card grid gets (docs/DESIGN.md): about 15rem from 640px, half the screen below.
const COVER_SIZES = "(min-width: 640px) 15rem, 50vw";

let tiltQuery: MediaQueryList | undefined;
function canTilt(event: PointerEvent) {
  tiltQuery ??= matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  return event.pointerType === "mouse" && tiltQuery.matches;
}

/** Anime card (docs/DESIGN.md, "Card dell'anime"): the title's link covers the whole card. */
export function AnimeCard({ anime }: { anime: AnimeCardData }) {
  const title = animeTitle(anime.title);
  const label = formatSeasonLine(anime.format, anime.season, anime.seasonYear);
  const cover = anime.coverImage;
  // Without a cover the card has no tint either.
  const tint = coverTintProps(cover?.medium || cover?.large || cover?.extraLarge ? cover.color : null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function tilt(event: PointerEvent<HTMLElement>) {
    if (!canTilt(event)) return;
    const card = event.currentTarget;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const { rx, ry } = cardTilt(clientX, clientY, card.getBoundingClientRect());
      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.dataset.tilting = "";
    });
  }

  function flatten(event: PointerEvent<HTMLElement>) {
    cancelAnimationFrame(frame.current);
    const card = event.currentTarget;
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
    delete card.dataset.tilting;
  }

  return (
    <article
      className={`anime-card rounded-panel ${tint.className ?? ""}`}
      style={tint.style}
      onPointerMove={tilt}
      onPointerLeave={flatten}
    >
      <div className="relative">
        <CoverImage cover={cover} title={title} sizes={COVER_SIZES} className="rounded-t-panel" />
        <AiringBadge next={anime.nextAiringEpisode} />
      </div>
      <div className="flex flex-col gap-1 p-3">
        {label && <p className="text-label uppercase text-ink-muted">{label}</p>}
        <h3 className="line-clamp-2 text-h3">
          <Link href={`/anime/${anime.id}`} className="anime-card-link">
            {title}
          </Link>
        </h3>
        {anime.episodes ? <p className="text-small text-ink-muted tabular-nums">{episodesLabel(anime.episodes)}</p> : null}
      </div>
    </article>
  );
}

/** "Ep. 7 · mer 16:30" on the cover, in the viewer's time zone; nothing once that episode has aired. */
function AiringBadge({ next }: { next: AiringEpisode | null }) {
  const now = useNow();
  const episode = now === null ? undefined : upcomingEpisodes([next], now)[0];
  if (!episode) return null;

  return (
    <p className="pointer-events-none absolute bottom-2 left-2 rounded-control bg-bg px-2 py-1 text-small text-cyan tabular-nums">
      <span className="sr-only">Prossimo episodio: </span>
      Ep. {episode.episode} · <time dateTime={toISO(episode.airingAt)}>{formatNextAiring(episode.airingAt, now!)}</time>
    </p>
  );
}

/** Loading placeholder with the card's shape; the grid around it carries aria-busy and the "Caricamento…" text. */
export function AnimeCardSkeleton() {
  return (
    <div aria-hidden="true" className="card-skeleton rounded-panel bg-surface">
      <div className="aspect-[2/3] rounded-t-panel bg-raised" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-2/3 rounded-control bg-raised" />
        <div className="h-5 w-full rounded-control bg-raised" />
      </div>
    </div>
  );
}
