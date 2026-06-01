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

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
import { LicensePdfDrop } from "./_components/LicensePdfDrop";
import { LicenseRenewalModal } from "./_components/LicenseRenewalModal";
import {
  TYPE_META,
  STATUS_META,
  STATUS_OPTIONS,
  type LicenseRow,
  type LicenseType,
  type LicenseStatus,
} from "./_components/license-types";
import { deriveExpiryState } from "@/lib/trade/license-renewal";
import { buildCsv, downloadCsv } from "@/lib/trade/csv-export";
import { useToast } from "@/components/ui/Toast";
import type { BafaBescheidExtraction } from "@/lib/trade/licenses/bafa-bescheid-types";
import {
  Plus,
  X,
  FileCheck,
  CalendarClock,
  AlertTriangle,
  Workflow,
  Download,
} from "lucide-react";

// Jurisdiction groups (TYPE_META[type].group) used by the quick-filter.
type JurisGroup = "BAFA" | "BIS" | "DDTC" | "EU" | "OTHER";
const JURIS_OPTIONS: readonly JurisGroup[] = [
  "BAFA",
  "BIS",
  "DDTC",
  "EU",
  "OTHER",
];
const EXPIRY_OPTIONS: ReadonlyArray<{ key: 30 | 60 | 90; label: string }> = [
  { key: 30, label: "≤30d" },
  { key: 60, label: "≤60d" },
  { key: 90, label: "≤90d" },
];

/**
 * Draw-down percentage in EUROS (API already serialized cents→euros — do
 * NOT re-introduce cents math). Returns -1 for uncapped licences so they
 * sort last and never match the low-capacity filter.
 */
