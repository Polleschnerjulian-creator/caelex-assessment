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

import { useEffect, useState } from "react";
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
  Eye,
  Code2,
  ExternalLink,
  Maximize2,
  Minimize2,
  AlertCircle,
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
  /** Optional — Sprint 9 (2026-05-18). Opens the full-screen Word-like
   *  editor with AI sidebar. When undefined, the "Bearbeiten"-button
   *  is hidden. */
  onOpenEditor?: (artifact: ArtifactInfo) => void;
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
  onOpenEditor,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [savingToVault, setSavingToVault] = useState(false);
  /* Sprint 1a (2026-05-18): PDF inline preview tab. */
  const [mode, setMode] = useState<PreviewMode>("markdown");
  /* Sprint 8-polish (2026-05-18) — Fullscreen toggle, desktop only. */
  const [fullscreen, setFullscreen] = useState(false);
  /* Sprint 8-polish — Async PDF-generation state. Replaces the old
     useMemo (sync, blocking) which made the user click "PDF" and see
     500ms of nothing before the iframe appeared. Now: loading-spinner
     paints immediately, jsPDF runs after a 0-ms tick. */
  const [pdf, setPdf] = useState<{
    url: string | null;
    generating: boolean;
    iframeLoading: boolean;
    error: string | null;
    sizeKb: number | null;
    pageCount: number | null;
  }>({
    url: null,
    generating: false,
    iframeLoading: false,
    error: null,
    sizeKb: null,
    pageCount: null,
  });

  /* Escape-key + click-outside close. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* PDF generation effect. Owns the blob-URL lifecycle: cleanup
     revokes the URL when (a) mode switches back to markdown, (b) the
     artifact body changes, or (c) the panel unmounts. Cancellation
     flag protects against fast tab-flipping leaking blob-URLs. */
  useEffect(() => {
    if (mode !== "pdf") return;

    setPdf({
      url: null,
      generating: true,
      iframeLoading: false,
      error: null,
      sizeKb: null,
      pageCount: null,
    });

    let cancelled = false;
    let createdUrl: string | null = null;

    /* setTimeout(0) defers the jsPDF call so React can paint the
       loading-state BEFORE the 200-800ms blocking work starts. */
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const doc = buildArtifactPdf({
          kind: artifact.kind,
          title: artifact.title,
          body: artifact.body,
          mandateName: undefined,
        });
        const blob = doc.output("blob");
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPdf({
          url: createdUrl,
          generating: false,
          iframeLoading: true,
          error: null,
          sizeKb: Math.round(blob.size / 1024),
          pageCount: doc.getNumberOfPages(),
        });
      } catch (err) {
        if (cancelled) return;
        console.error("PDF preview generation failed", err);
        setPdf({
          url: null,
          generating: false,
          iframeLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "Unbekannter Fehler beim PDF-Render",
          sizeKb: null,
          pageCount: null,
        });
      }
    }, 30);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [mode, artifact.kind, artifact.title, artifact.body]);

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
      {/* Side panel — desktop: 760px from right (or fullscreen toggle);
          mobile: full screen with backdrop. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-preview-title"
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl ring-1 ring-black/[0.06] transition-[width] duration-200 dark:bg-slate-950 dark:ring-white/[0.08] lg:border-l lg:border-slate-200 lg:dark:border-slate-800 ${
          fullscreen ? "w-full lg:w-[calc(100vw-280px)]" : "w-full lg:w-[760px]"
        }`}
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
            {/* Sprint 9 (2026-05-18) — Bearbeiten öffnet den fullscreen
                Word-like Editor mit AI-Sidebar. Bevorzugt gegenüber
                "Anpassen" (das ist die schnelle one-shot Chat-Iteration). */}
            {onOpenEditor && (
              <button
                type="button"
                onClick={() => onOpenEditor(artifact)}
                title="Im Editor öffnen — Word-like Vollbild mit AI-Sidebar"
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                <Pencil size={11} />
                Bearbeiten
              </button>
            )}
            {onRefineRequest && (
              <button
                type="button"
                onClick={() => onRefineRequest(artifact)}
                title="Schnell-Anpassen via Chat-Input (eine Frage stellen)"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Pencil size={11} />
                Schnell-Frage
              </button>
            )}
            {/* Sprint 8-polish — Fullscreen toggle, desktop only. */}
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              aria-label={fullscreen ? "Panel verkleinern" : "Panel vergrößern"}
              title={fullscreen ? "Verkleinern" : "Vergrößern"}
              className="hidden rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:inline-flex"
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
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

        {/* Sprint 1a (2026-05-18) + Sprint 8-polish — Tab toggle with
            icons + per-tab caption (page-count / file-size). */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMode("markdown")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "markdown"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
            }`}
          >
            <Code2 size={12} />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setMode("pdf")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "pdf"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
            }`}
          >
            <Eye size={12} />
            PDF-Vorschau
          </button>
          <div className="ml-auto flex items-center gap-2 text-[10.5px] text-slate-400">
            {mode === "pdf" && pdf.pageCount && pdf.sizeKb ? (
              <>
                <span>
                  {pdf.pageCount} {pdf.pageCount === 1 ? "Seite" : "Seiten"} ·{" "}
                  {pdf.sizeKb} KB
                </span>
                {pdf.url && (
                  <a
                    href={pdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="In neuem Tab öffnen"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <ExternalLink size={10} />
                    Neuer Tab
                  </a>
                )}
              </>
            ) : mode === "pdf" ? (
              <span>DIN 5008-Layout · live-Render</span>
            ) : (
              <span>Quell-Markdown</span>
            )}
          </div>
        </div>

        {/* Body — scrollable. Markdown OR PDF iframe depending on mode. */}
        {mode === "markdown" ? (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
              <MarkdownContent text={artifact.body} />
            </div>
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden bg-slate-200/60 dark:bg-slate-900">
            {/* Loading state — visible while jsPDF runs (200-800ms). */}
            {pdf.generating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-200/60 backdrop-blur-sm dark:bg-slate-900/70">
                <Loader2
                  size={20}
                  className="animate-spin text-emerald-600 motion-reduce:animate-none dark:text-emerald-400"
                />
                <div className="text-center">
                  <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                    PDF wird generiert …
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    DIN 5008-Layout · {meta.label} · {artifact.body.length}{" "}
                    Zeichen
                  </div>
                </div>
              </div>
            )}
            {/* Error state — generation crashed (rare). */}
            {pdf.error && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <AlertCircle size={20} className="text-red-500" />
                <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  PDF-Generierung fehlgeschlagen
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {pdf.error}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    /* Force re-run by toggling mode */
                    setMode("markdown");
                    setTimeout(() => setMode("pdf"), 50);
                  }}
                  className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1 text-[11.5px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Erneut versuchen
                </button>
              </div>
            )}
            {/* Sprint 8-fix² (2026-05-18) — <object> statt <iframe>:
                Safari/WebKit hat einen langjährigen bug bei
                blob:application/pdf in <iframe> (lädt aber rendert
                nicht → weißer screen wie beim user gesehen). <object>
                nutzt den nativen PDF-plugin-pfad zuverlässiger UND hat
                native fallback-kette via children: zuerst <iframe> als
                zweiter versuch, dann Download-Link als letzte rettung
                wenn beide fehlschlagen. */}
            {pdf.url && (
              <object
                data={pdf.url}
                type="application/pdf"
                className="h-full w-full bg-white"
                onLoad={() => setPdf((p) => ({ ...p, iframeLoading: false }))}
              >
                <iframe
                  title={`PDF-Vorschau: ${artifact.title}`}
                  src={pdf.url}
                  className="h-full w-full border-0 bg-white"
                />
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText size={28} className="text-slate-400" />
                  <div className="text-[13px] text-slate-700 dark:text-slate-200">
                    Dein Browser kann PDFs nicht inline anzeigen.
                  </div>
                  <a
                    href={pdf.url}
                    download={`atlas-${artifact.kind}-vorschau.pdf`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-600"
                  >
                    <FileText size={12} />
                    PDF herunterladen
                  </a>
                </div>
              </object>
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
