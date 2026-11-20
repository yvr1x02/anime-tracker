import type { CSSProperties } from "react";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** AniList's coverImage.color ends up in CSS, so anything but a plain #rrggbb is dropped. */
export function validCoverColor(color: string | null | undefined): string | null {
  return color && HEX_COLOR.test(color) ? color : null;
}

/** Props for an element that derives its tints from the cover (see `.has-cover` in globals.css). */
export function coverTintProps(color: string | null | undefined): {
  className?: string;
  style?: CSSProperties;
} {
  const cover = validCoverColor(color);
  return cover ? { className: "has-cover", style: { "--cover": cover } as CSSProperties } : {};
}
