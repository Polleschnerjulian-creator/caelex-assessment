"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Sidebar Mandate-Context Section.
 *
 * Renders the active mandate's at-a-glance context inside the
 * sidebar: name, file count + first 5 file titles with quick
 * upload, open-deadline count + next 2 due dates, member count.
 *
 * Appears when a mandate is "active" — either:
 *   - the user is on /atlas/mandate/[id] (path-resolved)
 *   - the user is on /atlas/chat/[id] AND that chat is in a
 *     mandate (resolved by the parent's chats list lookup)
 *
 * Why this exists: lawyers spend most of their time inside one
 * mandate at a time. Surfacing the mandate's vault + deadlines in
 * the sidebar means they don't have to leave the chat to check
 * which files are uploaded or what's due next.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  CalendarClock,
  Users,
  Upload,
  Loader2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface MandateLite {
  id: string;
  name: string;
  _count: { files: number; members: number; chats: number };
}

interface FileLite {
  id: string;
  filename: string;
  mimeType: string;
}

interface DeadlineLite {
  id: string;
  title: string;
  dueAt: string;
  warnDays: number;
  status: string;
}

interface Props {
  mandateId: string;
}

export function MandateContextSection({ mandateId }: Props) {
  const [mandate, setMandate] = useState<MandateLite | null>(null);
  const [files, setFiles] = useState<FileLite[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [mandateRes, filesRes, deadlinesRes] = await Promise.all([
        fetch(`/api/atlas/mandate/${mandateId}`, { cache: "no-store" }),
        fetch(`/api/atlas/mandate/${mandateId}/files`, { cache: "no-store" }),
        fetch(`/api/atlas/mandate/${mandateId}/deadlines`, {
          cache: "no-store",
        }),
      ]);
      if (mandateRes.ok) {
        const data = (await mandateRes.json()) as { mandate: MandateLite };
        setMandate(data.mandate);
      }
      if (filesRes.ok) {
        const data = (await filesRes.json()) as { files: FileLite[] };
        setFiles(data.files ?? []);
      }
      if (deadlinesRes.ok) {
        const data = (await deadlinesRes.json()) as {
          deadlines: DeadlineLite[];
        };
        setDeadlines(
          (data.deadlines ?? [])
            .filter((d) => d.status === "open")
            .sort(
              (a, b) =>
                new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
            ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upload = async (filesIn: FileList | File[]) => {
    const list = Array.from(filesIn);
    if (list.length === 0) return;
    setUploading(true);
    try {
      await Promise.allSettled(
        list.map(async (f) => {
          const fd = new FormData();
          fd.append("file", f);
          await fetch(`/api/atlas/mandate/${mandateId}/files`, {
            method: "POST",
            body: fd,
          });
        }),
      );
      await reload();
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) void upload(e.dataTransfer.files);
  };

  if (loading && !mandate) {
    return (
      <div className="mb-3 px-2">
        <div className="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-700 dark:bg-emerald-500/[0.06] dark:text-emerald-300">
          <Loader2
            size={11}
            className="mr-1.5 inline animate-spin motion-reduce:animate-none"
          />
          Lädt Mandat…
        </div>
      </div>
    );
  }
  if (!mandate) return null;

  const filesPreview = files.slice(0, 5);
  const deadlinesPreview = deadlines.slice(0, 2);
  const now = Date.now();

  return (
    <div className="mb-3 px-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border p-2.5 transition-colors ${
          dragOver
            ? "border-slate-400 bg-slate-50 dark:border-emerald-500/40 dark:bg-emerald-500/[0.10]"
            : "border-slate-200 bg-slate-50/60 dark:border-emerald-500/15 dark:bg-emerald-500/[0.04]"
        }`}
      >
        {/* Mandate header */}
        <Link
          href={`/atlas/mandate/${mandate.id}`}
          className="mb-1.5 flex items-center gap-2 text-slate-900 transition-colors hover:text-slate-800 dark:text-emerald-100 dark:hover:text-emerald-200"
        >
          <Briefcase size={11} className="shrink-0 opacity-70" />
          <span className="line-clamp-1 flex-1 text-[12.5px] font-semibold">
            {mandate.name}
          </span>
          <ChevronRight size={11} className="shrink-0 opacity-50" />
        </Link>

        {/* Files preview */}
        <div className="mb-2">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-700/80 dark:text-emerald-300/70">
            <FileText size={9} />
            <span>{mandate._count.files} Dateien</span>
          </div>
          {filesPreview.length === 0 ? (
            <p className="px-1 text-[11px] text-slate-700/60 dark:text-emerald-300/50">
              Noch keine Dateien.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filesPreview.map((f) => (
                <li
                  key={f.id}
                  className="line-clamp-1 px-1 text-[11.5px] text-slate-700 dark:text-emerald-100/85"
                  title={f.filename}
                >
                  · {f.filename}
                </li>
              ))}
              {mandate._count.files > 5 && (
                <li className="px-1 text-[10.5px] text-slate-700/70 dark:text-emerald-300/60">
                  +{mandate._count.files - 5} weitere · alle anzeigen
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Deadlines preview */}
        {deadlinesPreview.length > 0 && (
          <div className="mb-2">
            <div className="mb-0.5 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-700/80 dark:text-emerald-300/70">
              <CalendarClock size={9} />
              <span>{deadlines.length} offene Fristen</span>
            </div>
            <ul className="space-y-0.5">
              {deadlinesPreview.map((d) => {
                const due = new Date(d.dueAt).getTime();
                const daysToGo = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
                const isPast = daysToGo < 0;
                const isWarn = daysToGo >= 0 && daysToGo <= d.warnDays;
                return (
                  <li
                    key={d.id}
                    className="flex items-baseline gap-1.5 px-1 text-[11px]"
                    title={d.title}
                  >
                    {isPast ? (
                      <AlertTriangle
                        size={9}
                        className="shrink-0 text-red-600 dark:text-red-400"
                      />
                    ) : isWarn ? (
                      <AlertTriangle
                        size={9}
                        className="shrink-0 text-amber-600 dark:text-amber-400"
                      />
                    ) : null}
                    <span className="line-clamp-1 flex-1 text-slate-700 dark:text-emerald-100/85">
                      {d.title}
                    </span>
                    <span
                      className={`shrink-0 tabular-nums text-[10px] ${
                        isPast
                          ? "text-red-600 dark:text-red-400"
                          : isWarn
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-slate-700/70 dark:text-emerald-300/60"
                      }`}
                    >
                      {isPast
                        ? `-${Math.abs(daysToGo)}d`
                        : daysToGo === 0
                          ? "heute"
                          : `${daysToGo}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Members compact line */}
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[10.5px] text-slate-700/70 dark:text-emerald-300/60">
          <Users size={9} />
          <span>
            {mandate._count.members} Mitglied
            {mandate._count.members === 1 ? "" : "er"}
          </span>
        </div>

        {/* Quick upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white/40 px-2 py-1.5 text-[11px] text-slate-700 transition-colors hover:border-slate-400 hover:bg-white/70 disabled:opacity-50 dark:border-emerald-500/20 dark:bg-white/[0.02] dark:text-emerald-300 dark:hover:border-emerald-500/40 dark:hover:bg-white/[0.04]"
        >
          {uploading ? (
            <Loader2
              size={10}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Upload size={10} />
          )}
          {uploading ? "Lädt hoch…" : "Datei hochladen"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          accept=".txt,.md,.html,.csv,.pdf,.doc,.docx,.xls,.xlsx,text/plain,text/markdown,text/html,text/csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
      </div>
    </div>
  );
}
