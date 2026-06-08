"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Meeting → CRM importer panel (Stage 1). Paste a Gemini meeting transcript →
 * "Extract" (one Claude call, server-side) → an EDITABLE preview (matched-vs-new
 * contacts, the note, action items as task checkboxes, an optional deal) →
 * "Confirm import" writes it. Nothing is written until Confirm. Dark CRM styling.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  UserPlus,
  Link2,
  ClipboardPaste,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type {
  ImportPreview,
  PreviewContact,
  CommitPayload,
  CommitResult,
} from "@/lib/crm/meeting-import-types";

type Phase = "input" | "preview" | "done";

export default function MeetingImport({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("input");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable preview state (seeded from the server preview, then user-edited).
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [contacts, setContacts] = useState<PreviewContact[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [createDeal, setCreateDeal] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);

  const post = async (body: unknown) =>
    fetch("/api/admin/crm/import-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(body),
    });

  async function handleExtract() {
    if (!transcript.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await post({ mode: "preview", transcript });
      if (!res.ok) {
        setError(
          res.status === 403
            ? "You don't have access to the CRM importer."
            : "Extraction failed. Try again.",
        );
        return;
      }
      const data: ImportPreview = await res.json();
      setPreview(data);
      setContacts(data.contacts);
      setNoteBody(data.noteBody);
      // Default: all action items checked (→ tasks); the user can uncheck.
      setCheckedTasks(new Set(data.actionItems.map((_, i) => i)));
      setCreateDeal(false);
      setPhase("preview");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const payload: CommitPayload = {
      transcript,
      meetingTitle: preview.meetingTitle,
      meetingDate: preview.meetingDate,
      summary: preview.summary,
      noteBody,
      contacts,
      actionItemsAsTasks: preview.actionItems.filter((_, i) =>
        checkedTasks.has(i),
      ),
      createDeal,
    };
    try {
      const res = await post({ mode: "commit", payload });
      if (!res.ok) {
        setError("Could not save the import. Try again.");
        return;
      }
      setResult(await res.json());
      setPhase("done");
      onImported?.();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const updateContact = (i: number, patch: Partial<PreviewContact>) =>
    setContacts((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const removeContact = (i: number) =>
    setContacts((cs) => cs.filter((_, j) => j !== i));
  const toggleTask = (i: number) =>
    setCheckedTasks((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Import meeting"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl"
        style={{
          background: "var(--surface-base, #0b0f1a)",
          borderColor: "var(--border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="flex items-center gap-2">
            <ClipboardPaste
              size={16}
              className="text-[var(--accent-primary)]"
            />
            <h2 className="text-title font-semibold text-[var(--text-primary)]">
              Import meeting
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--accent-danger)] bg-[var(--accent-danger)]/10 px-3 py-2">
              <AlertCircle size={14} className="text-[var(--accent-danger)]" />
              <p className="text-small text-[var(--accent-danger)]">{error}</p>
            </div>
          )}

          {/* ── INPUT ── */}
          {phase === "input" && (
            <div className="space-y-4">
              <p className="text-small text-[var(--text-secondary)]">
                Paste the Gemini meeting notes or transcript. Claude extracts
                the external attendees, a summary and action items — you review
                everything before anything is saved.
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={12}
                placeholder="Paste the meeting transcript or Gemini notes here…"
                className="w-full resize-y rounded-xl border bg-transparent px-3 py-2.5 text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                style={{ borderColor: "var(--border-default)" }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtract}
                  disabled={busy || !transcript.trim()}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-body font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {busy ? "Extracting…" : "Extract"}
                </button>
              </div>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {phase === "preview" && preview && (
            <div className="space-y-5">
              {preview.meetingTitle && (
                <p className="text-body font-medium text-[var(--text-primary)]">
                  {preview.meetingTitle}
                  {preview.meetingDate ? (
                    <span className="ml-2 text-small text-[var(--text-tertiary)]">
                      {preview.meetingDate}
                    </span>
                  ) : null}
                </p>
              )}

              {/* Contacts */}
              <div>
                <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Contacts ({contacts.length})
                </p>
                {contacts.length === 0 && (
                  <p className="text-small text-[var(--text-tertiary)]">
                    No external attendees were found. You can still save the
                    meeting note below.
                  </p>
                )}
                <div className="space-y-2">
                  {contacts.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl border p-3"
                      style={{
                        background: "var(--surface-raised)",
                        borderColor: "var(--border-default)",
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold"
                          style={
                            c.matchedContactId
                              ? {
                                  background: "var(--accent-info)15",
                                  color: "var(--accent-info)",
                                }
                              : {
                                  background: "var(--accent-success)15",
                                  color: "var(--accent-success)",
                                }
                          }
                        >
                          {c.matchedContactId ? (
                            <>
                              <Link2 size={11} /> existing
                            </>
                          ) : (
                            <>
                              <UserPlus size={11} /> new
                            </>
                          )}
                        </span>
                        <button
                          onClick={() => removeContact(i)}
                          aria-label="Remove contact"
                          className="text-[var(--text-tertiary)] hover:text-[var(--accent-danger)]"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={c.name}
                          onChange={(e) =>
                            updateContact(i, { name: e.target.value })
                          }
                          placeholder="Name"
                          className="rounded-lg border bg-transparent px-2.5 py-1.5 text-small text-[var(--text-primary)]"
                          style={{ borderColor: "var(--border-default)" }}
                        />
                        <input
                          value={c.email ?? ""}
                          onChange={(e) =>
                            updateContact(i, {
                              email: e.target.value || null,
                            })
                          }
                          placeholder="Email"
                          className="rounded-lg border bg-transparent px-2.5 py-1.5 text-small text-[var(--text-primary)]"
                          style={{ borderColor: "var(--border-default)" }}
                        />
                        <input
                          value={c.company ?? ""}
                          onChange={(e) =>
                            updateContact(i, {
                              company: e.target.value || null,
                            })
                          }
                          placeholder="Company"
                          className="rounded-lg border bg-transparent px-2.5 py-1.5 text-small text-[var(--text-primary)]"
                          style={{ borderColor: "var(--border-default)" }}
                        />
                        <input
                          value={c.title ?? ""}
                          onChange={(e) =>
                            updateContact(i, { title: e.target.value || null })
                          }
                          placeholder="Title"
                          className="rounded-lg border bg-transparent px-2.5 py-1.5 text-small text-[var(--text-primary)]"
                          style={{ borderColor: "var(--border-default)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Meeting note
                </p>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={5}
                  className="w-full resize-y rounded-xl border bg-transparent px-3 py-2.5 text-small text-[var(--text-primary)]"
                  style={{ borderColor: "var(--border-default)" }}
                />
              </div>

              {/* Action items → tasks */}
              {preview.actionItems.length > 0 && (
                <div>
                  <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Action items → tasks
                  </p>
                  <div className="space-y-1.5">
                    {preview.actionItems.map((item, i) => (
                      <label
                        key={i}
                        className="flex cursor-pointer items-start gap-2 text-small text-[var(--text-secondary)]"
                      >
                        <input
                          type="checkbox"
                          checked={checkedTasks.has(i)}
                          onChange={() => toggleTask(i)}
                          className="mt-0.5"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Deal */}
              <label className="flex cursor-pointer items-center gap-2 text-small text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={createDeal}
                  onChange={(e) => setCreateDeal(e.target.checked)}
                />
                Create a deal in the pipeline for this meeting
              </label>

              <div
                className="flex justify-end gap-2 border-t pt-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <button
                  onClick={() => setPhase("input")}
                  disabled={busy}
                  className="rounded-lg px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-body font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {busy ? "Saving…" : "Confirm import"}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === "done" && result && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2
                size={36}
                className="mx-auto text-[var(--accent-success)]"
              />
              <p className="text-body text-[var(--text-primary)]">
                Imported <strong>{result.contactsUpserted}</strong> contact
                {result.contactsUpserted === 1 ? "" : "s"},{" "}
                <strong>{result.notesCreated}</strong> note
                {result.notesCreated === 1 ? "" : "s"},{" "}
                <strong>{result.tasksCreated}</strong> task
                {result.tasksCreated === 1 ? "" : "s"}
                {result.dealCreated ? ", and a deal" : ""}.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    setPhase("input");
                    setTranscript("");
                    setPreview(null);
                    setResult(null);
                  }}
                  className="rounded-lg border px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  style={{ borderColor: "var(--border-default)" }}
                >
                  Import another
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-body font-medium text-white"
                  style={{ background: "var(--accent-primary)" }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