function drawnPct(l: LicenseRow): number {
  return l.totalCapValue && l.totalCapValue > 0
    ? (l.drawnDownValue / l.totalCapValue) * 100
    : -1;
}

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

  // Client-side quick-filters (on the loaded page, like Phase 3A).
  const [jurisFilter, setJurisFilter] = useState<Set<JurisGroup>>(new Set());
  const toggleJurisFilter = useCallback((g: JurisGroup) => {
    setJurisFilter((prev) => {
      const out = new Set(prev);
      if (out.has(g)) out.delete(g);
      else out.add(g);
      return out;
    });
  }, []);
  const [expiryFilter, setExpiryFilter] = useState<30 | 60 | 90 | null>(null);
  const [lowCapacityOnly, setLowCapacityOnly] = useState(false);

  const [showNew, setShowNew] = useState(false);
  // U-CRIT-5 bulk-select state (page-owned, passed to TradeTable).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Which licence's renewal panel is open (null = none).
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const toast = useToast();

  // Clear bulk-selection on any filter/search change.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, jurisFilter, expiryFilter, lowCapacityOnly]);

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

  // Client-side jurisdiction / expiry / capacity filtering on the loaded
  // page (no new query params — same constraint as Phase 3A).
  const visibleLicenses = useMemo(
    () =>
      licenses.filter((l) => {
        const group = (TYPE_META[l.licenseType] ?? TYPE_META.OTHER).group;
        if (jurisFilter.size > 0 && !jurisFilter.has(group)) return false;
        if (expiryFilter !== null) {
          const days = deriveExpiryState(l.validUntil).daysRemaining;
          if ((days ?? Infinity) > expiryFilter) return false;
        }
        if (lowCapacityOnly && drawnPct(l) <= 80) return false;
        return true;
      }),
    [licenses, jurisFilter, expiryFilter, lowCapacityOnly],
  );

  // ─── Columns (ported from the former LicenseCard visuals) ───────────

  const columns: TradeColumn<LicenseRow>[] = [
    {
      key: "licenseType",
      header: "Type & jurisdiction",
      sortBy: (l) => (TYPE_META[l.licenseType] ?? TYPE_META.OTHER).label,
      render: (l) => {
        const m = TYPE_META[l.licenseType] ?? TYPE_META.OTHER;
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-trade-text-primary">
              {m.label}
            </span>
            <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
              {m.jurisdiction}
            </span>
          </div>
        );
      },
    },
    {
      key: "licenseNumber",
      header: "Number",
      sortBy: (l) => l.licenseNumber ?? "",
      render: (l) => (
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] text-trade-text-secondary">
            {l.licenseNumber ?? "—"}
          </span>
          {(l.conditions as Record<string, unknown>)?.renewalOf ? (
            <span className="rounded bg-trade-accent-soft px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-accent-strong">
              renewal
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortBy: (l) => l.status,
      render: (l) => <LicenseStatusBadge status={l.status} />,
    },
    {
      key: "validUntil",
      header: "Expiry",
      sortBy: (l) => deriveExpiryState(l.validUntil).sortValue,
      render: (l) => <ExpiryBadge validUntil={l.validUntil} />,
    },
    {
      key: "drawdown",
      header: "Remaining capacity",
      align: "right",
      sortBy: (l) => drawnPct(l),
      render: (l) => <DrawdownCell license={l} />,
    },
    {
      key: "conditions",
      header: "Conditions",
      render: (l) => <ConditionsCell conditions={l.conditions} />,
    },
    {
      key: "renew",
      header: "",
      align: "right",
      render: (l) =>
        deriveExpiryState(l.validUntil).isRenewalDue ? (
          <button
            type="button"
            onClick={() => setRenewingId(l.id)}
            className="rounded-md border border-trade-accent bg-trade-accent-soft px-2.5 py-1 text-[12px] font-semibold text-trade-accent-strong transition hover:bg-trade-accent hover:text-white"
          >
            Renew
          </button>
        ) : null,
    },
  ];

  // ─── Filter pills (passed as `filters` slot) ────────────────────────

  const pillClass = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
      active
        ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
        : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
    }`;

  const filterSlot = (
    <>
      {/* Status (1 → server param; 2+ → client filter) */}
      <button
        key="__all"
        onClick={clearStatusFilter}
        aria-pressed={statusFilter.size === 0}
        className={pillClass(statusFilter.size === 0)}
      >
        All
      </button>
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => toggleStatusFilter(opt.key)}
          aria-pressed={statusFilter.has(opt.key)}
          className={pillClass(statusFilter.has(opt.key))}
        >
          {opt.label}
        </button>
      ))}

      {/* Jurisdiction (client-side on TYPE_META.group) */}
      <span className="mx-1 h-4 w-px bg-trade-border-subtle" aria-hidden />
      {JURIS_OPTIONS.map((g) => (
        <button
          key={g}
          onClick={() => toggleJurisFilter(g)}
          aria-pressed={jurisFilter.has(g)}
          className={pillClass(jurisFilter.has(g))}
        >
          {g}
        </button>
      ))}

      {/* Expiry quick-filter (single-select; click again clears) */}
      <span className="mx-1 h-4 w-px bg-trade-border-subtle" aria-hidden />
      {EXPIRY_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() =>
            setExpiryFilter((cur) => (cur === opt.key ? null : opt.key))
          }
          aria-pressed={expiryFilter === opt.key}
          className={pillClass(expiryFilter === opt.key)}
        >
          {opt.label}
        </button>
      ))}

      {/* Capacity quick-filter */}
      <button
        onClick={() => setLowCapacityOnly((v) => !v)}
        aria-pressed={lowCapacityOnly}
        className={pillClass(lowCapacityOnly)}
      >
        Remaining &lt; 20%
      </button>
    </>
  );

  const renewing = renewingId
    ? licenses.find((l) => l.id === renewingId)
    : undefined;

  return (
    <div className="mx-auto max-w-screen-xl px-8 py-8">
      {/* Header */}
      <header className="mb-7 flex items-end justify-between gap-6 border-b border-trade-border-subtle pb-5">
        <div className="min-w-0">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            Passage /{" "}
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

      {/* Renewal panel — opens inline above the table (mirrors NewLicenseForm). */}
      {renewing && (
        <LicenseRenewalModal
          prior={{
            id: renewing.id,
            licenseType: renewing.licenseType,
            licenseNumber: renewing.licenseNumber,
            validUntil: renewing.validUntil,
            totalCapValue: renewing.totalCapValue,
            capCurrency: renewing.capCurrency,
            conditions: renewing.conditions,
          }}
          onClose={() => setRenewingId(null)}
          onRenewed={(row) => {
            setLicenses((prev) => [row, ...prev]);
            setRenewingId(null);
          }}
        />
      )}

      {/* TradeTable — owns toolbar (search + filter pills), sticky sortable
          headers, selection checkboxes, and BulkActionsBar. Default sort =
          expiry ascending ("soonest first"). rowHref intentionally UNSET
          (no detail page yet → keeps the in-cell Renew button clickable). */}
      <TradeTable<LicenseRow>
        rows={visibleLicenses}
        columns={columns}
        getRowId={(l) => l.id}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkNoun="license"
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
          placeholder: "Search license number…",
        }}
        filters={filterSlot}
        resultCount={visibleLicenses.length}
        loading={loading}
        emptyState={<EmptyState onNew={() => setShowNew(true)} />}
        initialSort={{ key: "validUntil", dir: "asc" }}
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

// ─── Cell subcomponents (local; ScreeningBadge stays parties-local) ────

/** Status pill from STATUS_META (existing label + icon + classes). */
function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${meta.className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {meta.label}
    </span>
  );
}

/** Expiry pill driven by the pure deriveExpiryState (90/30/7 buckets). */
function ExpiryBadge({ validUntil }: { validUntil: string | null }) {
  const s = deriveExpiryState(validUntil);
  // ok / no-date → nothing to flag.
  if (s.urgency === "ok") {
    return <span className="text-[12px] text-trade-text-muted">—</span>;
  }
  const cls =
    s.urgency === "expired" || s.urgency === "critical"
      ? "bg-red-50 text-red-700 ring-red-200"
      : s.urgency === "warning"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-trade-bg-subtle text-trade-text-secondary ring-trade-border-subtle";
  const title =
    s.daysRemaining !== null && s.daysRemaining < 0
      ? `License validUntil ${validUntil}`
      : `License expires in ${s.daysRemaining} days`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ring-1 ${cls}`}
      title={title}
    >
      <CalendarClock className="h-3 w-3" />
      {s.label}
    </span>
  );
}

