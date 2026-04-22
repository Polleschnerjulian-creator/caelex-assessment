"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, StickyNote, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Types ──────────────────────────────────────────────────────────

interface Annotation {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SourceNotesProps {
  sourceId: string;
}

// ─── localStorage migration helpers ─────────────────────────────────

const LEGACY_STORAGE_KEY = "atlas-notes";

interface LegacyNote {
  id: string;
  text: string;
  createdAt: string;
}

function getLegacyNotes(sourceId: string): LegacyNote[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw) as Record<string, LegacyNote[]>;
    const notes = store[sourceId];
    return notes && notes.length > 0 ? notes : null;
  } catch {
    return null;
  }
}

function clearLegacyNotes(sourceId: string): void {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const store = JSON.parse(raw) as Record<string, LegacyNote[]>;
    delete store[sourceId];
    // If store is now empty, remove the key entirely
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Non-critical — ignore
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function SourceNotes({ sourceId }: SourceNotesProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasContent, setHasContent] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the text that the server last confirmed, to avoid spurious saves
  const serverTextRef = useRef("");
  // Track whether migration has been attempted for this sourceId
  const migrationDoneRef = useRef(false);

  // ─── Fetch annotation from API ──────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    migrationDoneRef.current = false;

    async function load() {
      setIsLoading(true);
      setSaveStatus("idle");

      try {
        const res = await fetch(
          `/api/atlas/annotations?sourceId=${encodeURIComponent(sourceId)}`,
        );

        if (!res.ok) throw new Error("fetch failed");

        const data = (await res.json()) as { annotation: Annotation | null };

        if (cancelled) return;

        if (data.annotation) {
          // Server has an annotation — use it
          setText(data.annotation.text);
          serverTextRef.current = data.annotation.text;
          setHasContent(data.annotation.text.length > 0);
        } else {
          // No server annotation — attempt one-time localStorage migration
          const legacyNotes = getLegacyNotes(sourceId);
          if (legacyNotes && !migrationDoneRef.current) {
            migrationDoneRef.current = true;
            const combined = legacyNotes.map((n) => n.text).join("\n\n");
            setText(combined);
            setHasContent(true);

            // POST the migrated text to the API
            try {
              const postRes = await fetch("/api/atlas/annotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sourceId, text: combined }),
              });
              if (postRes.ok) {
                serverTextRef.current = combined;
                clearLegacyNotes(sourceId);
                if (!cancelled) setSaveStatus("saved");
              }
            } catch {
              // Migration POST failed — text is still in the textarea and
              // localStorage is preserved; user can trigger save by editing
            }
          } else {
            setText("");
            serverTextRef.current = "";
            setHasContent(false);
          }
        }
      } catch {
        if (!cancelled) {
          // On fetch error, try to show legacy notes as fallback (read-only feel)
          const legacyNotes = getLegacyNotes(sourceId);
          if (legacyNotes) {
            const combined = legacyNotes.map((n) => n.text).join("\n\n");
            setText(combined);
            setHasContent(true);
          } else {
            setText("");
            setHasContent(false);
          }
          setSaveStatus("error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sourceId]);

  // ─── Debounced auto-save ────────────────────────────────────────

  const saveToApi = useCallback(
    async (value: string) => {
      // Don't save if text hasn't actually changed from what server has
      if (value === serverTextRef.current) {
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("saving");

      try {
        const res = await fetch("/api/atlas/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, text: value }),
        });

        if (!res.ok) throw new Error("save failed");

        serverTextRef.current = value;
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [sourceId],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setText(value);
      setHasContent(value.trim().length > 0);
      setSaveStatus("idle");

      // Clear any existing debounce timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Set new debounce timer (800ms)
      debounceRef.current = setTimeout(() => {
        saveToApi(value);
      }, 800);
    },
    [saveToApi],
  );

  // ─── Delete annotation ──────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");

    try {
      const res = await fetch(
        `/api/atlas/annotations?sourceId=${encodeURIComponent(sourceId)}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("delete failed");

      setText("");
      serverTextRef.current = "";
      setHasContent(false);
      setSaveStatus("idle");
      textareaRef.current?.focus();
    } catch {
      setSaveStatus("error");
    }
  }, [sourceId]);

  // ─── Save status label ──────────────────────────────────────────

  function renderStatus() {
    if (isLoading) return null;

    switch (saveStatus) {
      case "saving":
        return (
          <span className="text-[10px] text-amber-500/70 animate-pulse">
            {t("atlas.annotations_saving")}
          </span>
        );
      case "saved":
        return (
          <span className="text-[10px] text-emerald-500/80">
            {t("atlas.annotations_saved")}
          </span>
        );
      case "error":
        return (
          <span className="text-[10px] text-red-400">
            {t("atlas.annotations_error")}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <section className="mt-8">
      {/* ─── Collapsible header ─── */}
      <button
        onClick={() => {
          setIsExpanded((prev) => !prev);
          if (!isExpanded) {
            setTimeout(() => textareaRef.current?.focus(), 100);
          }
        }}
        className="flex items-center gap-2 group w-full text-left"
      >
        <StickyNote size={15} className="text-amber-500/70" strokeWidth={1.5} />
        <h2 className="text-[11px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.15em] uppercase group-hover:text-[var(--atlas-text-secondary)] transition-colors">
          {t("atlas.annotations")}
        </h2>

        {hasContent && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
        )}

        <span className="text-[var(--atlas-text-faint)] group-hover:text-[var(--atlas-text-faint)] transition-colors ml-auto">
          {isExpanded ? (
            <ChevronDown size={14} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={14} strokeWidth={1.5} />
          )}
        </span>
      </button>

      {/* ─── Expanded content ─── */}
      {isExpanded && (
        <div className="mt-3 max-w-3xl rounded-lg border border-amber-100 bg-amber-50/50 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                placeholder={t("atlas.annotations_placeholder")}
                rows={4}
                className="w-full resize-none rounded border border-amber-200/60 bg-white/80 px-3 py-2 text-[13px] text-[var(--atlas-text-secondary)] placeholder:text-[var(--atlas-text-faint)]/60 focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200 transition-colors"
              />

              {/* ─── Footer: status + delete ─── */}
              <div className="flex items-center justify-between mt-2">
                <div className="min-h-[16px]">{renderStatus()}</div>

                {hasContent && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[var(--atlas-text-faint)] hover:text-red-400 hover:bg-red-50 transition-all duration-150"
                    title={t("atlas.annotations_delete")}
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                    <span className="uppercase tracking-wide font-medium">
                      {t("atlas.annotations_delete")}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
