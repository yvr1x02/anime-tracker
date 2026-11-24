type Cover = { medium: string | null; large: string | null; extraLarge: string | null } | null;

type Props = {
  cover: Cover;
  title: string;
  /** `sizes` attribute: how wide the cover is drawn at each breakpoint. */
  sizes: string;
  eager?: boolean;
  className?: string;
};

/**
 * AniList cover in its three sizes (100, 230 and 460px wide, measured). Decorative (`alt=""`):
 * the title is always next to it. Without a cover, the title's initial on `raised`.
 */
export function CoverImage({ cover, title, sizes, eager = false, className = "" }: Props) {
  const sources = [
    [cover?.medium, 100],
    [cover?.large, 230],
    [cover?.extraLarge, 460],
  ].filter((source): source is [string, number] => Boolean(source[0]));
  const frame = `aspect-[2/3] w-full ${className}`;

  if (sources.length === 0) {
    return (
      <div aria-hidden="true" data-cover="" className={`${frame} flex items-center justify-center bg-raised text-display text-ink-muted`}>
        {title.trim().charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- AniList already serves three sizes; next/image would use Vercel's capped image optimization (DESIGN.md).
    <img
      src={sources[sources.length - 1][0]}
      srcSet={sources.map(([url, width]) => `${url} ${width}w`).join(", ")}
      sizes={sizes}
      alt=""
      data-cover=""
      width={460}
      height={690}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`${frame} object-cover`}
    />
  );
}
