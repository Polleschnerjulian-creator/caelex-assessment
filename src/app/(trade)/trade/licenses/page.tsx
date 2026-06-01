"use client";

/**
 * /trade/licenses — Org-level license inventory (Sprint A4, net-new).
 *
 * Welt A never shipped a stand-alone licenses page — licenses were only
 * managed nested under operation-detail via OperationLicensesPanel.
 * Caelex Trade ships them as a first-class surface: every active /
 * pending / expired BAFA-Bescheid, BIS-Lizenz, DDTC-DSP-Series and
 * EU-AGG/EUGEA-Allgemeinerlaubnis your org holds, with drawdown vs
 * cap visualised so the operator sees AT a glance which licenses are
 * still usable for the next shipment.
 *
 * Filters: status tabs (All / Active / Pending / Draft / Expired),
 * type select (BAFA / BIS / DDTC / EU-GEA / Other), license-number
 * search.
 *
 * Rendering: each license is a card with type + number + status badge,
 * jurisdiction-group icon, validity window, and a draw-down progress
 * bar when totalCapValue is set. Expiry warnings flag licenses within
 * 90 days of validUntil (amber) or already past it (red).
 *
 * Creation: there's an "Add license" CTA that hits POST /api/trade/
 * licenses with a minimal payload (type + number). Full edit shape
 * (conditions JSON, document upload, value cap) is intentionally
 * out of scope for A4 — licenses today are created via the API or
 * indirectly via Operation Detail (A3b).
 */

import { useCallback, useEffect, useState } from "react";
import { ListSkeleton } from "../_components/Skeletons";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { BulkActionsBar } from "../_components/BulkActionsBar";
import { LicensePdfDrop } from "./_components/LicensePdfDrop";
import {
  TYPE_META,
  STATUS_META,
  STATUS_OPTIONS,
  type LicenseRow,
  type LicenseType,
  type LicenseStatus,
} from "./_components/license-types";
import { buildCsv, downloadCsv } from "@/lib/trade/csv-export";
import { useToast } from "@/components/ui/Toast";
import type { BafaBescheidExtraction } from "@/lib/trade/licenses/bafa-bescheid-types";
import {
  Search,
  Plus,
  X,
  FileCheck,
  Calendar,
  CalendarClock,
  Workflow,
  Download,
} from "lucide-react";

