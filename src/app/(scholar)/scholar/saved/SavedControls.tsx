"use client";

/**
 * Caelex Scholar — client wrappers for the Merkliste (saved) surface.
 *
 * The data + revalidation live in the IDOR-safe server actions
 * (`@/lib/scholar/saved-items-actions`). These client components are the
 * thin interactive layer:
 *   • RemoveBookmarkButton  — icon-only "remove from Merkliste" control.
 *   • RemoveFromListButton  — icon-only "remove from this list" control.
 *   • CreateListForm        — inline "new reading list" form.
 *   • ListManageControls    — small rename / delete controls for one list.
 *
 * The server actions take plain string args (NOT FormData) and return
 * `{ ok: boolean }`, so each wrapper calls them inside a transition and lets
 * the action's own revalidatePath() refresh the server-rendered list. We keep
 * a local `pending`/`done` state purely for the button affordance.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Type sizes come from the shared semantic tokens — never ad-hoc text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - Every interactive element: focus-visible:ring-2 ring-gray-900
 *     ring-offset-2 ring-offset-[#F7F8FA].
 *   - Icon-only buttons carry an sr-only label (and title for pointer users).
 *   - Targets ≥24px (h-9 w-9 / py-2). Motion gated behind motion-safe:.
 *   - Errors announced via role="alert"; pending state disables the control.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import {
  removeBookmarkAction,
  removeFromListAction,
  createListAction,
  renameListAction,
  deleteListAction,
} from "@/lib/scholar/saved-items-actions";
import type { ScholarItemType } from "@/lib/scholar/saved-items.server";
import { SCHOLAR_TYPE } from "../_components/scholar-type";

// ─── Shared class fragments (monochrome) ──────────────────────────────────────

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]";

// Icon-only ghost button — h-9 w-9 = 36px target (> 24px min).
const ICON_BTN =
  "inline-flex items-center justify-center h-9 w-9 flex-shrink-0 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 motion-safe:transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
  FOCUS_RING;

const INPUT_CLS =
  "w-full text-body-lg text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 placeholder:text-gray-500 hover:border-gray-400 motion-safe:transition-colors " +
  FOCUS_RING;

const PRIMARY_BTN =
  "inline-flex items-center gap-1.5 text-small font-medium text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 motion-safe:transition-colors " +
  FOCUS_RING;

const GHOST_BTN =
  "inline-flex items-center gap-1.5 text-small font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 motion-safe:transition-colors " +
  FOCUS_RING;

// ─── Remove a bookmark from the Merkliste ─────────────────────────────────────

export function RemoveBookmarkButton({
  itemType,
  itemId,
  title,
}: {
  itemType: ScholarItemType;
  itemId: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function onClick() {
    setError(false);
    startTransition(async () => {
      const res = await removeBookmarkAction(itemType, itemId);
      if (!res.ok) setError(true);
      // On success the action revalidates /scholar/saved → the row disappears.
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-disabled={pending}
        title="Aus Merkliste entfernen"
        className={ICON_BTN}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
        <span className="sr-only">„{title}“ aus Merkliste entfernen</span>
      </button>
      {error && (
        <span role="alert" className="sr-only">
          Entfernen fehlgeschlagen. Bitte erneut versuchen.
        </span>
      )}
    </>
  );
}

// ─── Remove an item from one reading list ─────────────────────────────────────

export function RemoveFromListButton({
  listId,
  itemType,
  itemId,
  title,
}: {
  listId: string;
  itemType: ScholarItemType;
  itemId: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function onClick() {
    setError(false);
    startTransition(async () => {
      const res = await removeFromListAction(listId, itemType, itemId);
      if (!res.ok) setError(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-disabled={pending}
        title="Aus Liste entfernen"
        className={ICON_BTN}
      >
        <X className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
        <span className="sr-only">„{title}“ aus dieser Liste entfernen</span>
      </button>
      {error && (
        <span role="alert" className="sr-only">
          Entfernen fehlgeschlagen. Bitte erneut versuchen.
        </span>
      )}
    </>
  );
}

// ─── Create a new reading list (inline form) ──────────────────────────────────

export function CreateListForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte gib einen Namen für die Liste ein.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createListAction(
        trimmed,
        description.trim() || undefined,
      );
      if (res.ok) {
        setName("");
        setDescription("");
      } else {
        setError("Liste konnte nicht erstellt werden. Bitte erneut versuchen.");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Neue Leseliste erstellen"
      className="space-y-3"
    >
      <div>
        <label htmlFor="new-list-name" className={SCHOLAR_TYPE.metaLabel}>
          Name der Liste
        </label>
        <input
          id="new-list-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          placeholder="z. B. Seminar Weltraumrecht — Woche 3"
          className={`mt-1 ${INPUT_CLS}`}
          aria-describedby={error ? "new-list-error" : undefined}
        />
      </div>
      <div>
        <label htmlFor="new-list-desc" className={SCHOLAR_TYPE.metaLabel}>
          Beschreibung{" "}
          <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="new-list-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          placeholder="Kurzer Hinweis für Studierende oder das Team"
          className={`mt-1 ${INPUT_CLS}`}
        />
      </div>
      {error && (
        <p
          id="new-list-error"
          role="alert"
          className="text-small font-medium text-gray-900"
        >
          {error}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className={PRIMARY_BTN}
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden={true} />
          {pending ? "Wird erstellt …" : "Liste erstellen"}
        </button>
      </div>
    </form>
  );
}

// ─── Rename / delete one reading list ─────────────────────────────────────────

export function ListManageControls({
  listId,
  currentName,
}: {
  listId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Der Name darf nicht leer sein.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await renameListAction(listId, trimmed);
      if (res.ok) {
        setEditing(false);
      } else {
        setError("Umbenennen fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  function onDelete() {
    // Native confirm keeps the destructive control honest without adding a
    // modal dependency; it is keyboard-accessible and screen-reader announced.
    const ok = window.confirm(
      `Leseliste „${currentName}“ wirklich löschen? Die enthaltenen Verweise gehen verloren (die Quellen selbst bleiben erhalten).`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteListAction(listId);
      if (res.ok) {
        router.push("/scholar/saved");
      } else {
        setError("Löschen fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={onRename}
        aria-label="Leseliste umbenennen"
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <label htmlFor="rename-list" className="sr-only">
          Neuer Name der Liste
        </label>
        <input
          id="rename-list"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          autoFocus
          className={`sm:w-80 ${INPUT_CLS}`}
          aria-describedby={error ? "rename-list-error" : undefined}
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            className={PRIMARY_BTN}
          >
            <Check className="h-4 w-4" strokeWidth={2} aria-hidden={true} />
            {pending ? "Speichert …" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(currentName);
              setError(null);
            }}
            disabled={pending}
            className={GHOST_BTN}
          >
            Abbrechen
          </button>
        </div>
        {error && (
          <p
            id="rename-list-error"
            role="alert"
            className="text-small font-medium text-gray-900"
          >
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={GHOST_BTN}
      >
        <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
        Umbenennen
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-disabled={pending}
        className={GHOST_BTN}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
        {pending ? "Löscht …" : "Löschen"}
      </button>
      {error && (
        <p role="alert" className="text-small font-medium text-gray-900">
          {error}
        </p>
      )}
    </div>
  );
}
