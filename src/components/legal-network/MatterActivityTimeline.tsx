"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * MatterActivityTimeline — human-readable activity feed for a matter.
 *
 * Phase AA: turn the previously terse forensic audit-log into a
 * Tagesübersicht the operator can actually scan. Same data source
 * (`/api/network/matter/:id/access-log`), same hash-chain verification,
 * but rendered as:
 *
 *   - Day-grouped entries (Heute / Gestern / Wochentag, TT.MM.)
 *   - Friendly action labels in DE
 *   - Action-category icons (FileText, Shield, BookOpen, AlertOctagon, etc.)
 *   - Side-aware actor label — for the operator, ATLAS = "Kanzlei";
 *     for the lawyer, CAELEX = "Operator". Makes the feed feel personal,
 *     not generic.
 *   - Context preview when available (fileName for EXPORT_DOCUMENT, tool
 *     name for SUMMARY_GENERATED, etc.)
 *   - Per-category filter dropdown
 *   - Collapsible "Hash-Chain Details" footer for compliance audits.
 *
 * The forensic chain-validation badge (chain verified / chain broken)
 * stays prominent in the header — that's the security trust signal.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import {
  FileText,
  Shield,
  BookOpen,
  AlertOctagon,
  Download,
  Sparkles,
  PenLine,
  XCircle,
  Pause,
  Play,
  ListFilter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  action: string;
  actorOrgId: string;
  actorUserId: string | null;
  actorSide: "ATLAS" | "CAELEX";
  resourceType: string;
  resourceId: string | null;
  matterScope: string;
  context: unknown;
  createdAt: string;
  previousHash: string | null;
  entryHash: string;
}

export interface AuditPayload {
  entries: ActivityEntry[];
  chainValid: boolean;
  verifications: Array<{ id: string; valid: boolean; reason?: string }>;
}

interface Props {
  audit: AuditPayload | null;
  viewerSide: "ATLAS" | "CAELEX";
}

// ─── Action metadata ──────────────────────────────────────────────
//
// Centralises icon + label + filter-category for every LegalMatterAction
// enum value. Adding a new action enum elsewhere fails type-check here
// because the Record is exhaustive on the literal-union of action names.

type ActionMeta = {
  label: string;
  icon: typeof FileText;
  category:
    | "documents"
    | "compliance"
    | "authorizations"
    | "timeline"
    | "memos"
    | "lifecycle";
};

const ACTION_META: Record<string, ActionMeta> = {
  READ_DOCUMENT: {
    label: "Dokument geöffnet",
    icon: FileText,
    category: "documents",
  },
  EXPORT_DOCUMENT: {
    label: "Dokument heruntergeladen",
    icon: Download,
    category: "documents",
  },
  READ_ASSESSMENT: {
    label: "Compliance-Bewertung gelesen",
    icon: Shield,
    category: "compliance",
  },
  SUMMARY_GENERATED: {
    label: "Zusammenfassung erstellt",
    icon: Sparkles,
    category: "compliance",
  },
  READ_AUTHORIZATION: {
    label: "Genehmigung gelesen",
    icon: BookOpen,
    category: "authorizations",
  },
  READ_TIMELINE: {
    label: "Zeitleiste geöffnet",
    icon: BookOpen,
    category: "timeline",
  },
  READ_INCIDENT: {
    label: "Vorfall gelesen",
    icon: AlertOctagon,
    category: "timeline",
  },
  MEMO_DRAFTED: {
    label: "Memo verfasst",
    icon: PenLine,
    category: "memos",
  },
  MATTER_REVOKED: {
    label: "Mandat widerrufen",
    icon: XCircle,
    category: "lifecycle",
  },
  MATTER_SUSPENDED: {
    label: "Mandat pausiert",
    icon: Pause,
    category: "lifecycle",
  },
  MATTER_RESUMED: {
    label: "Mandat fortgesetzt",
    icon: Play,
    category: "lifecycle",
  },
  SCOPE_AMENDED: {
    label: "Scope geändert",
    icon: ListFilter,
    category: "lifecycle",
  },
};

