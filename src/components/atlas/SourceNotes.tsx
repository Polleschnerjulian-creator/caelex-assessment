"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, StickyNote, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Types ──────────────────────────────────────────────────────────

interface Note {
  id: string;
  text: string;
  createdAt: string;
}

interface NotesStore {
  [sourceId: string]: Note[];
}

interface SourceNotesProps {
  sourceId: string;
}

// ─── localStorage helpers ───────────────────────────────────────────

const STORAGE_KEY = "atlas-notes";

function loadNotes(): NotesStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as NotesStore;
  } catch {}
  return {};
}

function saveNotes(store: NotesStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

// ─── Timestamp formatter ────────────────────────────────────────────

function formatTimestamp(iso: string, lang: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function SourceNotes({ sourceId }: SourceNotesProps) {
  const { language, t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newText, setNewText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const store = loadNotes();
    setNotes(store[sourceId] ?? []);
  }, [sourceId]);

  // Persist helper
  const persist = useCallback(
    (updated: Note[]) => {
      const store = loadNotes();
      if (updated.length === 0) {
        delete store[sourceId];
      } else {
        store[sourceId] = updated;
      }
      saveNotes(store);
    },
    [sourceId],
  );

  // Add note
  const handleAdd = useCallback(() => {
    const trimmed = newText.trim();
    if (!trimmed) return;

    const note: Note = {
      id: crypto.randomUUID(),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    const updated = [note, ...notes];
    setNotes(updated);
    persist(updated);
    setNewText("");
    textareaRef.current?.focus();
  }, [newText, notes, persist]);

  // Delete note with fade-out
  const handleDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      // Allow fade-out animation to complete
      setTimeout(() => {
        const updated = notes.filter((n) => n.id !== id);
        setNotes(updated);
        persist(updated);
        setDeletingId(null);
      }, 200);
    },
    [notes, persist],
  );

  // Handle keyboard shortcut in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const noteCount = notes.length;

  return (
    <section className="mt-8">
      {/* ─── Collapsible header ─── */}
      <button
        onClick={() => {
          setIsExpanded((prev) => !prev);
          if (!isExpanded) {
            // Focus textarea after expansion
            setTimeout(() => textareaRef.current?.focus(), 100);
          }
        }}
        className="flex items-center gap-2 group w-full text-left"
      >
        <StickyNote size={15} className="text-amber-500/70" strokeWidth={1.5} />
        <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase group-hover:text-gray-600 transition-colors">
          {t("atlas.annotations")}
        </h2>

        {noteCount > 0 && (
          <span className="text-[10px] font-medium text-amber-600/80 bg-amber-50 border border-amber-200/60 rounded-full px-1.5 py-px min-w-[20px] text-center">
            {noteCount}
          </span>
        )}

        <span className="text-gray-300 group-hover:text-gray-400 transition-colors ml-auto">
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
          {/* ─── Add note input ─── */}
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("atlas.annotations_placeholder")}
              rows={2}
              className="flex-1 resize-none rounded border border-amber-200/60 bg-white/80 px-3 py-2 text-[13px] text-gray-700 placeholder:text-gray-400/60 focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200 transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="self-end rounded bg-gray-800 px-3 py-1.5 text-[11px] font-medium text-white tracking-wide uppercase transition-all hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              {t("atlas.annotations_add")}
            </button>
          </div>

          {/* ─── Notes list ─── */}
          {noteCount === 0 ? (
            <p className="mt-4 text-[12px] text-gray-400 leading-relaxed text-center py-2">
              {t("atlas.annotations_empty")}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`group/note flex items-start gap-3 rounded-md bg-white/60 border border-amber-100/80 px-3 py-2.5 transition-all duration-200 ${
                    deletingId === note.id
                      ? "opacity-0 scale-95"
                      : "opacity-100 scale-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-700 leading-[1.65] whitespace-pre-wrap break-words">
                      {note.text}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatTimestamp(note.createdAt, language)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex-shrink-0 mt-0.5 rounded p-1 text-gray-300 opacity-0 group-hover/note:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all duration-150"
                    title={t("atlas.annotations_delete")}
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
