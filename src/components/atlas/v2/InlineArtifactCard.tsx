"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Inline Artifact-Card unter AI-Antwort.
 *
 * Erscheint wenn die AI-Antwort als "Dokument" erkannt wird (siehe
 * detectArtifact-Heuristik). Click öffnet das ArtifactPreviewPanel
 * rechts.
 *
 * Design (2026-06-03 refresh): clean/modern, "Apple"-Material —
 *   - title-first hierarchy (semibold, tight tracking) over a muted
 *     "kind · preview" subline
 *   - ONE cohesive neutral icon tile (no per-kind rainbow) — the kind
 *     stays legible via its distinct icon + label, not loud colour
 *   - depth from a very soft ambient shadow + a 1px hover-lift
 *     (iOS-card feel), not a border-colour jump
 *   - generous radius (rounded-2xl) + hairline border
 * Honours prefers-reduced-motion (the lift/transition is disabled).
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

/* Per-kind label + icon only. Colour is intentionally uniform (neutral
   graphite) for a calm, Apple-clean read — the icon + label carry the
   type distinction. */
const KIND_META: Record<
  ArtifactKind,
  { label: string; icon: typeof FileText }
> = {
  schriftsatz: { label: "Schriftsatz", icon: ScrollText },
  vertrag: { label: "Vertrag", icon: Briefcase },
  memo: { label: "Memo", icon: FileText },
  brief: { label: "Brief", icon: Mail },
  aktennotiz: { label: "Aktennotiz", icon: ClipboardList },
  checklist: { label: "Checkliste", icon: ListChecks },
  email: { label: "Email", icon: Mail },
  summary: { label: "Zusammenfassung", icon: FileText },
};

export function InlineArtifactCard({ kind, title, preview, onOpen }: Props) {
  const meta = KIND_META[kind] ?? KIND_META.memo;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${meta.label} "${title}" öffnen`}
      className="group mt-3 flex w-full items-center gap-3.5 rounded-2xl border border-black/[0.06] bg-white px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:border-black/[0.09] hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.14)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(15,23,42,0.04)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-none dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
    >
      {/* Neutral icon tile — uniform across kinds (Apple restraint). */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-inset ring-black/[0.04] transition-colors group-hover:bg-slate-200/70 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/[0.06] dark:group-hover:bg-white/[0.10]"
        aria-hidden="true"
      >
        <Icon size={19} strokeWidth={1.75} />
      </div>

      {/* Title-first hierarchy + muted "kind · preview" subline. */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-tight tracking-[-0.01em] text-slate-900 dark:text-slate-100">
          {title}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11.5px] leading-tight text-slate-500 dark:text-slate-400">
          <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
            {meta.label}
          </span>
          <span
            className="shrink-0 text-slate-300 dark:text-slate-600"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="truncate">{preview}</span>
        </div>
      </div>

      {/* Open affordance — brightens + nudges on hover. */}
      <span
        className="shrink-0 self-center text-slate-300 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 dark:text-slate-600 dark:group-hover:text-slate-300"
        aria-hidden="true"
      >
        <ArrowUpRight size={16} strokeWidth={2} />
      </span>
    </button>
  );
}
