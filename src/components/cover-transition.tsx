"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
// The name of the Detail's cover on the page, and where it was when Back left the page.
let detailName: string | null = null;
let leaving: { name: string; cover: HTMLElement; rect: DOMRect } | null = null;
// The way back being drawn: one at a time, stopped by the next Back or when its card leaves the page.
let flight: { frame: number; card: HTMLElement; copy?: HTMLElement; animation?: Animation } | null = null;
let pageFade: Animation | null = null;
// A Back from a Detail whose page has not been committed yet (BackFromDetail finishes it).
let backFromDetail = false;

/** Stops the flight in progress, if any: no copy is left on the page and the card shows its cover again. */
function stopFlight() {
  if (!flight) return;
  const { frame, card, copy, animation } = flight;
  flight = null;
  cancelAnimationFrame(frame);
  animation?.cancel();
  copy?.remove();
  card.style.visibility = "";
}

// Back runs without a View Transition: React renders a popstate at once, so the browser can restore the scroll, and
// that render cannot animate (React 19.3). The way back is drawn by hand instead, with the cover leaving from where
// it is now. Capture, added before Next's listener: the Detail is still on the page.
if (typeof window !== "undefined") {
  window.addEventListener(
    "popstate",
    () => {
      stopFlight();
      pageFade?.cancel();
      const cover = document.querySelector<HTMLElement>(".detail-cover");
      leaving = cover && detailName ? { name: detailName, cover, rect: cover.getBoundingClientRect() } : null;
      backFromDetail = leaving !== null;
    },
    { capture: true },
  );
}

/**
 * The cover flies from the Detail back into the card, as the View Transition does on the way there but backwards
 * (400ms, `--spring-gentle`), while the page fades in. A copy flies, fixed and under the header, so the card's
 * frame does not clip it. With reduced motion, or when the card takes no room on the page, only the fade.
 */
function flyBack(from: NonNullable<typeof leaving>, card: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // After the browser has restored the scroll: the card's place on screen is known only then.
  const frame = requestAnimationFrame(() => {
    if (flight?.frame !== frame) return;
    // Under the pointer or with a keyboard focus ring the card lifts by 6px, a 400ms transition that has just
    // started: ended at once, so the copy lands where the card stays. Unseen: the page starts its fade from 0.
    const lifting = card.closest<HTMLElement>(".anime-card");
    lifting?.style.setProperty("transition", "none");
    const end = card.getBoundingClientRect();
    lifting?.style.removeProperty("transition");
    // A card no longer on the page, or taking no room: no copy flying towards the corner.
    if (!card.isConnected || !end.width || !end.height) {
      flight = null;
      return;
    }
    const copy = from.cover.cloneNode(true) as HTMLElement;
    // The image already shown, not another size from srcset.
    if (copy instanceof HTMLImageElement && from.cover instanceof HTMLImageElement) {
      copy.removeAttribute("srcset");
      copy.src = from.cover.currentSrc;
    }
    copy.dataset.coverFlight = "";
    Object.assign(copy.style, {
      position: "fixed",
      left: `${end.left}px`,
      top: `${end.top}px`,
      width: `${end.width}px`,
      height: `${end.height}px`,
      maxWidth: "none",
      margin: "0",
      zIndex: "30",
      pointerEvents: "none",
      transformOrigin: "0 0",
    });
    document.body.append(copy);
    card.style.visibility = "hidden";
    const { left, top, width, height } = from.rect;
    const animation = copy.animate(
      [
        { transform: `translate(${left - end.left}px, ${top - end.top}px) scale(${width / end.width}, ${height / end.height})` },
        { transform: "none" },
      ],
      { duration: 400, easing: getComputedStyle(document.documentElement).getPropertyValue("--spring-gentle").trim() || "ease-out" },
    );
    flight = { frame, card, copy, animation };
    animation.finished.then(() => {
      if (flight?.animation === animation) stopFlight();
    }, () => {});
  });
  flight = { frame, card };
}

/**
 * Mounted in the layout after the page, so its effect runs after the cards': ends a Back from a Detail in the commit
 * that shows the page, which React may hold until a View Transition still running has finished. The page fades in;
 * the Detail's title had focus, so without a card to take it back the page's content gets it, not the body.
 */
export function BackFromDetail() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!backFromDetail) return;
    backFromDetail = false;
    leaving = null;
    const main = document.getElementById("contenuto");
    const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--duration-base"));
    pageFade = main?.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: "ease-out" }) ?? null;
    if (document.activeElement === document.body || !document.activeElement) main?.focus();
  }, [pathname]);

  return null;
}

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

  // In the commit that brings the page back: inside the View Transition's update, or right after a popstate.
  useLayoutEffect(() => {
    if (!previousPathname()?.startsWith("/anime/")) return;
    // Back: the Detail's cover flies into this card.
    if (leaving?.name === name) {
      const cover = link.current?.closest("article")?.querySelector<HTMLElement>("[data-cover]");
      if (cover) flyBack(leaving, cover);
      leaving = null;
      if (opened?.name === name) opened = null;
      link.current?.focus();
      return () => {
        // A card leaving the page takes its flight with it. Checked after the commit: Strict Mode runs this cleanup
        // with the card still on the page.
        queueMicrotask(() => {
          if (cover && !cover.isConnected && flight?.card === cover) stopFlight();
        });
      };
    }
    // A link back here, with the View Transition (the logo, a header link): the card the Detail was opened from.
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
  const name = opened?.id === id ? opened.name : coverName(id);

  useLayoutEffect(() => {
    detailName = name;
    return () => {
      detailName = null;
    };
  }, [name]);

  return <NamedCover name={name}>{children}</NamedCover>;
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
