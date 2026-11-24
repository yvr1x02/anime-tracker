import { type AnimeCardData } from "@/components/anime-card";
import { CoverImage } from "@/components/cover-image";
import { CardCover, CardLink } from "@/components/cover-transition";
import { ListToggle } from "@/components/list-actions";
import { NextEpisode } from "@/components/upcoming-episodes";
import { animeTitle, episodesLabel, formatSeasonLine } from "@/lib/anime-labels";
import { coverTintProps } from "@/lib/cover-tint";

/**
 * "N. 1 della stagione" in the Home's header (docs/DESIGN.md, "Home"): a large card, wholly clickable,
 * with the strong glow of the cover's colour around it.
 */
export function FeaturedAnime({ anime }: { anime: AnimeCardData }) {
  const title = animeTitle(anime.title);
  const cover = anime.coverImage;
  const tint = coverTintProps(cover?.medium || cover?.large || cover?.extraLarge ? cover.color : null);
  const facts = [formatSeasonLine(anime.format, null, null), anime.episodes && episodesLabel(anime.episodes)].filter(
    Boolean,
  );

  return (
    <article
      aria-labelledby={`in-evidenza-${anime.id}`}
      className={`anime-card featured-anime grid grid-cols-[auto_1fr] items-end gap-5 p-4 ${tint.className ?? ""}`}
      style={tint.style}
    >
      <div className="w-[clamp(8rem,10vw,10rem)]">
        <CardCover id={anime.id}>
          <CoverImage cover={cover} title={title} sizes="clamp(8rem, 10vw, 10rem)" eager className="rounded-[0.5rem]" />
        </CardCover>
      </div>
      <div className="min-w-0">
        <p className="text-label uppercase text-cyan">N. 1 della stagione</p>
        <h2 id={`in-evidenza-${anime.id}`} className="mt-2 text-h2 text-balance">
          <CardLink id={anime.id} className="anime-card-link">
            {title}
          </CardLink>
        </h2>
        {facts.length > 0 && <p className="mt-2 text-small text-ink-muted tabular-nums">{facts.join(" · ")}</p>}
        <NextEpisode schedule={anime.nextAiringEpisode ? [anime.nextAiringEpisode] : []} />
        <div className="relative z-10 mt-3">
          {/* The season query asks for isAdult: false. */}
          <ListToggle media={{ ...anime, isAdult: false }} />
        </div>
      </div>
    </article>
  );
}
