"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate file upload (drag-and-drop + click-to-pick).
 *
 * Posts each file to /api/atlas/mandate/[id]/files in parallel
 * (one request per file). Reports per-file progress + errors. After
 * all uploads settle, fires onChanged so the parent reloads the file
 * list.
 *
 * Sprint 5 scope: TXT/MD/HTML get inline-text-extraction at upload
 * time; PDF/DOCX/XLSX upload but text-extraction is deferred.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface Props {
  mandateId: string;
  onChanged: () => void;
  disabled?: boolean;
}

interface PerFileStatus {
  filename: string;
  state: "uploading" | "done" | "error";
  error?: string;
}

const ACCEPT =
  ".txt,.md,.html,.csv,.pdf,.doc,.docx,.xls,.xlsx," +
  "text/plain,text/markdown,text/html,text/csv," +
  "application/pdf," +
  "application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function MandateFileUpload({ mandateId, onChanged, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statuses, setStatuses] = useState<PerFileStatus[]>([]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      /* Initialise status rows. */
      const initialIds = list.map((f) => ({
        filename: f.name,
        state: "uploading" as const,
      }));
      setStatuses((prev) => [...prev, ...initialIds]);

      const results = await Promise.allSettled(
        list.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(`/api/atlas/mandate/${mandateId}/files`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `HTTP ${res.status}`);
          }
          return file.name;
        }),
      );

      setStatuses((prev) => {
        const updated = [...prev];
        list.forEach((file, i) => {
          const result = results[i];
          const target = updated.findIndex(
            (s) => s.filename === file.name && s.state === "uploading",
          );
          if (target === -1) return;
          if (result.status === "fulfilled") {
            updated[target] = { filename: file.name, state: "done" };
          } else {
            updated[target] = {
              filename: file.name,
              state: "error",
              error: String(result.reason).replace(/^Error: /, ""),
            };
          }
        });
        return updated;
      });

      /* Fire reload regardless — done rows shouldn't keep the list
         stale even when some failed. */
      onChanged();

      /* Auto-clear "done" rows after 3s; keep errors until dismissed. */
      setTimeout(() => {
        setStatuses((prev) => prev.filter((s) => s.state !== "done"));
      }, 3000);
    },
    [mandateId, onChanged],
  );

  const handlePick = () => fileInputRef.current?.click();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void uploadFiles(e.target.files);
    e.target.value = "";
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) void uploadFiles(e.dataTransfer.files);
  };

  const dismissStatus = (filename: string) => {
    setStatuses((prev) => prev.filter((s) => s.filename !== filename));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={disabled ? undefined : handlePick}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) handlePick();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center text-xs transition-colors ${
          disabled
            ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-600"
            : dragOver
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900/30 dark:text-slate-400 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900/50"
        }`}
      >
        <Upload size={18} />
        <span>
          Datei hierher ziehen oder{" "}
          <span className="text-emerald-700 underline dark:text-emerald-400">
            auswählen
          </span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-600">
          TXT/MD/HTML/CSV/PDF/DOC(X)/XLS(X) · max 50 MB · 100 pro Mandat
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        hidden
        onChange={handleInputChange}
      />

      {statuses.length > 0 && (
        <ul className="mt-3 space-y-1">
          {statuses.map((s) => (
            <li
              key={s.filename + s.state}
              className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] dark:border-slate-800 dark:bg-slate-900/40"
            >
              {s.state === "uploading" && (
                <Loader2
                  size={11}
                  className="animate-spin text-emerald-600 dark:text-emerald-400"
                />
              )}
              {s.state === "done" && (
                <CheckCircle2
                  size={11}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              )}
              {s.state === "error" && (
                <AlertCircle
                  size={11}
                  className="text-red-500 dark:text-red-400"
                />
              )}
              <span className="line-clamp-1 flex-1 text-slate-700 dark:text-slate-300">
                {s.filename}
              </span>
              {s.error && (
                <span className="line-clamp-1 max-w-[40%] text-red-500 dark:text-red-400">
                  {s.error}
                </span>
              )}
              {s.state !== "uploading" && (
                <button
                  type="button"
                  onClick={() => dismissStatus(s.filename)}
                  className="text-slate-400 hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Verbergen"
                >
                  <X size={10} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
