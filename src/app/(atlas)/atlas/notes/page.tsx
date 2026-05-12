"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Notes / Highlights browse page.
 *
 * Personal knowledge base — the lawyer's saved excerpts from Atlas
 * chat answers + their own annotations. Searchable, linkable back
 * to source chat/mandate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  StickyNote,
  Search,
  Loader2,
  MessageSquare,
  Briefcase,
  Trash2,
  X,
} from "lucide-react";

interface NoteRecord {
  id: string;
  chatId: string | null;
  mandateId: string | null;
  excerpt: string;
  note: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<NoteRecord | null>(null);

  const reload = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `/api/atlas/notes?q=${encodeURIComponent(q.trim())}`
        : `/api/atlas/notes`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notes: NoteRecord[] };
      setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void reload(query), query ? 250 : 0);
    return () => clearTimeout(handle);
  }, [query, reload]);

  const handleDelete = async (id: string) => {
    if (!confirm("Notiz wirklich löschen?")) return;
    setDeleting(id);
    setNotes((list) => list.filter((n) => n.id !== id));
    try {
      await fetch(`/api/atlas/notes/${id}`, { method: "DELETE" });
    } catch {
      void reload(query);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Atlas
        </Link>
      </div>

      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Persönlich · Notizen
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <StickyNote
            size={20}
            className="text-slate-700 dark:text-slate-300"
          />
          Notizen
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Persönliche Wissensbasis aus gespeicherten Antwort-Auszügen + eigenen
          Annotationen. Privat pro User — niemand sonst in der Kanzlei sieht
          die.
        </p>
      </header>

      {/* Search */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-colors focus-within:border-slate-400 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:focus-within:border-white/[0.16]">
        <Search size={14} className="shrink-0 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notizen durchsuchen…"
          aria-label="Notizen durchsuchen"
          className="w-full bg-transparent text-[13.5px] text-slate-900 outline-none focus-visible:outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {loading && (
          <Loader2 size={12} className="shrink-0 animate-spin text-slate-400" />
        )}
      </div>

      {loading && notes.length === 0 ? (
        <p className="text-sm text-slate-500">
          <Loader2 size={12} className="mr-2 inline animate-spin" /> Lädt…
        </p>
      ) : notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-slate-700/60 dark:bg-slate-900/30">
          <StickyNote
            size={28}
            className="mx-auto text-slate-400 dark:text-slate-600"
            strokeWidth={1.2}
          />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            {query.trim() ? "Keine Treffer." : "Noch keine Notizen."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {query.trim()
              ? "Versuche einen anderen Suchbegriff."
              : "Atlas-Chat-Antwort → Notiz-Symbol → Notiz erstellen."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-900/40"
            >
              <blockquote className="border-l-2 border-amber-300 pl-3 text-[13.5px] leading-relaxed text-slate-800 dark:border-amber-500/40 dark:text-slate-200">
                „{n.excerpt}"
              </blockquote>
              {n.note && (
                <p className="mt-2 text-[12.5px] italic text-slate-600 dark:text-slate-400">
                  {n.note}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-[10.5px] text-slate-500">
                {n.chatId && (
                  <Link
                    href={`/atlas/chat/${n.chatId}`}
                    className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    <MessageSquare size={9} />
                    Chat
                  </Link>
                )}
                {n.mandateId && (
                  <Link
                    href={`/atlas/mandate/${n.mandateId}`}
                    className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    <Briefcase size={9} />
                    Mandat
                  </Link>
                )}
                <span>{new Date(n.createdAt).toLocaleDateString("de-DE")}</span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setEditing(n)}
                  className="hover:text-slate-800 dark:hover:text-slate-300"
                >
                  Notiz bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  disabled={deleting === n.id}
                  className="text-slate-400 hover:text-red-600 disabled:opacity-30 dark:text-slate-500 dark:hover:text-red-400"
                  aria-label="Löschen"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditNoteDialog
          note={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setNotes((list) =>
              list.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
            );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditNoteDialog({
  note,
  onClose,
  onSaved,
}: {
  note: NoteRecord;
  onClose: () => void;
  onSaved: (updated: NoteRecord) => void;
}) {
  const [text, setText] = useState(note.note ?? "");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/atlas/notes/${note.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: text.trim() || null }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { note: NoteRecord };
      onSaved(data.note);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm dark:bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Notiz bearbeiten</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>
        <blockquote className="mb-3 border-l-2 border-amber-300 pl-3 text-[12.5px] text-slate-700 dark:border-amber-500/40 dark:text-slate-300">
          „{note.excerpt}"
        </blockquote>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Deine Annotation…"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/[0.08] dark:bg-slate-950 dark:text-slate-100 dark:focus:border-white/[0.16]"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-1.5 text-[12.5px] text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