/** Draw-down bar + "drawn / cap CUR · NN%" (euros), or "—" when uncapped. */
function DrawdownCell({ license }: { license: LicenseRow }) {
  const pct =
    license.totalCapValue && license.totalCapValue > 0
      ? (license.drawnDownValue / license.totalCapValue) * 100
      : null;
  if (pct === null) {
    return <span className="text-[12px] text-trade-text-muted">—</span>;
  }
  return (
    <div className="ml-auto w-40">
      <div className="mb-1 text-right font-mono text-[11px] text-trade-text-secondary">
        {license.drawnDownValue.toLocaleString("en-GB", {
          maximumFractionDigits: 0,
        })}{" "}
        /{" "}
        {license.totalCapValue?.toLocaleString("en-GB", {
          maximumFractionDigits: 0,
        })}{" "}
        {license.capCurrency} · {pct.toFixed(1)}%
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-trade-bg-subtle">
        <div
          className={`h-full transition-all ${
            pct >= 90
              ? "bg-red-500"
              : pct >= 70
                ? "bg-amber-500"
                : "bg-trade-accent"
          }`}
          style={{ width: `${Math.min(100, pct).toFixed(2)}%` }}
        />
      </div>
    </div>
  );
}

/** Compact conditions indicator ("5 codes · 3 countries · restricted"). */
function ConditionsCell({
  conditions,
}: {
  conditions: Record<string, unknown>;
}) {
  const codes = Array.isArray(conditions.coveredCodes)
    ? conditions.coveredCodes
    : [];
  const countries = Array.isArray(conditions.coveredCountries)
    ? conditions.coveredCountries
    : [];
  const restrictions = Array.isArray(conditions.endUseRestrictions)
    ? conditions.endUseRestrictions
    : [];

  const parts: string[] = [];
  if (codes.length)
    parts.push(`${codes.length} code${codes.length === 1 ? "" : "s"}`);
  if (countries.length)
    parts.push(
      `${countries.length} countr${countries.length === 1 ? "y" : "ies"}`,
    );

  if (parts.length === 0 && restrictions.length === 0) {
    return <span className="text-[12px] text-trade-text-muted">none</span>;
  }

  const title = [
    codes.length ? `Codes: ${codes.join(", ")}` : null,
    countries.length ? `Countries: ${countries.join(", ")}` : null,
    restrictions.length ? `Restrictions: ${restrictions.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary"
      title={title}
    >
      {parts.join(" · ")}
      {restrictions.length > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          restricted
        </span>
      )}
    </span>
  );
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
