"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate file list (UI refresh, theme-aware).
 *
 * Renders the file vault for one mandate. Each row: icon + filename +
 * type pill + size + uploader + actions (download via signed URL,
 * delete with confirm).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  Loader2,
  Download,
  Trash2,
  ExternalLink,
  CalendarPlus,
  Check,
} from "lucide-react";

interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string | null };
  /** M2 Vault-RAG: present once listMandateFiles enriches with chunk counts. */
  embedStatus?: "embedded" | "pending";
  embedChunks?: number;
}

interface Props {
  mandateId: string;
  /** Bumped by parent (after upload finishes) to trigger reload. */
  refreshKey: number;
}

export function MandateFilesList({ mandateId, refreshKey }: Props) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  /* Sprint 6b (2026-05-18) — Frist-Extraktion in-flight state.
     Maps fileId → "loading" | "done" | { error: string }. */
  const [extracting, setExtracting] = useState<
    Record<string, "loading" | "done">
  >({});
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleExtractDeadlines = async (fileId: string) => {
    setExtracting((prev) => ({ ...prev, [fileId]: "loading" }));
    setExtractError(null);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/files/${fileId}/extract-deadlines`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setExtractError(data?.error ?? "Extraktion fehlgeschlagen");
        setExtracting((prev) => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
        return;
      }
      const data = (await res.json()) as {
        created: number;
        deadlines: { title: string; dueAt: string }[];
      };
      setExtracting((prev) => ({ ...prev, [fileId]: "done" }));
      /* Notify the suggestions surface to refetch (event-bus pattern). */
      window.dispatchEvent(
        new CustomEvent("atlas-v2-deadline-suggestions-changed", {
          detail: { mandateId, count: data.created },
        }),
      );
      /* Reset "done" state after a few seconds so the button comes back. */
      setTimeout(() => {
        setExtracting((prev) => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
      }, 4000);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Extraktion fehlgeschlagen",
      );
      setExtracting((prev) => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
    }
  };
  const [deleting, setDeleting] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/files`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setFiles([]);
        return;
      }
      const data = (await res.json()) as { files: FileRecord[] };
      setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleDownload = async (fileId: string) => {
    setDownloading(fileId);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/files/${fileId}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { url: string };
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`Datei "${filename}" wirklich löschen?`)) return;
    setDeleting(fileId);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/files/${fileId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        await reload();
      }
    } finally {
      setDeleting(null);
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/30">
        <Loader2
          size={11}
          className="mr-2 animate-spin motion-reduce:animate-none"
        />{" "}
        Lädt Dateien…
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/30">
        Noch keine Dateien hochgeladen.
      </div>
    );
  }

  return (
    <>
      {/* Sprint 6b — Extract error banner. */}
      {extractError && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {extractError}
        </div>
      )}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <FileIcon mimeType={f.mimeType} />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-slate-900 dark:text-slate-100">
                {f.filename}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                {f.documentType && <TypeBadge t={f.documentType} />}
                <span>{formatBytes(f.sizeBytes)}</span>
                <span>·</span>
                <span>{f.uploadedBy.name || f.uploadedBy.email || "—"}</span>
                <span>·</span>
                <span>{new Date(f.createdAt).toLocaleDateString("de-DE")}</span>
                {f.embedStatus === "embedded" ? (
                  <>
                    <span>·</span>
                    <span
                      className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400"
                      title={`Volltextsuche aktiv (${f.embedChunks ?? 0} Chunks indexiert)`}
                    >
                      ✓ embedded
                    </span>
                  </>
                ) : f.embedStatus === "pending" ? (
                  <>
                    <span>·</span>
                    <span
                      className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500"
                      title="Datei wird im Hintergrund indexiert — Volltextsuche bald verfügbar"
                    >
                      ⏳ wird indexiert…
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            {/* AUDIT-FIX H12 (2026-05-17): icon-only button → aria-label
              (title alone is not reliably exposed by screen readers). */}
            <button
              type="button"
              onClick={() => handleDownload(f.id)}
              disabled={downloading === f.id}
              title="Herunterladen"
              aria-label={`Datei ${f.filename} herunterladen`}
              className="text-slate-400 hover:text-emerald-700 disabled:opacity-30 dark:text-slate-500 dark:hover:text-emerald-300"
            >
              {downloading === f.id ? (
                <Loader2
                  size={12}
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Download size={12} />
              )}
            </button>
            {/* Sprint 6b (2026-05-18) — Frist-Extraktion via Claude Haiku.
              Erkennt automatisch Fristen in der Datei (Bescheide,
              Schriftsätze) und legt sie als pending Suggestions an. */}
            <button
              type="button"
              onClick={() => handleExtractDeadlines(f.id)}
              disabled={extracting[f.id] === "loading"}
              title="Fristen aus Datei extrahieren (AI)"
              aria-label={`Fristen aus Datei ${f.filename} extrahieren`}
              className={`disabled:opacity-30 ${
                extracting[f.id] === "done"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400"
              }`}
            >
              {extracting[f.id] === "loading" ? (
                <Loader2
                  size={12}
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : extracting[f.id] === "done" ? (
                <Check size={12} />
              ) : (
                <CalendarPlus size={12} />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(f.id, f.filename)}
              disabled={deleting === f.id}
              title="Löschen"
              aria-label={`Datei ${f.filename} löschen`}
              className="text-slate-400 hover:text-red-600 disabled:opacity-30 dark:text-slate-500 dark:hover:text-red-400"
            >
              {deleting === f.id ? (
                <Loader2
                  size={12}
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Trash2 size={12} />
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/"))
    return (
      <FileImage
        size={14}
        className="shrink-0 text-slate-400 dark:text-slate-500"
      />
    );
  if (mimeType.includes("spreadsheet") || mimeType === "text/csv")
    return (
      <FileSpreadsheet
        size={14}
        className="shrink-0 text-slate-400 dark:text-slate-500"
      />
    );
  if (mimeType === "application/pdf")
    /* AUDIT-FIX M23 (2026-05-17): was ExternalLink which signals
       "opens new tab" — wrong semantic for a file. Now FileText
       (matching the other text-document icons) in PDF-red. */
    return (
      <FileText
        size={14}
        className="shrink-0 text-rose-500 dark:text-rose-400/70"
      />
    );
  return (
    <FileText
      size={14}
      className="shrink-0 text-slate-400 dark:text-slate-500"
    />
  );
}

function TypeBadge({ t }: { t: string }) {
  return (
    <span className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[9px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {t}
    </span>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
