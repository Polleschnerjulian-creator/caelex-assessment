"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Artifact Preview Panel (Claude.ai-style).
 *
 * Rechts-seitiges Overlay-Panel das den vollen Artefakt-Body anzeigt
 * + alle Export-Aktionen anbietet (PDF, DOCX, Copy, Save-to-Vault).
 * Wird durch Klick auf einen InlineArtifactCard im Chat geöffnet.
 *
 * Design: split-view auf Desktop (Chat bleibt links sichtbar, Panel
 * slidet von rechts rein), full-screen mit backdrop auf mobile.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Copy,
  FileText,
  FileType,
  FolderInput,
  Check,
  Loader2,
  Briefcase,
  Mail,
  ListChecks,
  ScrollText,
  ClipboardList,
  Pencil,
} from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import {
  downloadArtifactAsPdf,
  buildArtifactPdf,
} from "@/lib/atlas/artifact-pdf";
import { downloadArtifactAsDocx } from "@/lib/atlas/artifact-docx";

export type ArtifactKind =
  | "schriftsatz"
  | "vertrag"
  | "memo"
  | "brief"
  | "aktennotiz"
  | "checklist"
  | "email"
  | "summary";

export interface ArtifactInfo {
  kind: ArtifactKind;
  title: string;
  body: string;
  /** Optional — chat the artifact came from. Used by save-to-vault. */
  chatId?: string;
  /** Optional — mandate the chat is scoped to. Vault-Upload-Target. */
  mandateId?: string | null;
}

interface Props {
  artifact: ArtifactInfo;
  onClose: () => void;
  /** Optional — Sprint 2a (2026-05-18). Triggers a chat-iteration on
   *  this artifact: parent prefills the chat input with a refine-prompt
   *  carrying the artifact body as context. When undefined, the
   *  "Anpassen" button is hidden. */
  onRefineRequest?: (artifact: ArtifactInfo) => void;
}

type PreviewMode = "markdown" | "pdf";

const KIND_META: Record<
  ArtifactKind,
  { label: string; icon: typeof FileText; color: string }
