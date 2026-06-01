"use client";

/**
 * Unified Documents smart-filter table (UI Phase 3D).
 *
 * Server component (`../page.tsx`) aggregates all 8 Trade document types
 * via `listUnifiedDocuments(orgId)` and passes the flat, pre-sorted rows
 * down. This client wrapper owns ONLY ephemeral UI state — the search box,
 * the type-filter pills, and the expiry filter — then renders the shared
 * `TradeTable<UnifiedTradeDocumentRow>` (sortable, dense, sticky-header,
 * with the global density toggle).
 *
 * No data fetching here: the rows are static props. Filtering is pure
 * in-memory derivation over the props array.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileStack, CalendarClock, AlertTriangle } from "lucide-react";
import { TradeTable, type TradeColumn } from "../../_components/TradeTable";
import {
  type UnifiedTradeDocumentRow,
  type UnifiedDocType,
  type UnifiedStatusTone,
  type ExpiryBucket,
  DOC_TYPE_LABELS,
} from "@/lib/trade/unified-documents";

interface UnifiedDocumentsTableProps {
  rows: UnifiedTradeDocumentRow[];
  summary: { total: number; expiringSoon: number; expired: number };
}

// All 8 type keys in display order — drives the filter pills.
const DOC_TYPE_ORDER: ReadonlyArray<UnifiedDocType> = [
  "EUC",
  "REEXPORT",
  "VSD",
  "SAMMEL",
  "FRANCE_LOS",
  "UK_ECJU",
  "FAA_AST",
  "DEEMED",
];

/** Tone → badge class pair. Mirrors the slate/indigo/amber/red/emerald
 *  vocabulary already used by the per-type list panels so the merged view
 *  reads consistently with the dedicated pages. */
const TONE_CLASS: Readonly<Record<UnifiedStatusTone, string>> = {
  positive: "bg-emerald-100 text-emerald-700",
  progress: "bg-slate-200 text-slate-700",
  pending: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
  neutral: "bg-slate-200 text-slate-500",
};

/** Expiry bucket → the "Gültig bis" cell colour. */
const EXPIRY_CLASS: Readonly<Record<ExpiryBucket, string>> = {
  none: "text-trade-text-muted",
  later: "text-trade-text-secondary",
  soon: "text-amber-600 font-medium",
  expired: "text-red-600 font-medium",
};

type ExpiryFilter = "all" | "soon" | "expired";