const CATEGORY_LABELS: Record<ActionMeta["category"], string> = {
  documents: "Dokumente",
  compliance: "Compliance",
  authorizations: "Genehmigungen",
  timeline: "Zeitleiste & Vorfälle",
  memos: "Memos",
  lifecycle: "Lifecycle",
};

// ─── Helpers ──────────────────────────────────────────────────────

/** "Heute · Donnerstag, 25. April" / "Gestern" / "Mo., 23. April 2026" */
function formatDayHeader(d: Date, now: Date): string {
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000),
  );
  if (dayDiff === 0) {
    return `Heute · ${d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })}`;
  }
  if (dayDiff === 1) {
    return `Gestern · ${d.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    })}`;
  }
  // Within current year: omit year. Otherwise include.
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Side-aware actor label. The viewer's own side reads as "Sie", the
 *  counterparty reads as their role. Makes the timeline feel personal
 *  for whichever party is reading. */
function actorLabel(
  entrySide: "ATLAS" | "CAELEX",
  viewerSide: "ATLAS" | "CAELEX",
): string {
  if (entrySide === viewerSide) return "Sie";
  return entrySide === "ATLAS" ? "Kanzlei" : "Operator";
}

/** Pulls a human preview out of the context JSON. Best-effort: tries
 *  fileName, title, query, then falls back to the resource type. */
function contextPreview(context: unknown, resourceType: string): string | null {
  if (!context || typeof context !== "object") return null;
  const c = context as Record<string, unknown>;
  if (typeof c.fileName === "string" && c.fileName) return c.fileName;
  if (typeof c.title === "string" && c.title) return c.title;
  if (typeof c.query === "string" && c.query) return `„${c.query}"`;
  // resourceType is informative when nothing else fits, e.g. "Document",
  // "CybersecurityAssessment", etc.
  return resourceType || null;
}

// ─── Component ────────────────────────────────────────────────────

export function MatterActivityTimeline({ audit, viewerSide }: Props) {
  // Filter state — "all" by default. Filter pulls from action category,
  // not the matterScope, because actions map more directly to user
  // mental model ("show me documents" vs "show me DOCUMENTS scope").
  const [filter, setFilter] = useState<ActionMeta["category"] | "all">("all");
  const [showHashes, setShowHashes] = useState(false);

  // Reverse-chronological for human reading. The API returns ascending
  // for hash-chain verification correctness.
  const sorted = useMemo(() => {
    if (!audit) return [];
    return [...audit.entries].reverse();
  }, [audit]);

  // Apply filter then group by day. Memoised so toggling chain-detail
  // doesn't recompute the heavy work.
  const grouped = useMemo(() => {
    const filtered =
      filter === "all"
        ? sorted
        : sorted.filter((e) => ACTION_META[e.action]?.category === filter);

    const out = new Map<string, ActivityEntry[]>();
    const now = new Date();
    for (const e of filtered) {
      const d = new Date(e.createdAt);
      const dayKey = formatDayHeader(d, now);
      const arr = out.get(dayKey);
      if (arr) arr.push(e);
      else out.set(dayKey, [e]);
    }
    return Array.from(out.entries());
  }, [sorted, filter]);

  // Loading state — keep the skeleton matching the eventual layout so
  // the section doesn't reflow when data arrives.
  if (!audit) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500 mb-3">
          Aktivität
        </h2>
        <div className="text-sm text-slate-400 animate-pulse">lade log…</div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      {/* Header: title + chain badge + filter */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-500">
            Aktivität
          </h2>
          <span className="text-[10px] text-slate-400">
            {audit.entries.length}{" "}
            {audit.entries.length === 1 ? "Eintrag" : "Einträge"}
          </span>
          <span
            title={
              audit.chainValid
                ? "Hash-Chain auf Read verifiziert"
                : "Hash-Chain konnte nicht verifiziert werden"
            }
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              audit.chainValid
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {audit.chainValid ? "Chain verified" : "Chain broken"}
          </span>
        </div>

        {audit.entries.length > 0 && (
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as ActionMeta["category"] | "all")
            }
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="all">Alle Aktionen</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <option key={cat} value={cat}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state — distinguish "no entries at all" from "filter excluded everything". */}
      {audit.entries.length === 0 ? (
        <div className="text-xs text-slate-500 py-2">
          Noch keine Aktivität — die Kanzlei hat das Mandat noch nicht eröffnet.
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-slate-500 py-2">
          Keine Einträge in dieser Kategorie.
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dayHeader, entries]) => (
            <DayGroup
              key={dayHeader}
              dayHeader={dayHeader}
              entries={entries}
              viewerSide={viewerSide}
              showHashes={showHashes}
            />
          ))}
        </div>
      )}

      {/* Hash-detail toggle — surfaced only when there's data. The
          forensic detail is opt-in to keep daily oversight clean. */}
      {audit.entries.length > 0 && (
        <button
          onClick={() => setShowHashes((s) => !s)}
          className="mt-4 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1"
        >
          {showHashes ? (
            <>
              <ChevronUp size={12} /> Hash-Chain ausblenden
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Hash-Chain anzeigen
            </>
          )}
        </button>
      )}
    </section>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────

