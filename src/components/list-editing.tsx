"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AniListRateLimitError } from "@/lib/anilist/client";
import { NotLoggedInError } from "@/lib/auth/errors";
import type { ListEntry } from "@/lib/list";
import { type EntryChange, applyListRules, today } from "@/lib/list-rules";
import { MY_LIST_KEY, postListChange } from "@/lib/my-list";

export type EditTarget = { media: ListEntry["media"]; entry: ListEntry | null };

type ListEditing = {
  save: (target: EditTarget, change: EntryChange) => Promise<void>;
  remove: (entry: ListEntry) => Promise<void>;
  addEpisode: (entry: ListEntry) => void;
};

const Context = createContext<ListEditing | null>(null);

// ADR-0004: repeated "+1" clicks become one request after 800ms without clicks.
const BATCH_MS = 800;

const byNewest = (list: ListEntry[]) => [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

function withChange(target: EditTarget, change: EntryChange): ListEntry {
  const base: ListEntry = target.entry ?? {
    // Temporary id until AniList answers with the real one.
    id: -target.media.id,
    status: null,
    progress: 0,
    score: 0,
    notes: null,
    updatedAt: null,
    startedAt: null,
    completedAt: null,
    media: target.media,
  };
  return { ...base, ...change, updatedAt: Math.floor(Date.now() / 1000) };
}

function failureMessage(error: unknown): ReactNode {
  if (error instanceof NotLoggedInError) {
    return (
      <>
        La sessione con AniList è scaduta: la modifica non è stata salvata.{" "}
        <Link href="/accesso?da=%2Flista" className="text-cyan underline underline-offset-2">
          Accedi di nuovo
        </Link>
        .
      </>
    );
  }
  if (error instanceof AniListRateLimitError) {
    const wait = error.retryAfterSeconds;
    return `AniList sta ricevendo troppe richieste: la modifica non è stata salvata. Riprova tra ${
      wait === null ? "qualche minuto" : `${wait} ${wait === 1 ? "secondo" : "secondi"}`
    }.`;
  }
  return "Non riesco a raggiungere AniList: la modifica non è stata salvata e ho ripristinato il valore precedente.";
}

/**
 * Changes to the logged-in user's list (ADR-0004): the list in memory changes at once, then one request
 * goes to our server; if it fails, that entry goes back to how it was and a message says so.
 */
export function ListEditingProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [notice, setNotice] = useState<ReactNode>(null);
  const batches = useRef(new Map<number, { before: ListEntry; progress: number; timer: number }>());

  const setEntry = useCallback(
    (mediaId: number, entry: ListEntry | null) =>
      client.setQueryData<ListEntry[]>(MY_LIST_KEY, (list) =>
        list
          ? byNewest([...list.filter((item) => item.media.id !== mediaId), ...(entry ? [entry] : [])])
          : list,
      ),
    [client],
  );

  const save = useCallback(
    async (target: EditTarget, change: EntryChange) => {
      const ruled = applyListRules(target.entry, change, today(), target.media.episodes);
      setNotice(null);
      setEntry(target.media.id, withChange(target, ruled));
      try {
        const saved = await postListChange<ListEntry>("/api/list/entry", { mediaId: target.media.id, ...ruled });
        setEntry(target.media.id, saved);
      } catch (error) {
        setEntry(target.media.id, target.entry);
        setNotice(failureMessage(error));
      }
    },
    [setEntry],
  );

  const remove = useCallback(
    async (entry: ListEntry) => {
      setNotice(null);
      setEntry(entry.media.id, null);
      try {
        await postListChange("/api/list/entry/delete", { id: entry.id });
      } catch (error) {
        setEntry(entry.media.id, entry);
        setNotice(failureMessage(error));
      }
    },
    [setEntry],
  );

  const flush = useCallback(
    async (mediaId: number, keepalive = false) => {
      const batch = batches.current.get(mediaId);
      if (!batch) return;
      window.clearTimeout(batch.timer);
      batches.current.delete(mediaId);
      try {
        const saved = await postListChange<ListEntry>("/api/list/entry", { mediaId, progress: batch.progress }, keepalive);
        // Clicks made while this was on its way stay on screen; their own request follows.
        const later = batches.current.get(mediaId);
        setEntry(mediaId, later ? { ...saved, progress: later.progress } : saved);
      } catch (error) {
        setEntry(mediaId, batch.before);
        setNotice(failureMessage(error));
      }
    },
    [setEntry],
  );

  const addEpisode = useCallback(
    (entry: ListEntry) => {
      const pending = batches.current.get(entry.media.id);
      const progress = (pending?.progress ?? entry.progress ?? 0) + 1;
      if (entry.media.episodes && progress > entry.media.episodes) return;
      if (pending) window.clearTimeout(pending.timer);
      setNotice(null);
      setEntry(entry.media.id, { ...entry, progress, updatedAt: Math.floor(Date.now() / 1000) });
      batches.current.set(entry.media.id, {
        before: pending?.before ?? entry,
        progress,
        timer: window.setTimeout(() => void flush(entry.media.id), BATCH_MS),
      });
    },
    [flush, setEntry],
  );

  // A change still waiting goes out at once when the page is hidden or closed.
  useEffect(() => {
    const flushAll = () => {
      for (const mediaId of [...batches.current.keys()]) void flush(mediaId, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushAll);
    };
  }, [flush]);

  const value = useMemo(() => ({ save, remove, addEpisode }), [save, remove, addEpisode]);

  return (
    <Context.Provider value={value}>
      {children}
      {/* A failed save is announced at once (role="alert") and stays until closed or the next change. */}
      {notice && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100%-2rem)] items-start gap-4 rounded-panel border border-danger bg-surface px-5 py-4 shadow-lg sm:max-w-xl"
        >
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="button shrink-0">
            Chiudi
          </button>
        </div>
      )}
    </Context.Provider>
  );
}

export function useListEditing(): ListEditing {
  const value = useContext(Context);
  if (!value) throw new Error("useListEditing needs ListEditingProvider");
  return value;
}