// ─── Component ────────────────────────────────────────────────────────

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<LicenseStatus>>(
    new Set(),
  );
  const toggleStatusFilter = useCallback((s: LicenseStatus) => {
    setStatusFilter((prev) => {
      const out = new Set(prev);
      if (out.has(s)) out.delete(s);
      else out.add(s);
      return out;
    });
  }, []);
  const clearStatusFilter = useCallback(() => setStatusFilter(new Set()), []);
  const [showNew, setShowNew] = useState(false);
  // U-CRIT-5 bulk-select state.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toast = useToast();
  const toggleSelect = useCallback((id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const out = new Set(prev);
      if (next) out.add(id);
      else out.delete(id);
      return out;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === licenses.length && licenses.length > 0)
        return new Set();
      return new Set(licenses.map((l) => l.id));
    });
  }, [licenses]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter]);

  const handleExportSelected = () => {
    const rows = licenses.filter((l) => selectedIds.has(l.id));
    if (rows.length === 0) {
      toast.warning("Nothing to export", "Select at least one license.");
      return;
    }
    const csv = buildCsv(rows, [
      { header: "ID", get: (l) => l.id },
      { header: "License number", get: (l) => l.licenseNumber },
      { header: "Type", get: (l) => l.licenseType },
      { header: "Status", get: (l) => l.status },
      { header: "Issued at", get: (l) => l.issuedAt },
      { header: "Valid until", get: (l) => l.validUntil },
      { header: "Drawn down", get: (l) => l.drawnDownValue },
      { header: "Total cap", get: (l) => l.totalCapValue },
      { header: "Cap currency", get: (l) => l.capCurrency },
      { header: "Operations attached", get: (l) => l._count.operations },
      { header: "Created at", get: (l) => l.createdAt },
    ]);
    downloadCsv("caelex-trade-licenses", csv);
    toast.success(
      "Export started",
      `${rows.length} license${rows.length === 1 ? "" : "s"} downloaded as CSV.`,
    );
  };

  const allVisibleSelected =
    licenses.length > 0 && selectedIds.size === licenses.length;
  const someVisibleSelected = selectedIds.size > 0 && !allVisibleSelected;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter.size === 1) {
      params.set("status", Array.from(statusFilter)[0]);
    }
    fetch(`/api/trade/licenses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const fetched: LicenseRow[] = data.licenses ?? [];
          setLicenses(
            statusFilter.size > 1
              ? fetched.filter((l) => statusFilter.has(l.status))
              : fetched,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter]);

  return (
    <div className="mx-auto max-w-screen-xl px-8 py-8">
      {/* Header */}
      <header className="mb-7 flex items-end justify-between gap-6 border-b border-trade-border-subtle pb-5">
        <div className="min-w-0">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            Caelex Trade /{" "}
            <span className="text-trade-text-secondary">Licenses</span>
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
            Active Licenses
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-trade-text-secondary">
            BAFA-Bescheide, BIS-Lizenzen, DDTC-DSP-Serie und EU-AGG/EUGEA-
            Allgemeinerlaubnisse mit Draw-Down-Tracking und Expiry-Warnings über
            alle Jurisdiktionen.
          </p>
        </div>
        <button
          onClick={() => setShowNew((s) => !s)}
          className={
            showNew
              ? "flex shrink-0 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 transition hover:bg-red-100"
              : "flex shrink-0 items-center gap-2 rounded-md bg-trade-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong"
          }
        >
          {showNew ? (
            <>
              <X className="h-3.5 w-3.5" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Add License
            </>
          )}
        </button>
      </header>

      {showNew && (
        <NewLicenseForm
          onCreated={(lic) => {
            setLicenses((prev) => [lic, ...prev]);
            setShowNew(false);
          }}
        />
      )}

      {/* Filters — U-HIGH-5 multi-select */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          key="__all"
          onClick={clearStatusFilter}
          aria-pressed={statusFilter.size === 0}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
            statusFilter.size === 0
              ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
              : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
          }`}
        >
          All
        </button>
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter.has(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggleStatusFilter(opt.key)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                active
                  ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
                  : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        {statusFilter.size > 1 ? (
          <span className="text-[11px] text-trade-text-muted">
            {statusFilter.size} statuses selected
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-trade-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search license number…"
            className="w-64 bg-transparent text-[13px] text-trade-text-primary outline-none placeholder:text-trade-text-muted"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <ListSkeleton rows={5} label="Loading licenses" />
      ) : licenses.length === 0 ? (
        <EmptyState onNew={() => setShowNew(true)} />
      ) : (
        <>
          <div className="mb-2 flex items-center gap-3 px-1 text-[11px] text-trade-text-muted">
            <label className="flex h-10 w-10 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someVisibleSelected;
                }}
                onChange={toggleSelectAll}
                aria-label={
                  allVisibleSelected
                    ? `Deselect all ${licenses.length} licenses`
                    : `Select all ${licenses.length} licenses`
                }
                className="h-4 w-4 accent-trade-accent"
              />
            </label>
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${licenses.length} selected`
                : `${licenses.length} license${licenses.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <ul className="space-y-3">
            {licenses.map((lic) => (
              <LicenseCard
                key={lic.id}
                license={lic}
                selected={selectedIds.has(lic.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </ul>
        </>
      )}

      <BulkActionsBar
        count={selectedIds.size}
        onClear={clearSelection}
        actions={
          <button
            type="button"
            onClick={handleExportSelected}
            className="inline-flex items-center gap-1.5 rounded-full bg-trade-accent px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        }
      />

      <p
        lang="de"
        className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted"
      >
        Licenses sind nur so gültig wie die zugrundeliegende Bescheid- oder
        License-PDF. Caelex tracked Draw-Down + Expiry — die Auslegung von
        Bedingungen (covered codes, covered countries, end-use restrictions)
        bleibt Sache des qualifizierten AVs. Vor jedem Shipment ist der
        Bescheidtext zu re-verifizieren.
      </p>
    </div>
  );
}

// ─── License card ─────────────────────────────────────────────────────

function LicenseCard({
  license,
  selected,
  onToggleSelect,
}: {
  license: LicenseRow;
  selected?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
}) {
  const typeMeta = TYPE_META[license.licenseType] ?? TYPE_META.OTHER;
  const statusMeta = STATUS_META[license.status];
  const StatusIcon = statusMeta.icon;

  // Drawdown progress (only when totalCapValue is set)
  const drawnPct =
    license.totalCapValue && license.totalCapValue > 0
      ? (license.drawnDownValue / license.totalCapValue) * 100
      : null;

  // Expiry classification
  const expiryState = computeExpiryState(license.validUntil);
  const showCheckbox = !!onToggleSelect;

  return (
    <li
      className={`rounded-md border bg-trade-bg-panel p-4 ${
        selected
          ? "border-trade-accent ring-1 ring-trade-accent/30"
          : "border-trade-border-subtle"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {showCheckbox ? (
            <label className="flex h-10 w-6 shrink-0 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => onToggleSelect!(license.id, e.target.checked)}
                aria-label={`Select license ${license.licenseNumber ?? license.licenseType}`}
                className="h-4 w-4 accent-trade-accent"
              />
            </label>
          ) : null}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <FileCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-trade-text-primary">
                {typeMeta.label}
              </span>
              <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
                {typeMeta.jurisdiction}
              </span>
              {license.licenseNumber && (
                <span className="font-mono text-[12px] text-trade-text-secondary">
                  {license.licenseNumber}
                </span>
              )}
              {expiryState && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ring-1 ${expiryState.className}`}
                  title={expiryState.title}
                >
                  <CalendarClock className="h-3 w-3" />
                  {expiryState.label}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-trade-text-muted">
              {license.issuedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Issued{" "}
                  {new Date(license.issuedAt).toLocaleDateString("en-GB")}
                </span>
              )}
              {license.validUntil && (
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Until{" "}
                  {new Date(license.validUntil).toLocaleDateString("en-GB")}
                </span>
              )}
              <span>
                {license._count.operations}{" "}
                {license._count.operations === 1 ? "operation" : "operations"}{" "}
                covered
              </span>
            </div>
          </div>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${statusMeta.className}`}
        >
          <StatusIcon className="h-3 w-3" strokeWidth={2} />
          {statusMeta.label}
        </span>
      </div>

      {/* Drawdown progress */}
      {drawnPct !== null && (
        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
            <span>Draw-Down</span>
            <span className="font-mono">
              {license.drawnDownValue.toLocaleString("en-GB", {
                maximumFractionDigits: 0,
              })}{" "}
              /{" "}
              {license.totalCapValue?.toLocaleString("en-GB", {
                maximumFractionDigits: 0,
              })}{" "}
              {license.capCurrency} · {drawnPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-trade-bg-subtle">
            <div
              className={`h-full transition-all ${
                drawnPct >= 90
                  ? "bg-red-500"
                  : drawnPct >= 70
                    ? "bg-amber-500"
                    : "bg-trade-accent"
              }`}
              style={{ width: `${Math.min(100, drawnPct).toFixed(2)}%` }}
            />
          </div>
        </div>
      )}
    </li>
  );
}

function computeExpiryState(
  validUntil: string | null,
): { label: string; className: string; title: string } | null {
  if (!validUntil) return null;
  const days = Math.floor(
    (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) {
    return {
      label: `Expired ${-days}d ago`,
      className: "bg-red-50 text-red-700 ring-red-200",
      title: `License validUntil ${validUntil}`,
    };
  }
  if (days <= 30) {
    return {
      label: `${days}d left`,
      className: "bg-red-50 text-red-700 ring-red-200",
      title: `License expires in ${days} days`,
    };
  }
  if (days <= 90) {
    return {
      label: `${days}d left`,
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      title: `License expires in ${days} days`,
    };
  }
  return null;
}

// ─── Empty state ──────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <EmptyStateRich
      icon={FileCheck}
      title="No licenses recorded yet"
      description="Add your first BAFA-Bescheid, BIS license, DDTC DSP-series authorization, or EU AGG/EUGEA so operations can attach it for draw-down tracking + expiry warnings."
      primaryAction={{ label: "Add first license", onClick: onNew }}
      astra={{
        label: "Ask Astra which license fits",
        prefill:
          "I'm exporting a controlled item. Which license should I pursue — single-shipment BAFA-Einzelgenehmigung, German AGG, BIS license, DDTC DSP-5, or an EU general authorization? Compare the options.",
      }}
      secondaryActions={[
        {
          label: "Review operations needing licenses",
          href: "/trade/operations",
          icon: Workflow,
        },
      ]}
    />
  );
}

// ─── Inline create form ───────────────────────────────────────────────

function NewLicenseForm({
  onCreated,
}: {
  onCreated: (lic: LicenseRow) => void;
}) {
  const [licenseType, setLicenseType] = useState<LicenseType>("BAFA_EINZEL");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [totalCapValue, setTotalCapValue] = useState("");
  const [capCurrency, setCapCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Pre-fill form state from a parsed BAFA-Bescheid extraction.
   *  Only overwrites fields that the PDF actually contained — empty /
   *  missing extraction-fields leave the existing form state alone, so
   *  the operator can re-upload a fresh PDF on top of partially-typed
   *  data without losing what they already entered manually. */
  const handleExtracted = (extraction: BafaBescheidExtraction) => {
    if (extraction.licenseType) {
      // BafaLicenseType ⊂ LicenseType — narrowing is safe.
      setLicenseType(extraction.licenseType as LicenseType);
    }
    if (extraction.licenseNumber) setLicenseNumber(extraction.licenseNumber);
    if (extraction.issuedAt) setIssuedAt(extraction.issuedAt);
    if (extraction.validUntil) setValidUntil(extraction.validUntil);
    if (extraction.totalCapValue !== null) {
      setTotalCapValue(String(extraction.totalCapValue));
    }
    if (extraction.capCurrency) setCapCurrency(extraction.capCurrency);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/trade/licenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          licenseType,
          licenseNumber: licenseNumber.trim() || undefined,
          issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
          validUntil: validUntil
            ? new Date(validUntil).toISOString()
            : undefined,
          totalCapValue: totalCapValue ? parseFloat(totalCapValue) : undefined,
          capCurrency: capCurrency.toUpperCase(),
          conditions: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to add license");
        return;
      }
      const lic: LicenseRow = {
        ...data.license,
        _count: { operations: 0 },
      };
      onCreated(lic);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";
  const labelClass =
    "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary";

  // Type options grouped by jurisdiction
  const typesByGroup = Object.entries(TYPE_META).reduce(
    (acc, [key, meta]) => {
      const g = meta.group;
      if (!acc[g]) acc[g] = [];
      acc[g].push({ value: key as LicenseType, label: meta.label });
      return acc;
    },
    {} as Record<string, { value: LicenseType; label: string }[]>,
  );

  return (
    <div className="mb-6">
      <LicensePdfDrop onExtracted={handleExtracted} />
      <form
        onSubmit={submit}
        className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>License type *</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value as LicenseType)}
              className={inputClass}
            >
              {Object.entries(typesByGroup).map(([group, types]) => (
                <optgroup key={group} label={group}>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>License number</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. 1AGG12-2026-001"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Issued at</label>
            <input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Valid until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Value cap</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={totalCapValue}
                onChange={(e) => setTotalCapValue(e.target.value)}
                placeholder="500000"
                className={`${inputClass} font-mono`}
              />
              <input
                type="text"
                maxLength={3}
                value={capCurrency}
                onChange={(e) => setCapCurrency(e.target.value.toUpperCase())}
                className={`${inputClass} w-20 font-mono uppercase`}
              />
            </div>
          </div>
        </div>
        {err && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {err}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create License"}
          </button>
        </div>
      </form>
    </div>
  );
}
