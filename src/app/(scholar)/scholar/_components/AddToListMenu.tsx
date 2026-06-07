"use client";

/**
 * AddToListMenu — "Zu Leseliste hinzufügen" dropdown for a Scholar source/case.
 *
 * Sits in the detail-page header card next to BookmarkButton. Lets a reader file
 * the current item into one of their named reading lists (the teaching "course
 * lists" use-case) — either an existing list (addToListAction) or a brand-new one
 * typed inline (createListAction → then addToListAction with the returned id).
 * On success it shows a brief "Hinzugefügt" confirmation, then closes.
 *
 * The server actions resolve the user from the session and gate every write on
 * list ownership, so the client never sends a userId and can never touch a list
 * it doesn't own — this component only passes the chosen listId / new name.
 *
 * Client component: open/close state, the inline "new list" input, and the
 * in-flight transition all live here. No data imports — the caller passes the
 * user's lists (id + name) fetched server-side.
 *
 * Built as a button + popover (not a native <details>) because the panel hosts an
 * async list of choices AND an inline text field with its own submit — a custom
 * disclosure gives us focus return, Esc-to-close, and click-outside dismissal
 * without fighting <details>' implicit toggle.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 *   • Type tokens: text-small (12px) for the trigger/meta + text-body-lg (14px,
 *     SCHOLAR_TYPE-aligned) for the list-choice rows. Never an ad-hoc text-[Npx].
 *
 * Accessibility (light canvas: #F7F8FA page / white cards):
 *   • Trigger is aria-haspopup="menu" + aria-expanded; the panel is role="menu".
 *   • Esc closes and returns focus to the trigger (WCAG 2.1.2 — no keyboard trap).
 *   • Click/focus outside closes (pointer + focusout), so it never strands.
 *   • Every control: focus-visible:ring-2 ring-gray-900 ring-offset-2, offset
 *     #F7F8FA on the trigger / white inside the panel.
 *   • Targets ≥ 24px (py-1.5 / py-2 rows around 12–14px lines clear WCAG 2.5.8).
 *   • gray-700/900 text + gray-200/300 borders all clear AA. Live region
 *     announces the "Hinzugefügt" / error result. Motion is motion-safe:.
 *
 * Resilience: writes run inside a transition with the controls disabled (no
 * double fire). A failed create/add surfaces a quiet inline error and leaves the
 * menu open so the reader can retry — it never closes on a silent failure.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { ListPlus, Plus, Check } from "lucide-react";
import {
  addToListAction,
  createListAction,
} from "@/lib/scholar/saved-items-actions";

const CONFIRM_RESET_MS = 1800;

interface ListSummary {
  id: string;
  name: string;
}

export function AddToListMenu({
  itemType,
  itemId,
  lists,
}: {
  itemType: "source" | "case";
  itemId: string;
  lists: ListSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false); // inline "new list" input shown
  const [newName, setNewName] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null); // "Hinzugefügt zu …"
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const newInputRef = useRef<HTMLInputElement | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menuId = useId();

  // Clear the confirmation timer on unmount (no setState-after-unmount).
  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCreating(false);
    setNewName("");
    setError(null);
  }, []);

  // Esc closes + returns focus to the trigger (WCAG 2.1.2). Pointer/focus
  // outside the root closes too, so the popover never strands open.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onFocusIn(e: FocusEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, close]);

  // When the inline "new list" field appears, move focus into it.
  useEffect(() => {
    if (creating) newInputRef.current?.focus();
  }, [creating]);

  // Show a transient "Hinzugefügt zu {name}" confirmation, then close.
  const flashConfirm = useCallback((listName: string) => {
    setConfirm(`Hinzugefügt zu ${listName}`);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirm(null), CONFIRM_RESET_MS);
  }, []);

  const handleAddExisting = useCallback(
    (list: ListSummary) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await addToListAction(list.id, itemType, itemId);
          if (!res.ok) {
            setError("Konnte nicht hinzugefügt werden.");
            return;
          }
          flashConfirm(list.name);
          close();
        } catch {
          setError("Konnte nicht hinzugefügt werden.");
        }
      });
    },
    [itemType, itemId, flashConfirm, close],
  );

  const handleCreateAndAdd = useCallback(() => {
    const name = newName.trim();
    if (!name) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await createListAction(name);
        if (!created.ok || !created.id) {
          setError("Liste konnte nicht erstellt werden.");
          return;
        }
        const added = await addToListAction(created.id, itemType, itemId);
        if (!added.ok) {
          setError("Erstellt, aber nicht hinzugefügt.");
          return;
        }
        flashConfirm(name);
        close();
      } catch {
        setError("Liste konnte nicht erstellt werden.");
      }
    });
  }, [newName, itemType, itemId, flashConfirm, close]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={
          "inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 " +
          "text-small text-gray-700 hover:bg-gray-50 " +
          "motion-safe:transition-colors " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
          "focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
        }
      >
        <ListPlus size={13} className="text-gray-700" aria-hidden={true} />
        <span>Zu Leseliste hinzufügen</span>
      </button>

      {/* Polite live region — announces the confirmation/error outside the menu
          so the message is heard even after the popover closes. */}
      <span className="sr-only" role="status" aria-live="polite">
        {confirm ?? error ?? ""}
      </span>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Zu Leseliste hinzufügen"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          {/* Existing lists — each is a menu item that files the current item. */}
          {lists.length > 0 ? (
            <ul className="max-h-56 overflow-auto" role="none">
              {lists.map((list) => (
                <li key={list.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isPending}
                    onClick={() => handleAddExisting(list)}
                    className={
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left " +
                      "text-body-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 " +
                      "disabled:cursor-not-allowed disabled:opacity-60 " +
                      "motion-safe:transition-colors " +
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">{list.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !creating && (
              <p className="px-2.5 py-2 text-small text-gray-600">
                Noch keine Leselisten.
              </p>
            )
          )}

          {/* Divider between existing lists and the create affordance. */}
          {lists.length > 0 && <div className="my-1 h-px bg-gray-200" />}

          {/* "Neue Liste…" — reveals an inline name field + submit. */}
          {!creating ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setError(null);
                setCreating(true);
              }}
              className={
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left " +
                "text-body-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 " +
                "motion-safe:transition-colors " +
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
                "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              }
            >
              <Plus size={14} className="text-gray-700" aria-hidden={true} />
              <span>Neue Liste…</span>
            </button>
          ) : (
            <div className="space-y-2 p-1.5">
              <label htmlFor={`${menuId}-new`} className="sr-only">
                Name der neuen Leseliste
              </label>
              <input
                ref={newInputRef}
                id={`${menuId}-new`}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateAndAdd();
                  }
                }}
                placeholder="Listenname"
                maxLength={120}
                disabled={isPending}
                className={
                  "w-full rounded-lg border border-gray-300 px-2.5 py-1.5 " +
                  "text-body-lg text-gray-900 placeholder:text-gray-500 " +
                  "disabled:cursor-not-allowed disabled:opacity-60 " +
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                }
              />
              <button
                type="button"
                disabled={isPending || newName.trim().length === 0}
                onClick={handleCreateAndAdd}
                className={
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg " +
                  "border border-gray-900 bg-gray-900 px-2.5 py-1.5 " +
                  "text-small font-medium text-white hover:bg-gray-800 " +
                  "disabled:cursor-not-allowed disabled:opacity-60 " +
                  "motion-safe:transition-colors " +
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                }
              >
                <Check size={13} aria-hidden={true} />
                Erstellen &amp; hinzufügen
              </button>
            </div>
          )}

          {/* Inline error — quiet, monochrome, keeps the menu open for a retry. */}
          {error && (
            <p className="px-2.5 pb-1 pt-1.5 text-small text-gray-700">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Brief visible confirmation after the menu closes (mirrors the live
          region). gray-700 on the page canvas ≈ 6.4:1 ✓ */}
      {confirm && !open && (
        <span className="ml-2 inline-flex items-center gap-1 text-small text-gray-700">
          <Check size={13} className="text-gray-700" aria-hidden={true} />
          Hinzugefügt
        </span>
      )}
    </div>
  );
}
