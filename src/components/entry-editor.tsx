"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { type EditTarget, useListEditing } from "@/components/list-editing";
import type { MediaListStatus } from "@/gql/graphql";
import { animeTitle, listStatusLabel } from "@/lib/anime-labels";
import { MAX_NOTES_LENGTH } from "@/lib/entry-input";
import type { EntryChange } from "@/lib/list-rules";

const statuses = Object.keys(listStatusLabel) as MediaListStatus[];
const field = "min-h-11 w-full rounded-control border border-border-strong bg-raised px-3 text-ink";

/**
 * A button that opens the entry's editor: status, episodes seen, score, notes, and removal after a
 * confirmation (SPEC, "La mia lista"). A native modal <dialog> keeps focus inside and closes with Esc.
 */
export function EditEntryButton({
  target,
  label,
  className = "button",
}: {
  target: EditTarget;
  label: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const title = animeTitle(target.media.title);

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-label={`${label.replace(/^✓ /, "")}: ${title}`}
        onClick={() => {
          setOpen(true);
          // Open after React has rendered the form inside.
          requestAnimationFrame(() => dialog.current?.showModal());
        }}
        className={className}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${target.media.id}-editor-title`}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
        className="entry-editor"
      >
        {open && <EditorForm target={target} title={title} close={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

function EditorForm({ target, title, close }: { target: EditTarget; title: string; close: () => void }) {
  const { save, remove } = useListEditing();
  const { entry, media } = target;
  const ids = useId();
  const [status, setStatus] = useState<MediaListStatus>(entry?.status ?? "PLANNING");
  const [progress, setProgress] = useState(String(entry?.progress ?? 0));
  const [score, setScore] = useState(String(entry?.score ?? 0));
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [confirming, setConfirming] = useState(false);
  // The rule applies only when the status becomes Completato (SPEC, "Regole automatiche").
  const completing = status === "COMPLETED" && entry?.status !== "COMPLETED" && Boolean(media.episodes);
  const confirmText = useRef<HTMLParagraphElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    // Only what changed goes to AniList, so a finer score set elsewhere is not rounded away (ADR-0004).
    const change: EntryChange = {};
    if (!entry || status !== entry.status) change.status = status;
    if (Number(progress) !== (entry?.progress ?? 0)) change.progress = Number(progress);
    if (Number(score) !== (entry?.score ?? 0)) change.score = Number(score);
    if (notes !== (entry?.notes ?? "")) change.notes = notes;
    close();
    if (Object.keys(change).length > 0) void save(target, change);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 id={`${media.id}-editor-title`} className="text-h3">
        {entry ? `Modifica «${title}»` : `Aggiungi «${title}» alla lista`}
      </h2>

      <label className="flex flex-col gap-1 text-small font-medium">
        Stato
        <select value={status} onChange={(event) => setStatus(event.target.value as MediaListStatus)} className={field}>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {listStatusLabel[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-small font-medium">
        {media.episodes ? `Episodi visti (su ${media.episodes})` : "Episodi visti"}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={media.episodes ?? undefined}
          required
          value={progress}
          onChange={(event) => setProgress(event.target.value)}
          className={`${field} tabular-nums`}
          aria-describedby={completing ? `${ids}-completed` : undefined}
        />
        {completing ? (
          <span id={`${ids}-completed`} className="font-normal text-ink-muted">
            Con «Completato» diventano {media.episodes}.
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-small font-medium">
        Voto
        <select value={score} onChange={(event) => setScore(event.target.value)} className={field}>
          <option value="0">Nessun voto</option>
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-small font-medium">
        Note
        <textarea
          value={notes}
          maxLength={MAX_NOTES_LENGTH}
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
          className={`${field} py-2`}
        />
      </label>

      {confirming && entry ? (
        <div className="flex flex-col gap-3 rounded-panel border border-danger px-4 py-3">
          <p ref={confirmText} tabIndex={-1}>
            Eliminare «{title}» dalla lista su AniList? Non si può annullare.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                close();
                void remove(entry);
              }}
              className="button border-danger text-danger"
            >
              Elimina
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="button">
              Non eliminare
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="button button-primary">
            Salva
          </button>
          <button type="button" onClick={close} className="button">
            Annulla
          </button>
          {entry && (
            <button
              type="button"
              onClick={() => {
                setConfirming(true);
                requestAnimationFrame(() => confirmText.current?.focus());
              }}
              className="button ml-auto text-danger"
            >
              Elimina dalla lista
            </button>
          )}
        </div>
      )}
    </form>
  );
}
