"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ArtifactCard — renders a pinboard card for any of the four
 * `ArtifactKind` values Claude produces via tool calls:
 *
 *   - COMPLIANCE_OVERVIEW  → counts + NIS2 classification + latest dates
 *   - CITATIONS            → list of legal sources with score/jurisdiction
 *   - MEMO                 → drafted memo linked to a MatterNote
 *   - TEXT                 → fallback free-form card
 *
 * The dispatch is a discriminated union on `kind` — adding a new kind
 * means extending the Prisma enum and adding one case here. All cards
 * share the same liquid-glass chrome + action bar (pin + delete).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  Pin,
  PinOff,
  Trash2,
  ShieldCheck,
  Scale,
  FileText,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";

export type ArtifactKind =
  | "COMPLIANCE_OVERVIEW"
  | "CITATIONS"
  | "MEMO"
  | "TEXT";

export interface PinboardArtifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  payload: Record<string, unknown>;
  widthHint: "small" | "medium" | "large";
  pinned: boolean;
  createdAt: string;
}

// ─── Width tokens ─────────────────────────────────────────────────────
// Width is a *hint*: in masonry we translate it to column span. On very
// narrow viewports everything collapses to 1 col.

export const WIDTH_TO_SPAN: Record<PinboardArtifact["widthHint"], number> = {
  small: 1,
  medium: 1,
  large: 2,
};

// ─── Main dispatcher ─────────────────────────────────────────────────

interface ArtifactCardProps {
  artifact: PinboardArtifact;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}

export function ArtifactCard({
  artifact,
  onTogglePin,
  onDelete,
}: ArtifactCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const Icon =
    artifact.kind === "COMPLIANCE_OVERVIEW"
      ? ShieldCheck
      : artifact.kind === "CITATIONS"
        ? Scale
        : artifact.kind === "MEMO"
          ? FileText
          : Sparkles;

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative rounded-2xl
        border border-white/[0.08] bg-white/[0.025]
        backdrop-blur-xl
        shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_-8px_rgba(0,0,0,0.6)]
        transition-all duration-200
        hover:border-white/[0.18] hover:bg-white/[0.04]
        ${artifact.pinned ? "ring-1 ring-emerald-400/30" : ""}
      `}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
            <Icon size={13} strokeWidth={1.8} className="text-white/70" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] tracking-[0.2em] uppercase text-white/40">
              {labelFor(artifact.kind)}
            </div>
            <h3 className="text-[13px] font-medium text-white truncate">
              {artifact.title}
            </h3>
          </div>
        </div>
        {/* Action icons — fade in on hover, always visible when pinned */}
        <div
          className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity ${
            isHovered || artifact.pinned ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={() => onTogglePin(artifact.id, !artifact.pinned)}
            title={artifact.pinned ? "Lösen" : "Anheften"}
            className={`p-1.5 rounded-md transition ${
              artifact.pinned
                ? "text-emerald-300 hover:bg-emerald-500/20"
                : "text-white/50 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            {artifact.pinned ? (
              <PinOff size={12} strokeWidth={1.8} />
            ) : (
              <Pin size={12} strokeWidth={1.8} />
            )}
          </button>
          <button
            onClick={() => onDelete(artifact.id)}
            title="Entfernen"
            className="p-1.5 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <Trash2 size={12} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Body — kind-specific */}
      <div className="px-4 pb-4">
        {artifact.kind === "COMPLIANCE_OVERVIEW" && (
          <ComplianceOverviewBody payload={artifact.payload} />
        )}
        {artifact.kind === "CITATIONS" && (
          <CitationsBody payload={artifact.payload} />
        )}
        {artifact.kind === "MEMO" && <MemoBody payload={artifact.payload} />}
        {artifact.kind === "TEXT" && <TextBody payload={artifact.payload} />}
      </div>

      {/* Footer: created at */}
      <footer className="px-4 pb-2.5 pt-1 flex items-center gap-1.5 text-[10px] text-white/30 border-t border-white/[0.04]">
        <Clock size={9} strokeWidth={1.8} />
        <span>
          {new Date(artifact.createdAt).toLocaleString("de-DE", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </footer>
    </article>
  );
}

// ─── Labels ───────────────────────────────────────────────────────────

function labelFor(kind: ArtifactKind): string {
  switch (kind) {
    case "COMPLIANCE_OVERVIEW":
      return "Compliance";
    case "CITATIONS":
      return "Rechtsquellen";
    case "MEMO":
      return "Memo";
    case "TEXT":
      return "Notiz";
  }
}

