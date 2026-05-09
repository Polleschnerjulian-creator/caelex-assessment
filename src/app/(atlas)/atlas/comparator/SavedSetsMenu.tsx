"use client";

/**
 * Atlas Comparator — Saved Sets menu (D5).
 *
 * Per-user named comparison sets. Today via localStorage only — DB
 * persistence is a future stage-2 sprint that needs an
 * `AtlasSavedComparison` Prisma model + API routes. localStorage covers
 * 95% of the use case (lawyers work the same mandate from the same
 * browser/device for the duration of the matter) and ships in a few
 * hours instead of a few days.
 *
 * Each saved set captures the comparator's full URL state: jurisdictions,
 * dimension, target date (for time-travel), differences-only toggle.
 * Click a saved set → router-navigate to the comparator with that
 * query-string. Replaces the user's current state.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Plus, X } from "lucide-react";

const STORAGE_KEY = "atlas-comparator-saved-sets";
/* Cap to keep localStorage sane — lawyers who hit this almost
   certainly want a real DB layer (stage-2). */
const MAX_SAVED = 20;

export interface SavedSet {
  /** Local identifier — random, not user-controlled. */
  id: string;
  /** Lawyer-provided title — "Series-A panel", "EU-only NewSpace". */
  title: string;
  /** The query-string portion of the comparator URL (no leading ?). */
  qs: string;
  /** Unix-ms timestamp of when it was saved. */
  savedAt: number;
}

function loadSets(): SavedSet[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /* Defensive shape-check — if the schema drifted between sessions,
       just throw out the bad entries rather than crashing the menu. */
    return parsed.filter(
      (e): e is SavedSet =>
        typeof e === "object" &&
        e !== null &&
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        typeof e.qs === "string" &&
        typeof e.savedAt === "number",
    );
  } catch {
    return [];
  }
}

function persistSets(sets: SavedSet[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    /* Quota exceeded / private browsing — silent fail. The user's
       current-session edits don't crash; they just don't persist. */
  }
}

interface SavedSetsMenuProps {
  /** Current comparator query-string (no leading ?). Used by the
   *  "Save current view" action. */
  currentQs: string;
  language: "de" | "en" | "fr" | "es";
}

export function SavedSetsMenu({ currentQs, language }: SavedSetsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isDe = language === "de";

  /* Hydrate from localStorage on mount + click-outside dismiss. */
  useEffect(() => {
    setSets(loadSets());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSavePromptOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (savePromptOpen) {
      const id = window.setTimeout(() => titleInputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [savePromptOpen]);

  function handleSave() {
    const title = titleDraft.trim();
    if (!title) return;
    /* Newest-first ordering, capped. We INSERT at the front and trim
       the tail so the user's most-recent saves are always visible. */
    const next: SavedSet[] = [
      {
        id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        qs: currentQs,
        savedAt: Date.now(),
      },
      ...sets,
    ].slice(0, MAX_SAVED);
    setSets(next);
    persistSets(next);
    setTitleDraft("");
    setSavePromptOpen(false);
  }

  function handleDelete(id: string) {
    const next = sets.filter((s) => s.id !== id);
    setSets(next);
    persistSets(next);
  }

  function handleApply(set: SavedSet) {
    setOpen(false);
    router.replace(`/atlas/comparator${set.qs ? `?${set.qs}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={isDe ? "Gespeicherte Vergleiche" : "Saved comparisons"}
        title={isDe ? "Gespeicherte Vergleiche" : "Saved comparisons"}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)] transition-colors duration-150"
      >
        <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>
          {isDe ? "Sets" : "Sets"}
          {sets.length > 0 && (
            <span className="ml-1 text-[var(--atlas-text-faint)]">
              ({sets.length})
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-40 w-[300px] rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-xl overflow-hidden">
          {/* Save current view */}
          {savePromptOpen ? (
            <div className="p-3 border-b border-[var(--atlas-border-subtle)]">
              <input
                ref={titleInputRef}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setSavePromptOpen(false);
                    setTitleDraft("");
                  }
                }}
                placeholder={
                  isDe
                    ? 'Name (z.B. „Series-A Panel")'
                    : 'Name (e.g. "Series-A panel")'
                }
                className="w-full bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] outline-none focus:border-[var(--atlas-border-strong)]"
              />
              <div className="mt-2 flex items-center justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setSavePromptOpen(false);
                    setTitleDraft("");
                  }}
                  className="text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
                >
                  {isDe ? "Abbrechen" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!titleDraft.trim()}
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDe ? "Speichern" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSavePromptOpen(true)}
              disabled={sets.length >= MAX_SAVED}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium text-[var(--atlas-text-secondary)] hover:bg-[var(--atlas-bg-inset)] disabled:opacity-40 disabled:cursor-not-allowed border-b border-[var(--atlas-border-subtle)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              {isDe ? "Aktuelle Ansicht speichern" : "Save current view"}
              {sets.length >= MAX_SAVED && (
                <span className="ml-auto text-[10px] text-[var(--atlas-text-faint)]">
                  {MAX_SAVED} max
                </span>
              )}
            </button>
          )}
          {/* List */}
          <div className="max-h-[280px] overflow-y-auto">
            {sets.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-[var(--atlas-text-muted)]">
                {isDe
                  ? 'Noch keine gespeicherten Vergleiche. Speichern Sie über "Aktuelle Ansicht speichern".'
                  : 'No saved comparisons yet. Use "Save current view" to start.'}
              </div>
            ) : (
              sets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--atlas-bg-inset)] transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => handleApply(set)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[12px] font-medium text-[var(--atlas-text-primary)] truncate">
                      {set.title}
                    </div>
                    <div className="text-[10px] text-[var(--atlas-text-faint)] font-mono truncate">
                      {set.qs || "(default view)"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(set.id)}
                    aria-label={
                      isDe ? `${set.title} löschen` : `Delete ${set.title}`
                    }
                    title={isDe ? "Löschen" : "Delete"}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[var(--atlas-text-faint)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <X className="h-3 w-3" strokeWidth={1.8} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