export function UnifiedDocumentsTable({
  rows,
  summary,
}: UnifiedDocumentsTableProps) {
  const [search, setSearch] = useState("");
  // Empty Set = all types. Otherwise only the selected types are shown.
  const [typeFilter, setTypeFilter] = useState<Set<UnifiedDocType>>(new Set());
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");

  const toggleType = (t: UnifiedDocType) =>
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // Only show pills for types that actually have ≥1 row — an empty
  // jurisdiction shouldn't add noise to the toolbar.
  const presentTypes = useMemo(() => {
    const present = new Set(rows.map((r) => r.docType));
    return DOC_TYPE_ORDER.filter((t) => present.has(t));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter.size > 0 && !typeFilter.has(r.docType)) return false;
      if (expiryFilter === "soon" && r.expiryBucket !== "soon") return false;
      if (expiryFilter === "expired" && r.expiryBucket !== "expired")
        return false;
      if (q) {
        const haystack =
          `${r.title} ${r.subtitle} ${r.reference ?? ""} ${r.typeLabel} ${r.statusLabel}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, typeFilter, expiryFilter]);

  const columns: TradeColumn<UnifiedTradeDocumentRow>[] = [
    {
      key: "typeLabel",
      header: "Typ",
      sortBy: (r) => r.typeLabel,
      render: (r) => (
        <span className="inline-flex items-center rounded bg-trade-bg-elevated px-1.5 py-0.5 text-[11px] font-medium text-trade-text-secondary ring-1 ring-trade-border-subtle">
          {r.typeLabel}
        </span>
      ),
    },
    {
      key: "title",
      header: "Dokument",
      sortBy: (r) => r.title.toLowerCase(),
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-trade-text-primary">
            {r.title}
          </div>
          {r.subtitle && (
            <div className="truncate text-[11px] text-trade-text-muted">
              {r.subtitle}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "reference",
      header: "Referenz",
      sortBy: (r) => r.reference ?? "",
      render: (r) =>
        r.reference ? (
          <span className="font-mono text-[11.5px] text-trade-text-secondary">
            {r.reference}
          </span>
        ) : (
          <span className="text-[12px] text-trade-text-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortBy: (r) => r.statusLabel,
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${TONE_CLASS[r.statusTone]}`}
        >
          {r.statusLabel}
        </span>
      ),
    },
    {
      key: "validUntil",
      header: "Gültig bis",
      sortBy: (r) => r.validUntil ?? "",
      render: (r) => (
        <span className={`text-[12px] ${EXPIRY_CLASS[r.expiryBucket]}`}>
          {r.validUntil ? r.validUntil.slice(0, 10) : "—"}
          {r.expiryBucket === "expired" && " · abgelaufen"}
          {r.expiryBucket === "soon" && " · bald"}
        </span>
      ),
    },
  ];

  const filterSlot = (
    <>
      <button
        type="button"
        onClick={() => setTypeFilter(new Set())}
        aria-pressed={typeFilter.size === 0}
        className={pillClass(typeFilter.size === 0)}
      >
        Alle Typen
      </button>
      {presentTypes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => toggleType(t)}
          aria-pressed={typeFilter.has(t)}
          className={pillClass(typeFilter.has(t))}
        >
          {DOC_TYPE_LABELS[t]}
        </button>
      ))}

      {/* Expiry smart-filters — only meaningful when such rows exist. */}
      {summary.expiringSoon > 0 && (
        <button
          type="button"
          onClick={() =>
            setExpiryFilter((f) => (f === "soon" ? "all" : "soon"))
          }
          aria-pressed={expiryFilter === "soon"}
          className={`inline-flex items-center gap-1 ${pillClass(expiryFilter === "soon")}`}
        >
          <CalendarClock className="h-3 w-3" />
          Bald fällig ({summary.expiringSoon})
        </button>
      )}
      {summary.expired > 0 && (
        <button
          type="button"
          onClick={() =>
            setExpiryFilter((f) => (f === "expired" ? "all" : "expired"))
          }
          aria-pressed={expiryFilter === "expired"}
          className={`inline-flex items-center gap-1 ${pillClass(expiryFilter === "expired")}`}
        >
          <AlertTriangle className="h-3 w-3" />
          Abgelaufen ({summary.expired})
        </button>
      )}
    </>
  );

  return (
    <TradeTable<UnifiedTradeDocumentRow>
      rows={filtered}
      columns={columns}
      getRowId={(r) => r.rowKey}
      rowHref={(r) => r.href}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Dokumente durchsuchen…",
      }}
      filters={filterSlot}
      resultCount={filtered.length}
      emptyState={<UnifiedEmptyState hasAny={rows.length > 0} />}
    />
  );
}

function pillClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
    active
      ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
      : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
  }`;
}

function UnifiedEmptyState({ hasAny }: { hasAny: boolean }) {
  // Two distinct empties: "no documents at all" vs "filters hid them all".
  if (hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-trade-border-subtle px-6 py-10 text-center text-[13px] text-trade-text-muted">
        Keine Dokumente passen zu den aktiven Filtern.
      </div>
    );
  }
  // Read-only hub: no inline create here — point to the EUC workflow as
  // the natural first document. The launcher grid above lists every type.
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-trade-border-subtle px-6 py-12 text-center">
      <FileStack className="h-7 w-7 text-trade-text-muted" />
      <h3 className="mt-3 text-[14px] font-semibold text-trade-text-primary">
        Noch keine Dokumente
      </h3>
      <p className="mt-1 max-w-md text-[12.5px] text-trade-text-muted">
        Genehmigungen und Nachweise aus allen Modulen erscheinen hier
        automatisch, sobald du sie anlegst — EUCs, Re-Export-Zustimmungen,
        Selbstanzeigen, Sammelgenehmigungen und Lizenzen für FR / UK / US.
      </p>
      <Link
        href="/trade/euc"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-trade-accent-strong"
      >
        Erstes End-Use Certificate anlegen
      </Link>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
