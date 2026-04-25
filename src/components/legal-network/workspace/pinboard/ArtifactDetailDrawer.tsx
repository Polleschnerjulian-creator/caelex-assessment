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

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  ShieldCheck,
  Scale,
  FileText,
  Sparkles,
  ExternalLink,
  Globe2,
  FolderOpen,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import type { ArtifactKind, PinboardArtifact } from "./ArtifactCard";

interface ArtifactDetailDrawerProps {
  artifact: PinboardArtifact | null;
  /** Matter id is needed for the matter-scoped document download flow.
   *  Could be undefined for legacy callers but in practice the
   *  Pinboard always passes it. */
  matterId?: string;
  onClose: () => void;
}

export function ArtifactDetailDrawer({
  artifact,
  matterId,
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
          {artifact.kind === "JURISDICTION_COMPARE" && (
            <ComparisonFull payload={artifact.payload} />
          )}
          {artifact.kind === "DOCUMENT_REFERENCE" && (
            <DocumentsFull payload={artifact.payload} matterId={matterId} />
          )}
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
    case "JURISDICTION_COMPARE":
      return Globe2;
    case "DOCUMENT_REFERENCE":
      return FolderOpen;
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
    case "JURISDICTION_COMPARE":
      return "Jurisdiktions-Vergleich";
    case "DOCUMENT_REFERENCE":
      return "Dokumente · Detailansicht";
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

// ─── JURISDICTION_COMPARE full body ─────────────────────────────────
//
// Full side-by-side table. We render rows per dimension (legislation,
// authority, insurance, debris, timeline, EU Space Act) so the eye
// scans across countries naturally. Each cell is clickable when there's
// an official URL. Long text wraps in the cell.

interface ComparisonFullPayload {
  topic?: string | null;
  jurisdictions?: Array<{
    code: string;
    name: string;
    flag: string;
    legislation?: {
      name: string;
      yearEnacted: number;
      status: string;
      officialUrl: string | null;
    };
    licensingAuthority?: { name: string; website: string };
    insurance?: {
      mandatory: boolean;
      minimumCoverage: string | null;
      liabilityRegime: string;
      liabilityCap: string | null;
    };
    debris?: {
      deorbitRequired: boolean;
      deorbitTimeline: string | null;
      passivationRequired: boolean;
      collisionAvoidance: boolean;
    };
    timeline?: {
      typicalProcessingWeeks: { min: number; max: number };
      applicationFee: string | null;
      annualFee: string | null;
    };
    euSpaceAct?: { relationship: string; description: string };
    notes?: string[];
    lastUpdated?: string;
  }>;
  unknown?: string[];
}

function ComparisonFull({ payload }: { payload: Record<string, unknown> }) {
  const p = payload as ComparisonFullPayload;
  const list = p.jurisdictions ?? [];

  if (list.length === 0) {
    return <p className="text-[12px] text-white/45">Keine Daten geladen.</p>;
  }

  // Define rows once so the table stays declarative. Each row knows
  // how to render its cell from a single jurisdiction.
  type J = NonNullable<ComparisonFullPayload["jurisdictions"]>[number];
  const rows: Array<{
    label: string;
    render: (j: J) => ReactNode;
  }> = [
    {
      label: "Gesetzgebung",
      render: (j) => (
        <div className="space-y-0.5">
          <div className="text-white/85">{j.legislation?.name ?? "—"}</div>
          {j.legislation?.yearEnacted && (
            <div className="text-[10px] text-white/40">
              {j.legislation.yearEnacted} ·{" "}
              <span className="capitalize">{j.legislation.status}</span>
            </div>
          )}
          {j.legislation?.officialUrl && (
            <a
              href={j.legislation.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80 hover:text-emerald-300"
            >
              Original <ExternalLink size={9} strokeWidth={1.8} />
            </a>
          )}
        </div>
      ),
    },
    {
      label: "Lizenzbehörde",
      render: (j) => (
        <div className="space-y-0.5">
          <div className="text-white/85">
            {j.licensingAuthority?.name ?? "—"}
          </div>
          {j.licensingAuthority?.website && (
            <a
              href={j.licensingAuthority.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80 hover:text-emerald-300 truncate max-w-full"
            >
              {j.licensingAuthority.website.replace(/^https?:\/\//, "")}
              <ExternalLink
                size={9}
                strokeWidth={1.8}
                className="flex-shrink-0"
              />
            </a>
          )}
        </div>
      ),
    },
    {
      label: "Versicherung",
      render: (j) =>
        j.insurance ? (
          <div className="space-y-0.5">
            <div
              className={
                j.insurance.mandatory ? "text-amber-300" : "text-white/60"
              }
            >
              {j.insurance.mandatory ? "Pflicht" : "Freiwillig"}
            </div>
            {j.insurance.minimumCoverage && (
              <div className="text-[10px] text-white/55">
                Min: {j.insurance.minimumCoverage}
              </div>
            )}
            <div className="text-[10px] text-white/45 capitalize">
              {j.insurance.liabilityRegime} liability
              {j.insurance.liabilityCap && ` · cap ${j.insurance.liabilityCap}`}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      label: "Debris-Mitigation",
      render: (j) =>
        j.debris ? (
          <div className="space-y-0.5 text-[11px]">
            <div>
              Deorbit:{" "}
              <span className={j.debris.deorbitRequired ? "" : "text-white/40"}>
                {j.debris.deorbitRequired
                  ? (j.debris.deorbitTimeline ?? "Ja")
                  : "Nein"}
              </span>
            </div>
            <div className="text-white/55">
              Passivierung: {j.debris.passivationRequired ? "✓" : "—"} ·
              Kollisionsausweich: {j.debris.collisionAvoidance ? "✓" : "—"}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      label: "Bearbeitung",
      render: (j) =>
        j.timeline ? (
          <div className="space-y-0.5 text-[11px]">
            <div>
              {j.timeline.typicalProcessingWeeks.min}–
              {j.timeline.typicalProcessingWeeks.max} Wochen
            </div>
            {j.timeline.applicationFee && (
              <div className="text-[10px] text-white/55">
                Antrag: {j.timeline.applicationFee}
              </div>
            )}
            {j.timeline.annualFee && (
              <div className="text-[10px] text-white/55">
                Jährlich: {j.timeline.annualFee}
              </div>
            )}
          </div>
        ) : (
          "—"
        ),
    },
    {
      label: "EU Space Act",
      render: (j) =>
        j.euSpaceAct ? (
          <div className="space-y-0.5">
            <div className="capitalize text-white/85">
              {j.euSpaceAct.relationship}
            </div>
            <div className="text-[10px] text-white/55 line-clamp-3">
              {j.euSpaceAct.description}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header bar with flags */}
      <div className="flex items-center gap-2 flex-wrap">
        {list.map((j) => (
          <span
            key={j.code}
            className="inline-flex items-center gap-1.5 text-[12px] text-white/90 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1"
          >
            <span aria-hidden="true">{j.flag}</span>
            <span className="font-medium">{j.code}</span>
            <span className="text-white/45 text-[10px]">{j.name}</span>
          </span>
        ))}
        {p.topic && (
          <span className="ml-auto text-[10px] text-white/45 italic">
            Fokus: {p.topic}
          </span>
        )}
      </div>

      {p.unknown && p.unknown.length > 0 && (
        <div className="text-[11px] text-amber-400/85 bg-amber-500/[0.06] border border-amber-500/20 rounded-md px-3 py-2">
          Unbekannte Codes (nicht in Atlas-Datenbank): {p.unknown.join(", ")}
        </div>
      )}

      {/* Compare table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="grid text-[12px]" style={cmpGrid(list.length)}>
          {rows.map((row, rowIdx) => (
            <ComparisonRow
              key={row.label}
              label={row.label}
              cells={list.map((j) => row.render(j))}
              isLast={rowIdx === rows.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Notes section */}
      {list.some((j) => j.notes && j.notes.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-[10px] tracking-[0.22em] uppercase text-white/45">
            Notizen
          </h3>
          <div className="space-y-2">
            {list.map((j) =>
              j.notes && j.notes.length > 0 ? (
                <div
                  key={j.code}
                  className="rounded-md bg-white/[0.025] border border-white/[0.04] px-3 py-2"
                >
                  <div className="text-[10px] tracking-wider uppercase text-white/40 mb-1">
                    {j.flag} {j.code}
                  </div>
                  <ul className="text-[11px] text-white/70 space-y-0.5 list-disc pl-4">
                    {j.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

      <div className="text-[10px] text-white/30 pt-2 border-t border-white/[0.04]">
        Quelle: Atlas Jurisdiction Database. Letzte Aktualisierung pro
        Jurisdiktion in der jeweiligen Karte.
      </div>
    </div>
  );
}

/** Renders one full row of the comparison grid: label cell + N data
 *  cells. Splits out so the row markup is declarative + the parent
 *  doesn't need to know cell-rendering details. */
function ComparisonRow({
  label,
  cells,
  isLast,
}: {
  label: string;
  cells: ReactNode[];
  isLast: boolean;
}) {
  const border = isLast ? "" : "border-b border-white/[0.05]";
  return (
    <>
      <div
        className={`px-3 py-2.5 text-[10px] tracking-[0.18em] uppercase text-white/45 bg-white/[0.02] ${border}`}
      >
        {label}
      </div>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`px-3 py-2.5 text-white/85 ${border} ${
            i < cells.length - 1 ? "border-r border-white/[0.04]" : ""
          }`}
        >
          {cell}
        </div>
      ))}
    </>
  );
}

function cmpGrid(n: number): CSSProperties {
  return { gridTemplateColumns: `120px repeat(${n}, minmax(0, 1fr))` };
}

// ─── DOCUMENT_REFERENCE full body ───────────────────────────────────
//
// Full list of all matched documents with metadata. Each row shows
// name + filename + size + version + status pill + dates + module
// + regulatory ref (when set). Expired documents get an amber stripe.

interface DocumentDetail {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  subcategory: string | null;
  status: string;
  version: number;
  issueDate: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  moduleType: string | null;
  regulatoryRef: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsFullPayload {
  query?: string | null;
  category?: string | null;
  status?: string | null;
  totalMatches?: number;
  documents?: DocumentDetail[];
}

function DocumentsFull({
  payload,
  matterId,
}: {
  payload: Record<string, unknown>;
  matterId?: string;
}) {
  const p = payload as DocumentsFullPayload;
  const docs = p.documents ?? [];

  const filterChips: Array<{ label: string; value: string }> = [];
  if (p.query) filterChips.push({ label: "Suche", value: p.query });
  if (p.category)
    filterChips.push({
      label: "Kategorie",
      value: humaniseEnumStr(p.category),
    });
  if (p.status)
    filterChips.push({ label: "Status", value: p.status.toLowerCase() });

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 text-[10px] text-white/70 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5"
            >
              <span className="text-white/40">{chip.label}:</span>
              <span>{chip.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Result count */}
      <div className="text-[11px] text-white/45">
        {docs.length === 0
          ? "Keine Dokumente"
          : `${docs.length} Dokument${docs.length === 1 ? "" : "e"}`}
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {docs.map((d) => (
          <DocumentRow key={d.id} doc={d} matterId={matterId} />
        ))}
      </div>

      {docs.length === 0 && filterChips.length > 0 && (
        <div className="text-[11px] text-white/40 italic pt-2 border-t border-white/[0.04]">
          Tipp: Filter lockern oder Claude einen breiteren Query stellen.
        </div>
      )}

      <div className="text-[10px] text-white/30 pt-2 border-t border-white/[0.04]">
        Quelle: Dokumenten-Vault des Mandanten · Zugriff via DOCUMENTS scope ·
        Audit-logged
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  matterId,
}: {
  doc: DocumentDetail;
  matterId?: string;
}) {
  const expiringSoon =
    doc.expiryDate &&
    !doc.isExpired &&
    new Date(doc.expiryDate).getTime() - Date.now() < 30 * 24 * 3600 * 1000;

  const stripeColor = doc.isExpired
    ? "border-l-amber-500/60"
    : expiringSoon
      ? "border-l-amber-500/30"
      : "border-l-transparent";

  // Download flow: hits the matter-scoped endpoint, gets a presigned
  // R2 URL with 5-min TTL, opens in a new tab. The endpoint emits
  // both an EXPORT_DOCUMENT entry on the matter hash-chain AND a
  // documentAccessLog row, so the operator can trace the download
  // from either audit view.
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    if (!matterId || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(
        `/api/network/matter/${matterId}/documents/${doc.id}/download`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Surface the typed code if the server provided one — gives
        // the user actionable signal (e.g. "Scope amendment needed").
        const msg =
          json.code === "SCOPE_INSUFFICIENT"
            ? "Kein EXPORT-Scope auf DOCUMENTS — Erweiterung anfragen."
            : json.code === "ACCESS_LEVEL_FORBIDDEN"
              ? "Klassifizierung verbietet cross-org Download."
              : (json.error ?? "Download fehlgeschlagen");
        setDownloadError(msg);
        return;
      }
      // Open in a new tab — same-tab would replace the workspace.
      window.open(json.downloadUrl as string, "_blank", "noopener");
    } catch (err) {
      setDownloadError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className={`rounded-lg bg-white/[0.02] border border-white/[0.06] border-l-2 ${stripeColor} px-3.5 py-3`}
    >
      <div className="flex items-start gap-2.5">
        <FileText
          size={13}
          strokeWidth={1.8}
          className="text-white/55 mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-white truncate">
                {doc.name}
              </div>
              <div className="text-[10px] text-white/45 truncate font-mono">
                {doc.fileName}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <StatusPill status={doc.status} />
              {matterId && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="ml-1 p-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Herunterladen (presigned 5-min URL)"
                  aria-label="Dokument herunterladen"
                >
                  {downloading ? (
                    <Loader2
                      size={11}
                      strokeWidth={2}
                      className="animate-spin"
                    />
                  ) : (
                    <Download size={11} strokeWidth={1.8} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[10px] text-white/45 flex-wrap">
            <span className="capitalize">{humaniseEnumStr(doc.category)}</span>
            {doc.subcategory && (
              <>
                <span>·</span>
                <span>{doc.subcategory}</span>
              </>
            )}
            <span>·</span>
            <span>{formatBytesStr(doc.fileSize)}</span>
            <span>·</span>
            <span>v{doc.version}</span>
            {doc.regulatoryRef && (
              <>
                <span>·</span>
                <span className="text-emerald-300/70 font-mono">
                  {doc.regulatoryRef}
                </span>
              </>
            )}
          </div>

          {/* Dates row */}
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span>
              Aktualisiert{" "}
              {new Date(doc.updatedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            {doc.issueDate && (
              <>
                <span>·</span>
                <span>
                  Ausgestellt{" "}
                  {new Date(doc.issueDate).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
            {doc.expiryDate && (
              <>
                <span>·</span>
                <span
                  className={
                    doc.isExpired
                      ? "text-amber-400 font-medium"
                      : expiringSoon
                        ? "text-amber-400/80"
                        : ""
                  }
                >
                  {doc.isExpired ? "Abgelaufen" : "Läuft ab"}{" "}
                  {new Date(doc.expiryDate).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </div>

          {doc.isExpired && (
            <div className="text-[10px] text-amber-400 inline-flex items-center gap-1 mt-0.5">
              <AlertTriangle size={9} strokeWidth={1.8} />
              Dokument ist abgelaufen — eventuell nicht mehr gültig
            </div>
          )}

          {downloadError && (
            <div className="text-[10px] text-red-400 inline-flex items-center gap-1 mt-1">
              <AlertTriangle size={9} strokeWidth={1.8} />
              {downloadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE" || status === "APPROVED"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : status === "EXPIRED" || status === "SUPERSEDED"
        ? "bg-slate-500/10 text-slate-400 ring-slate-500/30"
        : status === "DRAFT"
          ? "bg-white/[0.04] text-white/55 ring-white/10"
          : "bg-amber-500/10 text-amber-300 ring-amber-500/30";
  return (
    <span
      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ${tone} flex-shrink-0`}
    >
      {status.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

function humaniseEnumStr(s: string): string {
  if (!s) return "";
  const lower = s.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatBytesStr(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
