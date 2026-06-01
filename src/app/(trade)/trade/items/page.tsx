"use client";

/**
 * /trade/items — Trade Item list (Sprint A1, Indigo light-theme port).
 *
 * Ported from /dashboard/trade/items/page.tsx (the legacy dark-themed
 * Sprint-B7 implementation). Functionality unchanged: searchable table
 * of TradeItems with status badges + classification-code pills, inline
 * "New Item" form posting to /api/trade/items.
 *
 * What changed in the port:
 *   - All hard-coded rgba(255,255,255,...) tokens replaced with the
 *     `--trade-*` token palette via Tailwind classes — page renders
 *     correctly under TradeShell's light Indigo theme
 *   - Emerald CTA → Indigo (`bg-trade-accent`)
 *   - Detail-page links now point at /trade/items/[id] (not
 *     /dashboard/trade/items/[id])
 *   - Breadcrumb root link points at /trade (not /dashboard/trade)
 *
 * API contract is identical — `/api/trade/items` and the response
 * shape (TradeItemSummary[]) are shared with the legacy world during
 * the Phase-A migration window.
 *
 * UI Phase 3A: bespoke list replaced with TradeTable<TradeItemSummary>.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  ScanSearch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Archive,
  Loader2,
  Info,
  X,
  Users,
  type LucideIcon,
} from "lucide-react";
import { humanizeEnum } from "@/lib/trade/format";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { buildCsv, downloadCsv } from "@/lib/trade/csv-export";
import { useToast } from "@/components/ui/Toast";
import { Download } from "lucide-react";
import {
  DatasheetDropzone,
  type DatasheetApplyPayload,
} from "../_components/DatasheetDropzone";
import { TradeTable, type TradeColumn } from "../_components/TradeTable";

// ─── Types ────────────────────────────────────────────────────────────

type TradeItemStatus = "DRAFT" | "CLASSIFIED" | "REQUIRES_REVIEW" | "ARCHIVED";

interface TradeItemSummary {
  id: string;
  name: string;
  internalSku: string | null;
  manufacturerName: string | null;
  description: string;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  mtcrCategory: string | null;
  germanAlEntry: string | null;
  status: TradeItemStatus;
  classificationSource: string;
  classifiedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface ApiResponse {
  items: TradeItemSummary[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── Status badge ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TradeItemStatus,
  {
    label: string;
    className: string;
    Icon: LucideIcon;
  }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "bg-trade-bg-subtle text-trade-text-muted ring-1 ring-trade-border-subtle",
    Icon: Clock,
  },
  CLASSIFIED: {
    label: "Classified",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    Icon: CheckCircle2,
  },
  REQUIRES_REVIEW: {
    label: "Review",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    Icon: AlertTriangle,
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-trade-bg-subtle text-trade-text-muted ring-1 ring-trade-border-subtle opacity-70",
    Icon: Archive,
  },
};

function StatusBadge({ status }: { status: TradeItemStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${cfg.className}`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ─── Code pill ────────────────────────────────────────────────────────

function CodePill({ code, isItar }: { code: string; isItar?: boolean }) {
  return (
    <span
      className={
        isItar
          ? "rounded px-1.5 py-0.5 font-mono text-[10px] bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
          : "rounded px-1.5 py-0.5 font-mono text-[10px] bg-trade-bg-subtle text-trade-text-secondary ring-1 ring-trade-border-subtle"
      }
    >
      {code}
    </span>
  );
}

// ─── New Item form (inline) ───────────────────────────────────────────

function NewItemForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (item: TradeItemSummary) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<DatasheetApplyPayload | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/trade/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          internalSku: sku.trim() || undefined,
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to create item");
      }
      const { item } = await res.json();

      // Additive: if a datasheet suggested a code, apply the top one. The
      // create flow is never blocked — any failure falls through to the
      // plain onSuccess(item) below so manual classification stays available.
      const top = applied?.suggestions[0];
      if (top && item?.id) {
        try {
          const regime = top.regime?.toUpperCase() ?? "";
          let codePatch: Record<string, string>;
          if (regime.includes("USML")) {
            codePatch = { usmlCategory: top.code };
          } else if (regime.includes("EAR") || regime.includes("CCL")) {
            codePatch = { eccnUS: top.code };
          } else {
            codePatch = { eccnEU: top.code };
          }
          const patchRes = await fetch(`/api/trade/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(codePatch),
          });
          if (patchRes.ok) {
            const { item: classified } = await patchRes.json();
            onSuccess(classified);
            return;
          }
        } catch {
          // fall through — item is created, code can be set manually
        }
      }
      onSuccess(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-trade-text-primary">
            New Trade Item
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <DatasheetDropzone onApply={setApplied} />
          {applied?.suggestions[0] && (
            <p className="text-[12px] text-trade-text-muted">
              Übernommen:{" "}
              <span className="font-medium text-trade-text-primary">
                {applied.suggestions[0].code}
              </span>{" "}
              — wird beim Anlegen gesetzt.
            </p>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-trade-text-secondary">
              Name *
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Star Tracker ST-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-trade-text-secondary">
              Internal SKU
            </label>
            <input
              className={inputClass}
              placeholder="e.g. ST-400-Rev-C"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-trade-text-secondary">
              Description
            </label>
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              placeholder="Brief description for Astra classification…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-2 text-[12px] text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {saving ? "Creating…" : "Create Item"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] text-trade-text-secondary transition hover:text-trade-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────
// Uses the shared EmptyStateRich so the panel offers more than a dead-
// end "Add first item" — see U-HIGH-4 in MEVA-UX-WCAG-WORKLIST.md for
// why this matters for first-task completion.

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <EmptyStateRich
      icon={ScanSearch}
      title="No trade items yet"
      description="Add your first item — a component, sub-assembly, or product — and Caelex will classify it against ECCN, USML, EU Annex I, MTCR, and your national export list in one pass."
      primaryAction={{ label: "New item", onClick: onNew }}
      astra={{
        label: "Ask Astra how to classify",
        prefill:
          "How should I classify a new trade item? Walk me through the multi-jurisdiction process — ECCN, USML, EU Annex I, MTCR, and the German Ausfuhrliste.",
      }}
      secondaryActions={[
        {
          label: "Browse counterparties",
          href: "/trade/parties",
          icon: Users,
        },
      ]}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function TradeItemsPage() {
  const [items, setItems] = useState<TradeItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // U-HIGH-5 MVP: status filter went from single-select to multi-
  // select. Empty Set = "show all statuses". Toggle pills add/remove
  // entries; the API receives a comma-joined list.
  const [statusFilter, setStatusFilter] = useState<Set<TradeItemStatus>>(
    new Set(),
  );
  const toggleStatusFilter = useCallback((status: TradeItemStatus) => {
    setStatusFilter((prev) => {
      const out = new Set(prev);
      if (out.has(status)) out.delete(status);
      else out.add(status);
      return out;
    });
  }, []);
  const clearStatusFilter = useCallback(() => setStatusFilter(new Set()), []);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  // U-CRIT-5: bulk-select state. `selectedIds` is a Set for O(1)
  // membership checks during render. Cleared whenever the filter
  // changes so a fresh result set doesn't carry stale selections.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      // Multi-status: send a comma-joined list. The existing API still
      // accepts the legacy single-status param; when N statuses are
      // selected we currently fetch and client-filter (the server side
      // can be upgraded later — list pages cap at ~100 rows so client
      // filtering is acceptable for the MVP window).
      if (statusFilter.size === 1) {
        // Single selection — use the existing single-status server path
        // for backward compatibility with the existing API route.
        params.set("status", Array.from(statusFilter)[0]);
      }
      const res = await fetch(`/api/trade/items?${params}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data: ApiResponse = await res.json();
      // Client-filter when multi-select is in play (server only supports
      // single-status today). For zero-select / single-select the server
      // already filtered correctly.
      const filtered =
        statusFilter.size > 1
          ? data.items.filter((i) => statusFilter.has(i.status))
          : data.items;
      setItems(filtered);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Clear stale selection when the filter / search changes — otherwise
  // rows the user can no longer see would still be "selected".
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter]);

  const handleNewSuccess = (item: TradeItemSummary) => {
    setItems((prev) => [item, ...prev]);
    setTotal((t) => t + 1);
    setShowNew(false);
  };

  /** Build a CSV of the currently-selected items + trigger download. */
  const handleExportSelected = () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) {
      toast.warning("Nothing to export", "Select at least one item first.");
      return;
    }
    const csv = buildCsv(selectedItems, [
      { header: "ID", get: (i) => i.id },
      { header: "Name", get: (i) => i.name },
      { header: "SKU", get: (i) => i.internalSku },
      { header: "Manufacturer", get: (i) => i.manufacturerName },
      { header: "Status", get: (i) => i.status },
      { header: "ECCN (EU)", get: (i) => i.eccnEU },
      { header: "ECCN (US/CCL)", get: (i) => i.eccnUS },
      { header: "USML category", get: (i) => i.usmlCategory },
      { header: "MTCR category", get: (i) => i.mtcrCategory },
      { header: "DE-AL entry", get: (i) => i.germanAlEntry },
      { header: "Classification source", get: (i) => i.classificationSource },
      { header: "Classified at", get: (i) => i.classifiedAt },
      { header: "Created at", get: (i) => i.createdAt },
    ]);
    downloadCsv("caelex-trade-items", csv);
    toast.success(
      "Export started",
      `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} downloaded as CSV.`,
    );
  };

  // ─── Column definitions ──────────────────────────────────────────────
  // Each column ports the exact visuals from the former ItemRow.

  const columns: TradeColumn<TradeItemSummary>[] = [
    {
      key: "name",
      header: "Name / SKU",
      sortBy: (i) => i.name.toLowerCase(),
      render: (i) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-trade-text-primary">
              {i.name}
            </span>
            {i.internalSku && (
              <span className="font-mono text-[11px] text-trade-text-muted">
                {i.internalSku}
              </span>
            )}
          </div>
          {i.manufacturerName && (
            <p className="mt-0.5 text-[11px] text-trade-text-muted">
              {i.manufacturerName}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortBy: (i) => i.status,
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "codes",
      header: "Codes",
      render: (i) => {
        const hasClassification =
          i.eccnEU ||
          i.eccnUS ||
          i.usmlCategory ||
          i.mtcrCategory ||
          i.germanAlEntry;
        if (!hasClassification)
          return <span className="text-trade-text-muted">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {i.eccnEU && <CodePill code={`EU: ${i.eccnEU}`} />}
            {i.eccnUS && <CodePill code={`CCL: ${i.eccnUS}`} />}
            {i.usmlCategory && (
              <CodePill code={`USML: ${i.usmlCategory}`} isItar />
            )}
            {i.mtcrCategory && <CodePill code={`MTCR: ${i.mtcrCategory}`} />}
            {i.germanAlEntry && <CodePill code={`DE-AL: ${i.germanAlEntry}`} />}
          </div>
        );
      },
    },
  ];

  // ─── Filter pills (passed as `filters` slot) ─────────────────────────

  const filterSlot = (
    <>
      <button
        key="__all"
        onClick={clearStatusFilter}
        aria-pressed={statusFilter.size === 0}
        className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
          statusFilter.size === 0
            ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
            : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
        }`}
      >
        All
      </button>
      {(["DRAFT", "CLASSIFIED", "REQUIRES_REVIEW", "ARCHIVED"] as const).map(
        (s) => {
          const active = statusFilter.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatusFilter(s)}
              aria-pressed={active}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                active
                  ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
                  : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
              }`}
            >
              {humanizeEnum(s)}
            </button>
          );
        },
      )}
      {statusFilter.size > 1 ? (
        <span className="text-[11px] text-trade-text-muted">
          {statusFilter.size} statuses selected
        </span>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto max-w-screen-lg px-8 py-8">
      {/* Header */}
      <header className="mb-7 flex items-end justify-between gap-6 border-b border-trade-border-subtle pb-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-trade-text-muted">
            <Link
              href="/trade"
              className="transition hover:text-trade-text-primary"
            >
              Trade Operations
            </Link>
            <span>/</span>
            <span className="text-trade-text-secondary">Items</span>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-trade-text-primary">
            Item Classification
          </h1>
          <p className="mt-1 text-[13px] text-trade-text-secondary">
            {total > 0
              ? `${total} item${total !== 1 ? "s" : ""} — multi-jurisdiction export classification`
              : "Multi-jurisdiction export classification per BoM line item"}
          </p>
        </div>

        {!showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="flex shrink-0 items-center gap-2 rounded-md bg-trade-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong"
          >
            <Plus className="h-4 w-4" />
            New Item
          </button>
        )}
      </header>

      {/* New item form */}
      {showNew && (
        <div className="mb-6">
          <NewItemForm
            onSuccess={handleNewSuccess}
            onCancel={() => setShowNew(false)}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
          <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* TradeTable — owns toolbar (search + filter pills), sticky sortable
          headers, selection checkboxes, and BulkActionsBar. */}
      <TradeTable<TradeItemSummary>
        rows={items}
        columns={columns}
        getRowId={(i) => i.id}
        rowHref={(i) => `/trade/items/${i.id}`}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkNoun="item"
        bulkActions={
          <button
            type="button"
            onClick={handleExportSelected}
            className="inline-flex items-center gap-1.5 rounded-full bg-trade-accent px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        }
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search items, SKUs, codes…",
        }}
        filters={filterSlot}
        resultCount={items.length}
        loading={loading}
        emptyState={<EmptyState onNew={() => setShowNew(true)} />}
      />

      {/* Disclaimer */}
      <div className="mt-10 flex items-start gap-2.5 rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-4">
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-muted"
          strokeWidth={2}
        />
        <p
          lang="de"
          className="text-[11px] leading-relaxed text-trade-text-muted"
        >
          Caelex Trade ist ein Compliance-Werkzeug, kein Counsel. Vor jeder
          Export-Entscheidung mit qualifizierter Exportkontroll-Rechtsberatung
          verifizieren (BAFA, BIS, DDTC). AWG/EAR/ITAR-Verstöße können zu
          Freiheitsstrafen bis 20 Jahren und Bußen bis USD 1 Mio. führen.
        </p>
      </div>
    </div>
  );
}
