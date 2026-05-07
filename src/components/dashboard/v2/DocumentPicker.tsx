"use client";

import { useState, useMemo } from "react";
import { Paperclip, Search, Upload, FileText } from "lucide-react";

import { attachDocumentAction } from "@/app/dashboard/items/[regulation]/[rowId]/server-actions";
import type { RegulationKey } from "@/lib/comply-v2/types";
import type { PickerDocument } from "@/lib/comply-v2/document-picker.server";

interface DocumentPickerProps {
  itemId: string;
  regulation: RegulationKey;
  rowId: string;
  documents: PickerDocument[];
}

/**
 * Sprint 10I — Inline document picker on UPLOAD_EVIDENCE.
 *
 * Lightweight searchable dropdown: type to filter the user's recent
 * vault docs by name, click to attach. On attach, the server action
 * writes a structured ComplianceItemNote citing the document and the
 * item's note-timeline refreshes via revalidatePath.
 *
 * Keeps the previous "Open Document Vault" link as a fallback for
 * users who need to upload a *new* document — this picker is for the
 * "I already uploaded it, just connect it" path.
 *
 * Empty-state: if the user has no vault documents yet, we show the
 * vault-link as the only affordance with a friendly nudge.
 */
export function DocumentPicker({
  itemId,
  regulation,
  rowId,
  documents,
}: DocumentPickerProps) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  }, [documents, query]);

  // Empty vault — no point showing search + empty list.
  if (documents.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p
          className="text-[12.5px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.65)" }}
        >
          Your document vault is empty. Upload a file first, then come back to
          attach it here.
        </p>
        <a
          href="/dashboard/documents"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            color: "rgb(20, 20, 22)",
          }}
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={2} />
          Open Document Vault
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: "rgba(0, 0, 0, 0.35)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        }}
      >
        <Search
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={2}
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vault documents…"
          className="w-full bg-transparent text-[13px] focus:outline-none"
          style={{ color: "rgba(255, 255, 255, 0.92)" }}
        />
        <span
          className="shrink-0 text-[11px] tabular-nums"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          {filtered.length}/{documents.length}
        </span>
      </div>

      {/* Filtered list */}
      {filtered.length === 0 ? (
        <p
          className="rounded-lg p-4 text-center text-[12.5px]"
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            color: "rgba(255, 255, 255, 0.55)",
          }}
        >
          No documents match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul
          className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1"
          aria-label="Vault documents"
        >
          {filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              itemId={itemId}
              regulation={regulation}
              rowId={rowId}
              isPending={pendingId === doc.id}
              onAttach={() => setPendingId(doc.id)}
              onDone={() => setPendingId(null)}
            />
          ))}
        </ul>
      )}

      {/* Vault fallback */}
      <a
        href="/dashboard/documents"
        className="inline-flex w-fit items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          color: "rgba(255, 255, 255, 0.92)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        }}
      >
        <Upload className="h-3.5 w-3.5" strokeWidth={2} />
        Or upload a new document
      </a>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  itemId,
  regulation,
  rowId,
  isPending,
  onAttach,
  onDone,
}: {
  doc: PickerDocument;
  itemId: string;
  regulation: RegulationKey;
  rowId: string;
  isPending: boolean;
  onAttach: () => void;
  onDone: () => void;
}) {
  return (
    <li>
      <form
        action={async (formData: FormData) => {
          onAttach();
          try {
            await attachDocumentAction(formData);
          } finally {
            onDone();
          }
        }}
      >
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="documentId" value={doc.id} />
        <input
          type="hidden"
          name="_redirect"
          value={`/dashboard/items/${regulation}/${rowId}`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
          }}
        >
          <FileText
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: "rgba(255, 255, 255, 0.65)" }}
          />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[12.5px] font-medium"
              style={{ color: "rgba(255, 255, 255, 0.92)" }}
            >
              {doc.name}
            </p>
            <p
              className="truncate text-[11px]"
              style={{ color: "rgba(255, 255, 255, 0.45)" }}
            >
              {doc.fileName} · {formatBytes(doc.fileSize)} ·{" "}
              {doc.category.toLowerCase()}
            </p>
          </div>
          <span
            className="shrink-0 text-[11px] font-medium"
            style={{ color: "rgba(255, 255, 255, 0.65)" }}
          >
            {isPending ? (
              "Attaching…"
            ) : (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" strokeWidth={2} />
                Attach
              </span>
            )}
          </span>
        </button>
      </form>
    </li>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
