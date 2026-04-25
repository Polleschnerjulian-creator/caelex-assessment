"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ArtifactDetailDrawer — full-payload view of a single pinboard card.
 *
 * The card on the board shows a compact summary (counts, top 4
 * citations, memo preview); the drawer shows the full payload —
 * every assessment, every key provision, the full memo content with
 * markdown.
 *
 * Why a right-side drawer rather than a centered modal:
 *   - The chat sidebar already lives on the left, so the drawer on
 *     the right keeps both visible. User can read chat + detail
 *     side-by-side.
 *   - On wide screens it slides in over the masonry without obscuring
 *     other cards completely. ESC closes.
 *
 * Renders by `kind` discriminated union — same dispatch as ArtifactCard
 * but with verbose bodies.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  ShieldCheck,
  Scale,
  FileText,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { ArtifactKind, PinboardArtifact } from "./ArtifactCard";

interface ArtifactDetailDrawerProps {
  artifact: PinboardArtifact | null;
  onClose: () => void;
}

export function ArtifactDetailDrawer({
  artifact,
  onClose,
}: ArtifactDetailDrawerProps) {
  // ESC closes
  useEffect(() => {
    if (!artifact) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [artifact, onClose]);

  if (!artifact) return null;

  const Icon = iconFor(artifact.kind);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="artifact-drawer-title"
      className="fixed inset-0 z-[80] flex justify-end"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Drawer */}
      <div className="relative w-full sm:w-[520px] h-full bg-[#0a0c10] border-l border-white/[0.08] shadow-2xl flex flex-col">
        {/* Header */}
        <header className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
            <Icon size={15} strokeWidth={1.8} className="text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] tracking-[0.22em] uppercase text-white/40">
              {labelFor(artifact.kind)}
            </div>
            <h2
              id="artifact-drawer-title"
              className="text-sm font-medium text-white truncate"
            >
              {artifact.title}
            </h2>
            <div className="text-[10px] text-white/30 mt-0.5">
              {new Date(artifact.createdAt).toLocaleString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition flex-shrink-0"
            aria-label="Schließen"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </header>

        {/* Body — kind-specific */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {artifact.kind === "COMPLIANCE_OVERVIEW" && (
            <ComplianceFull payload={artifact.payload} />
          )}
          {artifact.kind === "CITATIONS" && (
            <CitationsFull payload={artifact.payload} />
          )}
          {artifact.kind === "MEMO" && <MemoFull payload={artifact.payload} />}
          {artifact.kind === "TEXT" && <TextFull payload={artifact.payload} />}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function iconFor(kind: ArtifactKind) {
  switch (kind) {
    case "COMPLIANCE_OVERVIEW":
      return ShieldCheck;
    case "CITATIONS":
      return Scale;
    case "MEMO":
      return FileText;
    case "TEXT":
      return Sparkles;
  }
}

function labelFor(kind: ArtifactKind): string {
  switch (kind) {
    case "COMPLIANCE_OVERVIEW":
      return "Compliance · Detailansicht";
    case "CITATIONS":
      return "Rechtsquellen · Detailansicht";
    case "MEMO":
      return "Memo · Detailansicht";
    case "TEXT":
      return "Notiz · Detailansicht";
  }
}

// ─── COMPLIANCE_OVERVIEW full body ──────────────────────────────────

interface ComplianceFullPayload {
  counts?: Record<string, number>;
  nis2_classifications?: string[];
  latest_updated_at?: Record<string, string | null>;
  recent?: {
    cybersecurity?: Array<{
      id: string;
      assessmentName?: string;
      updatedAt: string;
    }>;
    nis2?: Array<{
      id: string;
      assessmentName?: string;
      entityClassification?: string;
      classificationReason?: string;
      updatedAt: string;
    }>;
    debris?: Array<{
      id: string;
      missionName?: string;
      orbitType?: string;
      satelliteCount?: number;
      updatedAt: string;
    }>;
    insurance?: Array<{
      id: string;
      assessmentName?: string;
      primaryJurisdiction?: string;
      operatorType?: string;
      updatedAt: string;
    }>;
    environmental?: Array<{
      id: string;
      assessmentName?: string;
      status?: string;
      operatorType?: string;
      updatedAt: string;
    }>;
  };
}

function ComplianceFull({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as ComplianceFullPayload;
  const recent = p.recent;
  const hasRecent =
    recent &&
    Object.values(recent).some((v) => Array.isArray(v) && v.length > 0);

  return (
    <div className="space-y-5">
      {/* Counts table */}
      <section>
        <h3 className="text-[10px] tracking-[0.22em] uppercase text-white/45 mb-2">
          Counts
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          {Object.entries(p.counts ?? {}).map(([key, n]) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-1.5 rounded-md bg-white/[0.025] border border-white/[0.04]"
            >
              <span className="text-xs text-white/70 capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  n > 0 ? "text-white" : "text-white/25"
                }`}
              >
                {n}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* NIS2 classifications */}
      {p.nis2_classifications && p.nis2_classifications.length > 0 && (
        <section>
          <h3 className="text-[10px] tracking-[0.22em] uppercase text-white/45 mb-2">
            NIS2-Einstufungen
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {p.nis2_classifications.map((c, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30"
              >
                {c.replace(/_/g, " ").toLowerCase()}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Recent details (only present when tool was called with detail_level=full) */}
      {hasRecent && (
        <section>
          <h3 className="text-[10px] tracking-[0.22em] uppercase text-white/45 mb-2">
            Neueste Assessments
          </h3>
          <div className="space-y-3">
            {recent?.nis2?.map((a) => (
              <RecentRow
                key={a.id}
                title={a.assessmentName ?? "NIS2-Assessment"}
                subtitle={a.entityClassification
                  ?.replace(/_/g, " ")
                  .toLowerCase()}
                hint={a.classificationReason ?? ""}
                updatedAt={a.updatedAt}
              />
            ))}
            {recent?.cybersecurity?.map((a) => (
              <RecentRow
                key={a.id}
                title={a.assessmentName ?? "Cybersecurity"}
                subtitle="Cybersecurity"
                updatedAt={a.updatedAt}
              />
            ))}
            {recent?.debris?.map((a) => (
              <RecentRow
                key={a.id}
                title={a.missionName ?? "Debris Mission"}
                subtitle={`Debris · ${a.orbitType ?? ""} · ${a.satelliteCount ?? 0} Sats`}
                updatedAt={a.updatedAt}
              />
            ))}
            {recent?.insurance?.map((a) => (
              <RecentRow
                key={a.id}
                title={a.assessmentName ?? "Insurance"}
                subtitle={`${a.primaryJurisdiction ?? ""} · ${a.operatorType ?? ""}`}
                updatedAt={a.updatedAt}
              />
            ))}
            {recent?.environmental?.map((a) => (
              <RecentRow
                key={a.id}
                title={a.assessmentName ?? "Environmental"}
                subtitle={`${a.status ?? ""} · ${a.operatorType ?? ""}`}
                updatedAt={a.updatedAt}
              />
            ))}
          </div>
        </section>
      )}

      {!hasRecent && (
        <p className="text-[12px] text-white/40 italic">
          Diese Karte enthält nur Counts. Frag Atlas mit „detail_level: full" um
          die einzelnen Assessments mitzuziehen.
        </p>
      )}
    </div>
  );
}

function RecentRow({
  title,
  subtitle,
  hint,
  updatedAt,
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  updatedAt: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-white/90">{title}</div>
          {subtitle && (
            <div className="text-[10px] text-white/45 mt-0.5">{subtitle}</div>
          )}
          {hint && (
            <div className="text-[11px] text-white/55 mt-1.5 italic line-clamp-3">
              {hint}
            </div>
          )}
        </div>
        <div className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
          {new Date(updatedAt).toLocaleDateString("de-DE")}
        </div>
      </div>
    </div>
  );
}

// ─── CITATIONS full body ────────────────────────────────────────────

interface CitationsFullPayload {
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

function CitationsFull({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as CitationsFullPayload;
  const matches = p.matches ?? [];

  return (
    <div className="space-y-4">
      {p.query && (
        <div className="text-[12px] text-white/55 italic">„{p.query}"</div>
      )}
      {matches.length === 0 && (
        <p className="text-[12px] text-white/40">Keine Treffer.</p>
      )}
      {matches.map((m) => (
        <div
          key={m.id}
          className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-4 py-3.5"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-[13px] font-medium text-white">{m.title}</h4>
              {m.titleLocal && m.titleLocal !== m.title && (
                <div className="text-[11px] text-white/55 italic mt-0.5">
                  {m.titleLocal}
                </div>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-white/45">
                <span className="uppercase tracking-wider">
                  {m.jurisdiction}
                </span>
                {m.officialReference && (
                  <>
                    <span>·</span>
                    <span>{m.officialReference}</span>
                  </>
                )}
                <span>·</span>
                <span>{m.type}</span>
                <span>·</span>
                <span className="tabular-nums">
                  {Math.round(m.score * 100)}% Match
                </span>
              </div>
            </div>
            {m.sourceUrl && (
              <a
                href={m.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-white/55 hover:text-white p-1 rounded transition flex-shrink-0"
                title="Quelle öffnen"
              >
                <ExternalLink size={12} strokeWidth={1.8} />
              </a>
            )}
          </div>
          {m.keyProvisionsPreview && m.keyProvisionsPreview.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1.5">
              {m.keyProvisionsPreview.map((p, i) => (
                <div
                  key={i}
                  className="text-[11px] text-white/65 leading-relaxed"
                >
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MEMO full body ─────────────────────────────────────────────────

interface MemoFullPayload {
  noteId?: string;
  title?: string;
  content?: string;
  contentLength?: number;
}

function MemoFull({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as MemoFullPayload;
  return (
    <div className="space-y-3">
      <div className="prose prose-invert prose-sm max-w-none text-white/85">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {p.content ?? ""}
        </ReactMarkdown>
      </div>
      <div className="pt-3 border-t border-white/[0.04] flex items-center gap-3 text-[10px] text-white/35">
        <span>{p.contentLength ?? p.content?.length ?? 0} Zeichen</span>
        <span>·</span>
        <span className="text-emerald-300/80">
          ✓ Als MatterNote gespeichert
        </span>
      </div>
    </div>
  );
}

// ─── TEXT full body ─────────────────────────────────────────────────

function TextFull({ payload }: { payload: Record<string, unknown> }) {
  const text =
    typeof payload.text === "string" ? payload.text : JSON.stringify(payload);
  return (
    <div className="prose prose-invert prose-sm max-w-none text-white/85 whitespace-pre-wrap">
      {text}
    </div>
  );
}
