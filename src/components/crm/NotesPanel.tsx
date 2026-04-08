"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { csrfHeaders } from "@/lib/csrf-client";

interface Note {
  id: string;
  body: string;
  createdAt: string | Date;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function NotesPanel({
  notes: initialNotes,
  contactId,
  companyId,
  dealId,
}: {
  notes: Note[];
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/crm/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          body: draft.trim(),
          contactId,
          companyId,
          dealId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes([data.note, ...notes]);
        setDraft("");
      }
    } catch (err) {
      console.error("Failed to create note", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note… (markdown supported)"
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-body resize-none focus:outline-none focus:ring-1"
          style={{
            background: "var(--surface-sunken)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!draft.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-md transition-colors disabled:opacity-50"
            style={{
              background: "var(--accent-primary)",
              color: "white",
            }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>Add note</span>
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-body text-[var(--text-tertiary)] text-center py-6">
            No notes yet
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border p-3"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="text-body text-[var(--text-primary)] whitespace-pre-wrap mb-2">
                {note.body}
              </p>
              <p className="text-caption text-[var(--text-tertiary)]">
                {note.author.name || note.author.email} ·{" "}
                {formatDistanceToNow(new Date(note.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
