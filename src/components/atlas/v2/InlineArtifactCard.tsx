"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Inline Artifact-Card unter AI-Antwort (Claude.ai-Style).
 *
 * Erscheint wenn die AI-Antwort als "Dokument" erkannt wird (siehe
 * detectArtifact-Heuristik). Click öffnet das ArtifactPreviewPanel
 * rechts.
 *
 * Visuell: kompakte Card mit Kind-Icon + Title + 1-Zeilen Preview +
 * "Vorschau öffnen →"-Affordance. Hover-State macht klar dass es
 * klickbar ist.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  ArrowUpRight,
  FileText,
  Briefcase,
  ScrollText,
  Mail,
  ClipboardList,
  ListChecks,
} from "lucide-react";
import type { ArtifactKind } from "./ArtifactPreviewPanel";

interface Props {
  kind: ArtifactKind;
  title: string;
  /** Erste Zeile als Preview-Text. */
  preview: string;
  onOpen: () => void;
}

const KIND_META: Record<
  ArtifactKind,
  { label: string; icon: typeof FileText; bgColor: string; textColor: string }
> = {
  schriftsatz: {
    label: "Schriftsatz",
    icon: ScrollText,
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  vertrag: {
    label: "Vertrag",
    icon: Briefcase,
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    textColor: "text-purple-700 dark:text-purple-300",
  },
  memo: {
    label: "Memo",
    icon: FileText,
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  brief: {
    label: "Brief",
    icon: Mail,
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  aktennotiz: {
    label: "Aktennotiz",
    icon: ClipboardList,
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    textColor: "text-slate-700 dark:text-slate-300",
  },
  checklist: {
    label: "Checkliste",
    icon: ListChecks,
    bgColor: "bg-indigo-50 dark:bg-indigo-500/10",
    textColor: "text-indigo-700 dark:text-indigo-300",
  },
  email: {
    label: "Email",
    icon: Mail,
    bgColor: "bg-cyan-50 dark:bg-cyan-500/10",
    textColor: "text-cyan-700 dark:text-cyan-300",
  },
  summary: {
    label: "Zusammenfassung",
    icon: FileText,
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    textColor: "text-slate-700 dark:text-slate-300",
  },
};

export function InlineArtifactCard({ kind, title, preview, onOpen }: Props) {
  const meta = KIND_META[kind] ?? KIND_META.memo;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${meta.label} "${title}" öffnen`}
      className="group mt-3 flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700/60 dark:bg-slate-900/50 dark:hover:border-slate-600"
    >
      {/* Icon-Box */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bgColor} ${meta.textColor}`}
        aria-hidden="true"
      >
        <Icon size={18} />
      </div>

      {/* Title + Preview */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-medium uppercase tracking-[0.14em] ${meta.textColor}`}
          >
            {meta.label}
          </span>
          <span className="text-[10px] text-slate-400">·</span>
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Klicken für Vorschau
          </span>
        </div>
        <div className="mt-0.5 truncate text-[13.5px] font-medium text-slate-900 dark:text-slate-100">
          {title}
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-500 dark:text-slate-400">
          {preview}
        </div>
      </div>

      {/* Arrow */}
      <span
        className="mt-1 shrink-0 text-slate-300 transition-colors group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300"
        aria-hidden="true"
      >
        <ArrowUpRight size={16} />
      </span>
    </button>
  );
}