> = {
  schriftsatz: {
    label: "Schriftsatz",
    icon: ScrollText,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  vertrag: {
    label: "Vertrag",
    icon: Briefcase,
    color: "text-purple-600 dark:text-purple-400",
  },
  memo: {
    label: "Memo",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
  },
  brief: {
    label: "Brief",
    icon: Mail,
    color: "text-amber-600 dark:text-amber-400",
  },
  aktennotiz: {
    label: "Aktennotiz",
    icon: ClipboardList,
    color: "text-slate-600 dark:text-slate-400",
  },
  checklist: {
    label: "Checkliste",
    icon: ListChecks,
    color: "text-indigo-600 dark:text-indigo-400",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-cyan-600 dark:text-cyan-400",
  },
  summary: {
    label: "Zusammenfassung",
    icon: FileText,
    color: "text-slate-600 dark:text-slate-400",
  },
};

export function ArtifactPreviewPanel({
  artifact,
  onClose,
  onRefineRequest,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [savingToVault, setSavingToVault] = useState(false);
  /* Sprint 1a (2026-05-18): PDF inline preview tab. */
  const [mode, setMode] = useState<PreviewMode>("markdown");

  /* Escape-key + click-outside close. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Sprint 1a — generate PDF as a blob URL only when the PDF tab is
     active. We re-generate on artifact-body change so iterative refines
     re-render. The URL is revoked on cleanup so we don't leak blob-
     memory across artifact-switches. */
  const pdfBlobUrl = useMemo(() => {
    if (mode !== "pdf") return null;
    try {
      const doc = buildArtifactPdf({
        kind: artifact.kind,
        title: artifact.title,
        body: artifact.body,
        mandateName: undefined,
      });
      const blob = doc.output("blob");
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("PDF preview generation failed", err);
      return null;
    }
  }, [mode, artifact.kind, artifact.title, artifact.body]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const meta = KIND_META[artifact.kind] ?? KIND_META.memo;
  const Icon = meta.icon;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard rejected — silent */
    }
  };

  const handleDownloadPdf = () => {
    /* artifact-pdf supports all 8 ArtifactKind variants 1:1 since the
       DIN 5008-konformen rewrite (2026-05-18). Pass kind through. */
    downloadArtifactAsPdf({
      kind: artifact.kind,
      title: artifact.title,
      body: artifact.body,
      mandateName: undefined,
    });
  };

  const handleDownloadDocx = () => {
    /* Sprint 1b (2026-05-18): artifact-docx now supports all 8 kinds 1:1
       with DIN 5008-style layouts mirroring the PDF generator. */
    void downloadArtifactAsDocx({
      kind: artifact.kind,
      title: artifact.title,
      body: artifact.body,
      mandateName: undefined,
    });
  };

  const handleSaveToVault = async () => {
    if (!artifact.mandateId || savedToVault || savingToVault) return;
    setSavingToVault(true);
    try {
      const filename = `${artifact.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim() || "Artefakt"}.md`;
      const blob = new Blob([artifact.body], { type: "text/markdown" });
      const file = new File([blob], filename, { type: "text/markdown" });
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/atlas/mandate/${artifact.mandateId}/files`,
        { method: "POST", body: form },
      );
      if (res.ok) {
        setSavedToVault(true);
        setTimeout(() => setSavedToVault(false), 3000);
      }
    } finally {
      setSavingToVault(false);
    }
  };

  return (
    <>
      {/* Backdrop — nur mobile, desktop bleibt Chat sichtbar */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Side panel — desktop: 600px from right; mobile: full screen */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-preview-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl ring-1 ring-black/[0.06] dark:bg-slate-950 dark:ring-white/[0.08] lg:w-[640px] lg:border-l lg:border-slate-200 lg:dark:border-slate-800"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 shrink-0 ${meta.color}`}
              aria-hidden="true"
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {meta.label}
              </p>
              <h2
                id="artifact-preview-title"
                className="mt-0.5 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100"
              >
                {artifact.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onRefineRequest && (
              <button
                type="button"
                onClick={() => onRefineRequest(artifact)}
                title="Dokument anpassen (Chat-Iteration starten)"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Pencil size={11} />
                Anpassen
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Vorschau schließen"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Sprint 1a (2026-05-18) — Tab toggle: Markdown vs PDF-preview */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-5 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMode("markdown")}
            className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              mode === "markdown"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
            }`}
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setMode("pdf")}
            className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              mode === "pdf"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
            }`}
          >
            PDF-Vorschau
          </button>
          <span className="ml-auto text-[10.5px] text-slate-400">
            {mode === "pdf"
              ? "live-render — DIN 5008-Layout"
              : "Quell-Markdown"}
          </span>
        </div>

        {/* Body — scrollable. Markdown OR PDF iframe depending on mode. */}
        {mode === "markdown" ? (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
              <MarkdownContent text={artifact.body} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
            {pdfBlobUrl ? (
              <iframe
                title={`PDF-Vorschau: ${artifact.title}`}
                src={pdfBlobUrl}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
                <Loader2 size={14} className="mr-2 animate-spin" />
                PDF wird generiert …
              </div>
            )}
          </div>
        )}

        {/* Action bar — sticky bottom */}
        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileText size={12} />
            PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadDocx}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileType size={12} />
            DOCX
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copied ? (
              <Check
                size={12}
                className="text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          {artifact.mandateId && (
            <button
              type="button"
              onClick={handleSaveToVault}
              disabled={savedToVault || savingToVault}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                savedToVault
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              } disabled:opacity-50`}
            >
              {savingToVault ? (
                <Loader2 size={12} className="animate-spin" />
              ) : savedToVault ? (
                <>
                  <Check size={12} />
                  Im Vault
                </>
              ) : (
                <>
                  <FolderInput size={12} />
                  In Vault
                </>
              )}
            </button>
          )}
          <div className="ml-auto text-[10.5px] text-slate-400">
            Esc zum Schließen
          </div>
        </footer>
      </aside>
    </>
  );
}
