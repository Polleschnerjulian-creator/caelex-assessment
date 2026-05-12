"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate file list.
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
} from "lucide-react";

interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string | null };
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
      <div className="flex items-center justify-center rounded-md border border-dashed border-slate-700/60 bg-slate-900/30 px-4 py-6 text-xs text-slate-500">
        <Loader2 size={11} className="mr-2 animate-spin" /> Lädt Dateien…
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/30 px-4 py-6 text-center text-xs text-slate-500">
        Noch keine Dateien hochgeladen.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/40">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-slate-900"
        >
          <FileIcon mimeType={f.mimeType} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-slate-100">{f.filename}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
              {f.documentType && <TypeBadge t={f.documentType} />}
              <span>{formatBytes(f.sizeBytes)}</span>
              <span>·</span>
              <span>{f.uploadedBy.name || f.uploadedBy.email || "—"}</span>
              <span>·</span>
              <span>{new Date(f.createdAt).toLocaleDateString("de-DE")}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDownload(f.id)}
            disabled={downloading === f.id}
            title="Herunterladen"
            className="text-slate-500 hover:text-emerald-300 disabled:opacity-30"
          >
            {downloading === f.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(f.id, f.filename)}
            disabled={deleting === f.id}
            title="Löschen"
            className="text-slate-500 hover:text-red-400 disabled:opacity-30"
          >
            {deleting === f.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/"))
    return <FileImage size={14} className="shrink-0 text-slate-500" />;
  if (mimeType.includes("spreadsheet") || mimeType === "text/csv")
    return <FileSpreadsheet size={14} className="shrink-0 text-slate-500" />;
  if (mimeType === "application/pdf")
    return <ExternalLink size={14} className="shrink-0 text-rose-400/70" />;
  return <FileText size={14} className="shrink-0 text-slate-500" />;
}

function TypeBadge({ t }: { t: string }) {
  return (
    <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[9px] text-slate-300">
      {t}
    </span>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
