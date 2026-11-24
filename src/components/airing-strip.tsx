"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toISO } from "@/lib/airing";
import type { SoonEpisode } from "@/lib/calendar";
import { useNow } from "@/lib/use-now";

const MAX_ITEMS = 12;
const SPAN_SECONDS = 24 * 3600;
// docs/DESIGN.md, "Striscia": a constant speed, so the loop lasts as long as its content is wide.
const PIXELS_PER_SECOND = 40;
const when = new Intl.DateTimeFormat("it-IT", { weekday: "short", hour: "2-digit", minute: "2-digit" });

/**
 * "In onda ora" under the Home's header (SPEC, "Home"; docs/DESIGN.md, "Striscia"): the next 24 hours in the
 * browser's clock, at most 12 episodes. It scrolls by itself, stops on hover or focus, and has a Pausa button
 * (WCAG 2.2.2); with reduced motion it stands still and scrolls by hand. Not shown when nothing airs.
 */
export function AiringStrip({ episodes }: { episodes: SoonEpisode[] }) {
  const now = useNow();
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const soon =
    now === null
      ? []
      : episodes.filter(({ airingAt }) => airingAt * 1000 > now && airingAt * 1000 <= now + SPAN_SECONDS * 1000).slice(0, MAX_ITEMS);
  const key = soon.map(({ id }) => id).join();

  useEffect(() => {
    // The track holds the list twice and moves by half its width per loop.
    if (track.current) track.current.style.setProperty("--strip-duration", `${track.current.scrollWidth / 2 / PIXELS_PER_SECOND}s`);
  }, [key]);

  if (soon.length === 0) return null;

  const items = soon.map(({ id, episode, airingAt, media }) => (
    <li key={id}>
      <Link href={`/anime/${media.id}`} className="airing-item">
        <span className="airing-item-title">{media.title}</span>{" "}
        <span className="tabular-nums">
          · Ep. {episode} · <time dateTime={toISO(airingAt)}>{when.format(airingAt * 1000)}</time>
        </span>
      </Link>
    </li>
  ));

  return (
    <section aria-labelledby="in-onda" className="airing-strip" data-paused={paused || undefined}>
      <h2 id="in-onda" className="flex shrink-0 items-center gap-2 text-label uppercase text-cyan">
        <span aria-hidden="true" className="size-2 rounded-full bg-cyan" />
        In onda ora
      </h2>
      <div className="airing-strip-viewport">
        <div ref={track} className="airing-strip-track">
          <ul className="airing-strip-list">{items}</ul>
          {/* The second copy only closes the loop: hidden from screen readers and the keyboard. */}
          <ul aria-hidden="true" inert className="airing-strip-list airing-strip-copy">
            {items}
          </ul>
        </div>
      </div>
      <button type="button" onClick={() => setPaused(!paused)} className="airing-strip-pause button shrink-0">
        {paused ? "Riprendi" : "Pausa"}
      </button>
    </section>
  );
}