// ─── COMPLIANCE_OVERVIEW body ─────────────────────────────────────────

interface ComplianceOverviewPayload {
  counts?: {
    cybersecurity?: number;
    nis2?: number;
    debris?: number;
    insurance?: number;
    environmental?: number;
  };
  nis2_classifications?: string[];
  latest_updated_at?: Record<string, string | null>;
}

function ComplianceOverviewBody({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const p = payload as ComplianceOverviewPayload;
  const counts = p.counts ?? {};
  const entries: Array<{ label: string; count: number }> = [
    { label: "Cybersecurity", count: counts.cybersecurity ?? 0 },
    { label: "NIS2", count: counts.nis2 ?? 0 },
    { label: "Debris", count: counts.debris ?? 0 },
    { label: "Insurance", count: counts.insurance ?? 0 },
    { label: "Environmental", count: counts.environmental ?? 0 },
  ];

  const nis2 = (p.nis2_classifications ?? []).filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map((e) => (
          <div
            key={e.label}
            className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04]"
          >
            <span className="text-[11px] text-white/60">{e.label}</span>
            <span
              className={`text-[12px] font-semibold tabular-nums ${
                e.count > 0 ? "text-white" : "text-white/25"
              }`}
            >
              {e.count}
            </span>
          </div>
        ))}
      </div>
      {nis2.length > 0 && (
        <div>
          <div className="text-[9px] tracking-[0.2em] uppercase text-white/35 mb-1">
            NIS2-Einstufung
          </div>
          <div className="flex flex-wrap gap-1">
            {nis2.slice(0, 3).map((c, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25"
              >
                {c.replace(/_/g, " ").toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CITATIONS body ───────────────────────────────────────────────────

interface CitationsPayload {
  query?: string;
  matches?: Array<{
    id: string;
    title: string;
    titleLocal?: string;
    jurisdiction: string;
    type: string;
    officialReference?: string;
    sourceUrl?: string;
    score: number;
    keyProvisionsPreview?: string[];
  }>;
}

function CitationsBody({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as CitationsPayload;
  const matches = p.matches ?? [];

  if (matches.length === 0) {
    return <p className="text-[12px] text-white/40">Keine Treffer.</p>;
  }

  return (
    <div className="space-y-2">
      {matches.slice(0, 4).map((m) => (
        <div
          key={m.id}
          className="group/citation rounded-lg bg-white/[0.015] border border-white/[0.04] px-2.5 py-2 hover:border-white/[0.1] transition"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-white/90 line-clamp-2">
                {m.title}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/45">
                <span className="uppercase tracking-wider">
                  {m.jurisdiction}
                </span>
                {m.officialReference && (
                  <>
                    <span>·</span>
                    <span className="truncate">{m.officialReference}</span>
                  </>
                )}
                <span>·</span>
                <span className="tabular-nums">
                  {Math.round(m.score * 100)}%
                </span>
              </div>
            </div>
            {m.sourceUrl && (
              <a
                href={m.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="opacity-0 group-hover/citation:opacity-100 transition p-1 rounded text-white/60 hover:text-white"
                title="Quelle öffnen"
              >
                <ExternalLink size={11} strokeWidth={1.8} />
              </a>
            )}
          </div>
        </div>
      ))}
      {matches.length > 4 && (
        <div className="text-[10px] text-white/35 text-center pt-1">
          +{matches.length - 4} weitere
        </div>
      )}
    </div>
  );
}

// ─── MEMO body ────────────────────────────────────────────────────────

interface MemoPayload {
  noteId?: string;
  title?: string;
  content?: string;
  contentLength?: number;
}

function MemoBody({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as MemoPayload;
  const content = p.content ?? "";
  const preview = content.length > 600 ? content.slice(0, 600) + " …" : content;

  return (
    <div className="space-y-2">
      <div className="text-[12px] text-white/75 leading-relaxed whitespace-pre-wrap font-serif">
        {preview}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span className="text-[10px] text-white/40">
          {p.contentLength ?? content.length} Zeichen
        </span>
        <span className="text-[10px] text-emerald-300/80">
          ✓ In Notizen gespeichert
        </span>
      </div>
    </div>
  );
}

// ─── TEXT body ────────────────────────────────────────────────────────

function TextBody({ payload }: { payload: Record<string, unknown> }) {
  const text =
    typeof payload.text === "string" ? payload.text : JSON.stringify(payload);
  return (
    <p className="text-[12px] text-white/75 leading-relaxed whitespace-pre-wrap">
      {text.slice(0, 500)}
      {text.length > 500 && " …"}
    </p>
  );
}
