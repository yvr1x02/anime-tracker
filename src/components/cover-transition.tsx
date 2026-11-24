"use client";

import Link from "next/link";
import { type ReactNode, ViewTransition, useLayoutEffect, useRef } from "react";
import { previousPathname } from "@/components/back-link";

// docs/DESIGN.md, "View Transitions": the cover morphs from the card into the Detail and back.
// The same anime can be on a page twice (Continua a guardare and the season grid), and two equal names stop the
// transition: cards outside the page's main grid add a scope to the name.
function coverName(id: number, scope?: string) {
  return scope ? `cover-${scope}-${id}` : `cover-${id}`;
}

// The card opened last: the Detail takes its cover's name, and focus goes back to its link on the way back.
let opened: { id: number; name: string } | null = null;

function NamedCover({ name, children }: { name: string; children: ReactNode }) {
  // `share` with `default="none"`: the cover only moves when the pair forms, never in other transitions.
  return (
    <ViewTransition name={name} share="cover" default="none">
      {children}
    </ViewTransition>
  );
}

/** A card's cover, named so it becomes the Detail's cover. */
export function CardCover({ id, scope, children }: { id: number; scope?: string; children: ReactNode }) {
  return <NamedCover name={coverName(id, scope)}>{children}</NamedCover>;
}

/** A card's title link: remembers the card it was clicked on and takes focus back when the Detail returns here. */
export function CardLink({ id, scope, className, children }: { id: number; scope?: string; className?: string; children: ReactNode }) {
  const link = useRef<HTMLAnchorElement>(null);
  const name = coverName(id, scope);

  // In the commit that brings the page back, so inside the transition's update.
  useLayoutEffect(() => {
    if (opened?.name !== name || previousPathname() !== `/anime/${id}`) return;
    opened = null;
    link.current?.focus();
  }, [id, name]);

  return (
    <Link
      ref={link}
      href={`/anime/${id}`}
      onClick={() => {
        opened = { id, name };
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

/** The Detail's cover, named like the card it was opened from; from anywhere else, like a card of a main grid. */
export function DetailCover({ id, children }: { id: number; children: ReactNode }) {
  return <NamedCover name={opened?.id === id ? opened.name : coverName(id)}>{children}</NamedCover>;
}

/** The Detail's `h1`: after a navigation inside the app, focus moves here (not on a page opened directly). */
export function DetailTitle({ className, children }: { className?: string; children: ReactNode }) {
  const title = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    if (previousPathname() !== null) title.current?.focus();
  }, []);

  return (
    <h1 ref={title} tabIndex={-1} className={`${className ?? ""} focus:outline-none`}>
      {children}
    </h1>
  );
}
