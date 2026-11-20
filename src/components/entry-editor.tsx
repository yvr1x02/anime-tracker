"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { type EditTarget, useListEditing } from "@/components/list-editing";
import type { MediaListStatus } from "@/gql/graphql";
import { animeTitle, listStatusLabel } from "@/lib/anime-labels";
import { MAX_NOTES_LENGTH } from "@/lib/entry-input";
import type { EntryChange } from "@/lib/list-rules";
import { formatScore, parseScore } from "@/lib/score";

const statuses = Object.keys(listStatusLabel) as MediaListStatus[];
const field = "min-h-11 w-full rounded-control border border-border-strong bg-raised px-3 text-ink";

/**
 * A button that opens the entry's editor: status, episodes seen, score, notes, and removal after a
 * confirmation (SPEC, "La mia lista"). A native modal <dialog> keeps focus inside and closes with Esc.
 */
/** What the editor did: the change sent, or the removal. Null when closed without changes. */
export type EditOutcome = { change: EntryChange } | { deleted: true } | null;

export function EditEntryButton({
  target,
  label,
  className = "button",
  onDone,
}: {
  target: EditTarget;
  label: string;
  className?: string;
  /**
   * Told what the editor did, before the change is sent. It may return where focus goes once the dialog has
   * closed (focus can't leave a modal dialog before), instead of back to this button: for a button about to
   * disappear with its card.
   */
  onDone?: (outcome: EditOutcome) => (() => void) | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const afterClose = useRef<(() => void) | undefined>(undefined);
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
          const moveFocus = afterClose.current;
          afterClose.current = undefined;
          if (moveFocus) moveFocus();
          else opener.current?.focus();
        }}
        className="entry-editor"
      >
        {open && (
          <EditorForm
            target={target}
            title={title}
            close={(outcome) => {
              afterClose.current = onDone?.(outcome);
              dialog.current?.close();
            }}
          />
        )}
      </dialog>
    </>
  );
}

function EditorForm({
  target,
  title,
  close,
}: {
  target: EditTarget;
  title: string;
  /** Closes the dialog; the outcome is said first, so focus can be placed after closing. */
  close: (outcome: EditOutcome) => void;
}) {
  const { save, remove } = useListEditing();
  const { entry, media } = target;
  const ids = useId();
  const [status, setStatus] = useState<MediaListStatus>(entry?.status ?? "PLANNING");
  const [progress, setProgress] = useState(String(entry?.progress ?? 0));
  const [score, setScore] = useState(entry?.score ? formatScore(entry.score) : "");
  const [scoreInvalid, setScoreInvalid] = useState(false);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [confirming, setConfirming] = useState(false);
  // The rule applies only when the status becomes Completato (SPEC, "Regole automatiche").
  const completing = status === "COMPLETED" && entry?.status !== "COMPLETED" && Boolean(media.episodes);
  const confirmText = useRef<HTMLParagraphElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedScore = parseScore(score);
    if (parsedScore === undefined) {
      setScoreInvalid(true);
      return;
    }
    // Only what changed goes to AniList, so a score set elsewhere is not rewritten (ADR-0004).
    const change: EntryChange = {};
    if (!entry || status !== entry.status) change.status = status;
    if (Number(progress) !== (entry?.progress ?? 0)) change.progress = Number(progress);
    if (parsedScore !== (entry?.score ?? 0)) change.score = parsedScore;
    if (notes !== (entry?.notes ?? "")) change.notes = notes;
    const changed = Object.keys(change).length > 0;
    close(changed ? { change } : null);
    if (changed) void save(target, change);
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
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={score}
          onChange={(event) => {
            setScore(event.target.value);
            setScoreInvalid(false);
          }}
          aria-invalid={scoreInvalid}
          aria-describedby={`${ids}-score-help`}
          className={`${field} tabular-nums ${scoreInvalid ? "border-danger" : ""}`}
        />
        <span id={`${ids}-score-help`} className={`font-normal ${scoreInvalid ? "text-danger" : "text-ink-muted"}`}>
          {scoreInvalid
            ? "Voto non valido: scrivi un numero da 1,0 a 10,0, con al massimo un decimale, oppure lascia vuoto."
            : "Da 1,0 a 10,0, con un decimale (per esempio 8,5). Vuoto: nessun voto."}
        </span>
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
                close({ deleted: true });
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
          <button type="button" onClick={() => close(null)} className="button">
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