function DayGroup({
  dayHeader,
  entries,
  viewerSide,
  showHashes,
}: {
  dayHeader: string;
  entries: ActivityEntry[];
  viewerSide: "ATLAS" | "CAELEX";
  showHashes: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wide uppercase text-slate-400 mb-2">
        {dayHeader}
      </div>
      <ul className="space-y-1">
        {entries.map((e) => (
          <ActivityRow
            key={e.id}
            entry={e}
            viewerSide={viewerSide}
            showHash={showHashes}
          />
        ))}
      </ul>
    </div>
  );
}

function ActivityRow({
  entry,
  viewerSide,
  showHash,
}: {
  entry: ActivityEntry;
  viewerSide: "ATLAS" | "CAELEX";
  showHash: boolean;
}) {
  const meta = ACTION_META[entry.action] ?? {
    label: entry.action.toLowerCase().replace(/_/g, " "),
    icon: FileText,
    category: "compliance" as const,
  };
  const Icon = meta.icon;
  const preview = contextPreview(entry.context, entry.resourceType);
  const time = formatTime(new Date(entry.createdAt));
  const actor = actorLabel(entry.actorSide, viewerSide);

  // EXPORT_DOCUMENT and MATTER_REVOKED are the two "loud" actions — give
  // them an amber/red tint respectively. Everything else stays neutral.
  const accentColor =
    entry.action === "MATTER_REVOKED"
      ? "text-red-500"
      : entry.action === "EXPORT_DOCUMENT"
        ? "text-amber-500"
        : "text-slate-400";

  return (
    <li className="group flex items-start gap-3 py-1.5 text-sm">
      <div className={`pt-0.5 flex-shrink-0 ${accentColor}`}>
        <Icon size={14} strokeWidth={1.7} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-slate-800 dark:text-slate-200">
            {meta.label}
          </span>
          {preview && (
            <span className="text-xs text-slate-500 truncate max-w-md">
              · {preview}
            </span>
          )}
        </div>
        {showHash && (
          <div className="mt-0.5 text-[10px] text-slate-400 font-mono break-all">
            {entry.entryHash.slice(0, 16)}…
          </div>
        )}
      </div>
      <div className="flex flex-col items-end flex-shrink-0 text-[10px] text-slate-400 tabular-nums">
        <span>{time}</span>
        <span
          className={`font-medium ${
            entry.actorSide === viewerSide
              ? "text-slate-500 dark:text-slate-500"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {actor}
        </span>
      </div>
    </li>
  );
}
