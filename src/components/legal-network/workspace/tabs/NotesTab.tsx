"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * NotesTab — list + edit matter notes. Phase 2 ships with plain-text
 * (textarea); Phase 2b swaps in a rich-text editor.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditBy: string | null;
}

export function NotesTab({ matterId }: { matterId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/notes`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Notizen nicht ladbar");
      setNotes(json.notes);
      if (!selectedId && json.notes.length > 0) {
        setSelectedId(json.notes[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createNote(title: string) {
    const res = await fetch(`/api/network/matter/${matterId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: "" }),
    });
    const json = await res.json();
    if (res.ok && json.note) {
      setSelectedId(json.note.id);
      await load();
    }
    setShowNew(false);
  }

  async function updateNote(
    id: string,
    patch: { title?: string; content?: string },
  ) {
    const res = await fetch(`/api/network/matter/${matterId}/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (res.ok && json.note) {
      // The new edit created a new row with a new id; select that.
      setSelectedId(json.note.id);
      await load();
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Notiz (und alle Versionen) wirklich löschen?")) return;
    await fetch(`/api/network/matter/${matterId}/notes/${id}`, {
      method: "DELETE",
    });
    setSelectedId(null);
    await load();
  }

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!notes)
    return (
      <div className="text-white/40 text-sm animate-pulse">Lade Notizen…</div>
    );

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-[260px_1fr] gap-4 h-[calc(100vh-220px)]">
      {/* Sidebar — note list */}
      <aside className="border border-white/[0.06] rounded-xl bg-white/[0.02] flex flex-col">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] tracking-[0.22em] uppercase text-white/40">
            Notizen
          </span>
          <button
            onClick={() => setShowNew(true)}
            className="text-white/60 hover:text-white text-xs px-1"
          >
            +
          </button>
        </div>
        {showNew && (
          <NewNoteInput
            onCancel={() => setShowNew(false)}
            onCreate={createNote}
          />
        )}
        <ul className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setSelectedId(n.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  n.id === selectedId
                    ? "bg-white/[0.08] text-white"
                    : "hover:bg-white/[0.04] text-white/70"
                }`}
              >
                <div className="text-xs font-medium truncate">{n.title}</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {new Date(n.updatedAt).toLocaleDateString("de-DE")}
                </div>
              </button>
            </li>
          ))}
          {notes.length === 0 && !showNew && (
            <div className="p-4 text-xs text-white/40 text-center">
              Keine Notizen. + für neue.
            </div>
          )}
        </ul>
      </aside>

      {/* Editor */}
      <section className="border border-white/[0.06] rounded-xl bg-white/[0.02] flex flex-col overflow-hidden">
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-sm text-white/40">
            Wähle oder erstelle eine Notiz.
          </div>
        )}
        {selected && (
          <NoteEditor
            key={selected.id}
            note={selected}
            onSave={(patch) => updateNote(selected.id, patch)}
            onDelete={() => deleteNote(selected.id)}
          />
        )}
      </section>
    </div>
  );
}

function NewNoteInput({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <div className="p-2 border-b border-white/[0.06]">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel der Notiz"
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) onCreate(title.trim());
          if (e.key === "Escape") onCancel();
        }}
        className="w-full bg-white/[0.06] text-sm px-2 py-1.5 rounded outline-none text-white placeholder:text-white/30"
      />
    </div>
  );
}

function NoteEditor({
  note,
  onSave,
  onDelete,
}: {
  note: Note;
  onSave: (patch: { title?: string; content?: string }) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const dirty = title !== note.title || content !== note.content;

  async function save() {
    if (!dirty) return;
    setSaving(true);
    await onSave({ title, content });
    setSaving(false);
    setSavedAt(new Date());
  }

  return (
    <>
      <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-base font-semibold text-white outline-none"
        />
        <span className="text-[10px] text-white/30">
          {saving
            ? "speichert…"
            : savedAt
              ? `gespeichert ${savedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
              : dirty
                ? "ungespeichert"
                : ""}
        </span>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-3 py-1 text-xs rounded-lg bg-white text-black font-medium disabled:opacity-40"
        >
          Speichern
        </button>
        <button
          onClick={onDelete}
          className="text-white/40 hover:text-red-400 text-xs px-2"
        >
          Löschen
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Memo-Text, Recherche-Notizen, Entwurfstext…"
        className="flex-1 p-4 bg-transparent text-sm text-white/90 outline-none resize-none leading-relaxed"
        style={{ fontFamily: "ui-monospace, monospace" }}
      />
    </>
  );
}
