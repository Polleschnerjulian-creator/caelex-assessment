"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Document Vault page.
 *
 * Single browsable view of every file the lawyer has access to,
 * across every mandate they own or are a member of. With:
 *
 *   - Live search (filename + extracted-text via /api/atlas/vault)
 *   - Group-by-mandate (default) or flat list toggle
 *   - Click a file → download via signed URL
 *   - Atlas can reference files in chat via search_mandate_knowledge
 *
 * Why a top-level page: lawyers think in "documents" first when
 * starting a task. Forcing them to remember "this clause was in
 * the Spire mandate, not the OneWeb mandate" breaks flow. The
 * vault treats all docs as one pile that you filter, not as
 * disjoint folders.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  ExternalLink,
  Loader2,
  Download,
  Briefcase,
  Folder,
  ListIcon,
} from "lucide-react";

interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string | null;
  createdAt: string;
  mandate: { id: string; name: string };
  uploadedBy: { id: string; name: string | null; email: string | null };
}

interface VaultResponse {
  files: FileRecord[];
  totals: { count: number; mandates: number; bytes: number };
}

export default function VaultPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [totals, setTotals] = useState<VaultResponse["totals"]>({
    count: 0,
    mandates: 0,
    bytes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<"mandate" | "flat">("mandate");
  /* AUDIT-FIX L04 (2026-05-17): track concurrent downloads via Set
     instead of single string. Previously rapid clicks on two files
     only showed the spinner on whichever was clicked last; the first
     download's button lost its loading-indicator immediately. */
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  /* Live-search with debounce. 250ms feels responsive without
     triggering on every keystroke. */
  const reload = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `/api/atlas/vault?q=${encodeURIComponent(q.trim())}`
        : `/api/atlas/vault`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as VaultResponse;
      setFiles(data.files ?? []);
      setTotals(data.totals ?? { count: 0, mandates: 0, bytes: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void reload(query), query ? 250 : 0);
    return () => clearTimeout(handle);
  }, [query, reload]);

  const handleDownload = async (file: FileRecord) => {
    if (downloadingIds.has(file.id)) return;
    setDownloadingIds((prev) => new Set(prev).add(file.id));
    try {
      const res = await fetch(
        `/api/atlas/mandate/${file.mandate.id}/files/${file.id}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { url: string };
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  /* Group files by mandate when groupBy === "mandate" */
  const grouped = useMemo(() => {
    if (groupBy === "flat") return null;
    const map = new Map<
      string,
      { mandate: FileRecord["mandate"]; files: FileRecord[] }
    >();
    for (const f of files) {
      const cur = map.get(f.mandate.id) ?? { mandate: f.mandate, files: [] };
      cur.files.push(f);
      map.set(f.mandate.id, cur);
    }
    /* Most-recent-first per group (already pre-sorted by API) + each
       group orders by its most-recent file's createdAt. */
    return [...map.values()].sort((a, b) => {
      const aLatest = new Date(a.files[0]?.createdAt ?? 0).getTime();
      const bLatest = new Date(b.files[0]?.createdAt ?? 0).getTime();
      return bLatest - aLatest;
    });
  }, [files, groupBy]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Atlas
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Mandate · Dokumente
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Folder size={20} className="text-slate-700 dark:text-slate-300" />
            Vault
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Alle Dokumente aller Mandate, in denen du Owner oder Mitglied bist.
            Suche nach Dateiname oder Inhalt — Atlas durchsucht den extrahierten
            Text aller Files. Click → Download via Signed-URL.
          </p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setGroupBy("mandate")}
            title="Gruppiert nach Mandat"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] transition-colors ${
              groupBy === "mandate"
                ? "bg-slate-900 text-white dark:bg-emerald-500/20 dark:text-emerald-200"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/[0.04]"
            }`}
          >
            <Briefcase size={11} /> Nach Mandat
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("flat")}
            title="Flache Liste"
            className={`flex items-center gap-1.5 border-l border-slate-200 px-2.5 py-1.5 text-[12px] transition-colors dark:border-white/[0.08] ${
              groupBy === "flat"
                ? "bg-slate-900 text-white dark:bg-emerald-500/20 dark:text-emerald-200"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/[0.04]"
            }`}
          >
            <ListIcon size={11} /> Liste
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <Stat label="Dateien" value={totals.count.toString()} />
        <Stat label="Mandate" value={totals.mandates.toString()} />
        <Stat label="Größe" value={fmtBytes(totals.bytes)} />
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-colors focus-within:border-slate-400 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:focus-within:border-white/[0.16]">
        <Search size={14} className="shrink-0 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche in Dateinamen + Volltext aller Mandats-Dokumente…"
          aria-label="Vault durchsuchen"
          className="w-full bg-transparent text-[13.5px] text-slate-900 outline-none focus-visible:outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {loading && (
          <Loader2 size={12} className="shrink-0 animate-spin text-slate-400" />
        )}
      </div>

      {/* Body */}
      {loading && files.length === 0 ? (
        <p className="text-sm text-slate-500">
          <Loader2 size={12} className="mr-2 inline animate-spin" /> Lädt Vault…
        </p>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-slate-700/60 dark:bg-slate-900/30">
          <Folder
            size={28}
            className="mx-auto text-slate-400 dark:text-slate-600"
            strokeWidth={1.2}
          />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            {query.trim() ? "Keine Treffer." : "Noch keine Dokumente."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {query.trim()
              ? "Versuche einen anderen Suchbegriff."
              : "Dokumente landen hier sobald du sie in ein Mandat hochlädst."}
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.mandate.id}>
              <div className="mb-2 flex items-center gap-2">
                <Briefcase
                  size={12}
                  className="text-slate-500 dark:text-slate-400"
                />
                <Link
                  href={`/atlas/mandate/${group.mandate.id}`}
                  className="text-[13px] font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  {group.mandate.name}
                </Link>
                <span className="text-[10.5px] text-slate-500">
                  · {group.files.length} Datei
                  {group.files.length === 1 ? "" : "en"}
                </span>
              </div>
              <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
                {group.files.map((f, i) => (
                  <FileRow
                    key={f.id}
                    file={f}
                    onDownload={handleDownload}
                    downloading={downloadingIds.has(f.id)}
                    isLast={i === group.files.length - 1}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
          {files.map((f, i) => (
            <FileRow
              key={f.id}
              file={f}
              onDownload={handleDownload}
              downloading={downloadingIds.has(f.id)}
              isLast={i === files.length - 1}
              showMandate
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({
  file,
  onDownload,
  downloading,
  isLast,
  showMandate,
}: {
  file: FileRecord;
  onDownload: (f: FileRecord) => void;
  downloading: boolean;
  isLast: boolean;
  showMandate?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-900 ${
        isLast ? "" : "border-b border-slate-200 dark:border-slate-800"
      }`}
    >
      <FileIcon mimeType={file.mimeType} />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-slate-900 dark:text-slate-100">
          {file.filename}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-slate-500">
          {file.documentType && (
            <span className="rounded bg-slate-100 px-1 py-0 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {file.documentType}
            </span>
          )}
          {showMandate && (
            <>
              <Link
                href={`/atlas/mandate/${file.mandate.id}`}
                className="hover:underline"
              >
                {file.mandate.name}
              </Link>
              <span>·</span>
            </>
          )}
          <span>{fmtBytes(file.sizeBytes)}</span>
          <span>·</span>
          <span>{file.uploadedBy.name || file.uploadedBy.email || "—"}</span>
          <span>·</span>
          <span>{new Date(file.createdAt).toLocaleDateString("de-DE")}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDownload(file)}
        disabled={downloading}
        title="Herunterladen"
        aria-label="Datei herunterladen"
        className="text-slate-400 transition-colors hover:text-slate-900 disabled:opacity-30 dark:text-slate-500 dark:hover:text-slate-200"
      >
        {downloading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
      </button>
    </li>
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
    return (
      <ExternalLink
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
