"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * NotesDrawer — list + edit MatterNote entities. The notes API has
 * a versioning chain (PATCH creates a new row + marks old as
 * isLatest=false), but the UI surface here only shows the LATEST
 * versions; older revisions are reachable via a future history view.
 *
 * Note that Claude's `draft_memo_to_note` tool also writes MatterNote
 * rows — those memos appear here automatically since the GET endpoint
 * returns isLatest rows for the matter. The MEMO ArtifactCard in the
 * pinboard remains the surfaced summary; this drawer is the full list.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { X, Plus, Trash2, Loader2, Pencil, Save } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isLatest: boolean;
  parentNoteId: string | null;
}

interface NotesDrawerProps {
  matterId: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function NotesDrawer({
  matterId,
  open,
  onClose,
  onChanged,
}: NotesDrawerProps) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/notes`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Konnte Notizen nicht laden");
      setNotes(json.notes);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const deleteNote = useCallback(
    async (id: string) => {
      if (!confirm("Notiz (mit allen Versionen) löschen?")) return;
      const snapshot = notes;
      setNotes((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
      try {
        const res = await fetch(`/api/network/matter/${matterId}/notes/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        onChanged?.();
      } catch {
        setNotes(snapshot);
      }
    },
    [matterId, notes, onChanged],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-drawer-title"
      className="fixed inset-0 z-[80] flex justify-end"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full sm:w-[560px] h-full bg-[#0a0c10] border-l border-white/[0.08] shadow-2xl flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <div className="text-[9px] tracking-[0.22em] uppercase text-white/40">
              Notizen · Detailansicht
            </div>
            <h2
              id="notes-drawer-title"
              className="text-sm font-medium text-white"
            >
              Alle Notizen
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCreating(true)}
              className="text-white/55 hover:text-white p-1.5 rounded-md hover:bg-white/[0.06] transition"
              title="Neue Notiz"
            >
              <Plus size={13} strokeWidth={1.8} />
            </button>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition"
              aria-label="Schließen"
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error && (
            <div className="text-[11px] text-red-400 mb-3">{error}</div>
          )}

          {creating && (
            <CreateNoteInline
              matterId={matterId}
              onCancel={() => setCreating(false)}
              onCreated={async () => {
                setCreating(false);
                await load();
                onChanged?.();
              }}
            />
          )}

          {!notes && (
            <div className="text-center text-[12px] text-white/35 animate-pulse py-8">
              Lade Notizen…
            </div>
          )}
          {notes && notes.length === 0 && !creating && (
            <div className="text-center text-[12px] text-white/40 py-8">
              Noch keine Notizen. Klicke + oben für eine neue.
            </div>
          )}

          <ul className="space-y-2 mt-2">
            {(notes ?? []).map((n) =>
              editing === n.id ? (
                <EditNoteInline
                  key={n.id}
                  matterId={matterId}
                  note={n}
                  onCancel={() => setEditing(null)}
                  onSaved={async () => {
                    setEditing(null);
                    await load();
                    onChanged?.();
                  }}
                />
              ) : (
                <NoteRow
                  key={n.id}
                  note={n}
                  onEdit={() => setEditing(n.id)}
                  onDelete={() => deleteNote(n.id)}
                />
              ),
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Single note row ────────────────────────────────────────────────

function NoteRow({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview =
    note.content.length > 200 ? note.content.slice(0, 200) + "…" : note.content;
  return (
    <li className="rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition group">
      <div className="px-3.5 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-white truncate">
            {note.title}
          </div>
          {preview && (
            <div className="mt-1 text-[12px] text-white/65 leading-relaxed whitespace-pre-wrap line-clamp-3">
              {preview}
            </div>
          )}
          <div className="mt-2 text-[10px] text-white/30 tabular-nums">
            Aktualisiert{" "}
            {new Date(note.updatedAt).toLocaleString("de-DE", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition"
            title="Bearbeiten"
          >
            <Pencil size={11} strokeWidth={1.8} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Löschen"
          >
            <Trash2 size={11} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </li>
  );
}

// ─── Create + Edit inlined ──────────────────────────────────────────
//
// Both create and edit share the same shape (title + content + submit),
// but route to different endpoints (POST /notes vs PATCH /notes/:id).
// Kept as two separate components for clarity rather than abstracting
// behind a single component with an `existing?` prop.

function CreateNoteInline({
  matterId,
  onCancel,
  onCreated,
}: {
  matterId: string;
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const t = title.trim();
    const c = content.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/network/matter/${matterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, content: c }),
      });
      if (res.ok) await onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg bg-white/[0.025] border border-white/[0.1] p-3 mb-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
        autoFocus
        disabled={submitting}
        className="w-full bg-transparent outline-none text-[13px] font-medium text-white placeholder:text-white/30 mb-1.5"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Inhalt (Plaintext oder Markdown)"
        rows={5}
        disabled={submitting}
        className="w-full bg-transparent outline-none resize-none text-[12px] text-white/85 placeholder:text-white/30 leading-relaxed"
      />
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/[0.05] mt-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="px-3 h-7 rounded-md text-[11px] text-white/55 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          onClick={submit}
          disabled={!title.trim() || submitting}
          className="px-3 h-7 rounded-md bg-white text-black text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 inline-flex items-center gap-1.5"
        >
          {submitting ? (
            <Loader2 size={10} strokeWidth={2.2} className="animate-spin" />
          ) : (
            <Plus size={10} strokeWidth={2.2} />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}

function EditNoteInline({
  matterId,
  note,
  onCancel,
  onSaved,
}: {
  matterId: string;
  note: Note;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const t = title.trim();
    const c = content.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/network/matter/${matterId}/notes/${note.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t, content: c }),
        },
      );
      if (res.ok) await onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-lg bg-white/[0.025] border border-white/[0.15] p-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        disabled={submitting}
        className="w-full bg-transparent outline-none text-[13px] font-medium text-white mb-1.5"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        disabled={submitting}
        className="w-full bg-transparent outline-none resize-none text-[12px] text-white/85 leading-relaxed"
      />
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/[0.05] mt-2">
        <span className="text-[10px] text-white/30">
          Speichern erstellt eine neue Version (history bleibt erhalten)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-3 h-7 rounded-md text-[11px] text-white/55 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || submitting}
            className="px-3 h-7 rounded-md bg-white text-black text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 size={10} strokeWidth={2.2} className="animate-spin" />
            ) : (
              <Save size={10} strokeWidth={2.2} />
            )}
            Speichern
          </button>
        </div>
      </div>
    </li>
  );
}
