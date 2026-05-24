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

import { useEffect, useState } from "react";
import { ListSkeleton } from "../_components/Skeletons";
import {
  Search,
  Plus,
  X,
  FileCheck,
  AlertTriangle,
  Calendar,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type LicenseStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
  | "EXHAUSTED";

type LicenseType =
  | "BAFA_EINZEL"
  | "BAFA_AGG_12"
  | "BAFA_AGG_16"
  | "BAFA_AGG_27"
  | "BAFA_AGG_47"
  | "BAFA_EUGEA_EU001"
  | "BAFA_EUGEA_EU002"
  | "BIS_EAR"
  | "BIS_LICENSE_EXCEPTION_STA"
  | "BIS_LICENSE_EXCEPTION_CSA"
  | "BIS_LICENSE_EXCEPTION_ENC"
  | "DDTC_DSP5"
  | "DDTC_DSP73"
  | "DDTC_TAA"
  | "DDTC_MLA"
  | "OTHER";

interface LicenseRow {
  id: string;
  licenseType: LicenseType;
  licenseNumber: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  conditions: Record<string, unknown>;
  drawnDownValue: number;
  totalCapValue: number | null;
  capCurrency: string;
  status: LicenseStatus;
  documentId: string | null;
  createdAt: string;
  _count: { operations: number };
}

// ─── License-type metadata ────────────────────────────────────────────

const TYPE_META: Record<
  LicenseType,
  {
    label: string;
    jurisdiction: string;
    group: "BAFA" | "BIS" | "DDTC" | "EU" | "OTHER";
  }
> = {
  BAFA_EINZEL: {
    label: "BAFA Einzelausfuhr",
    jurisdiction: "DE",
    group: "BAFA",
  },
  BAFA_AGG_12: { label: "BAFA AGG 12", jurisdiction: "DE", group: "BAFA" },
  BAFA_AGG_16: { label: "BAFA AGG 16", jurisdiction: "DE", group: "BAFA" },
  BAFA_AGG_27: { label: "BAFA AGG 27", jurisdiction: "DE", group: "BAFA" },
  BAFA_AGG_47: { label: "BAFA AGG 47", jurisdiction: "DE", group: "BAFA" },
  BAFA_EUGEA_EU001: {
    label: "EUGEA EU001",
    jurisdiction: "EU",
    group: "EU",
  },
  BAFA_EUGEA_EU002: {
    label: "EUGEA EU002",
    jurisdiction: "EU",
    group: "EU",
  },
  BIS_EAR: { label: "BIS EAR License", jurisdiction: "US", group: "BIS" },
  BIS_LICENSE_EXCEPTION_STA: {
    label: "BIS License Exception STA",
    jurisdiction: "US",
    group: "BIS",
  },
  BIS_LICENSE_EXCEPTION_CSA: {
    label: "BIS License Exception CSA",
    jurisdiction: "US",
    group: "BIS",
  },
  BIS_LICENSE_EXCEPTION_ENC: {
    label: "BIS License Exception ENC",
    jurisdiction: "US",
    group: "BIS",
  },
  DDTC_DSP5: { label: "DDTC DSP-5", jurisdiction: "US", group: "DDTC" },
  DDTC_DSP73: {
    label: "DDTC DSP-73 (temporary)",
    jurisdiction: "US",
    group: "DDTC",
  },
  DDTC_TAA: { label: "DDTC TAA", jurisdiction: "US", group: "DDTC" },
  DDTC_MLA: { label: "DDTC MLA", jurisdiction: "US", group: "DDTC" },
  OTHER: { label: "Other", jurisdiction: "—", group: "OTHER" },
};

// ─── Status meta ──────────────────────────────────────────────────────

const STATUS_META: Record<
  LicenseStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  DRAFT: {
    label: "Draft",
    icon: Clock,
    className: "bg-trade-bg-subtle text-trade-text-secondary",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-700",
  },
  ACTIVE: {
    label: "Active",
    icon: ShieldCheck,
    className: "bg-emerald-50 text-emerald-700",
  },
  REVOKED: {
    label: "Revoked",
    icon: XCircle,
    className: "bg-red-50 text-red-700",
  },
  EXPIRED: {
    label: "Expired",
    icon: XCircle,
    className: "bg-red-50 text-red-700",
  },
  EXHAUSTED: {
    label: "Exhausted",
    icon: ShieldAlert,
    className: "bg-orange-50 text-orange-700",
  },
};

const STATUS_TABS: { key: "all" | LicenseStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PENDING", label: "Pending" },
  { key: "DRAFT", label: "Draft" },
  { key: "EXPIRED", label: "Expired" },
  { key: "EXHAUSTED", label: "Exhausted" },
];

// ─── Component ────────────────────────────────────────────────────────

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LicenseStatus>(
    "all",
  );
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/trade/licenses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLicenses(data.licenses ?? []);
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

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
              statusFilter === tab.key
                ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
                : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
        <ul className="space-y-3">
          {licenses.map((lic) => (
            <LicenseCard key={lic.id} license={lic} />
          ))}
        </ul>
      )}

      <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted">
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

function LicenseCard({ license }: { license: LicenseRow }) {
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

  return (
    <li className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
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
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-8 py-12 text-center">
      <FileCheck
        aria-hidden="true"
        className="mx-auto mb-3 h-8 w-8 text-trade-text-muted"
        strokeWidth={1.5}
      />
      <h3 className="mb-1 text-[14px] font-semibold text-trade-text-primary">
        No licenses recorded yet
      </h3>
      <p className="mb-5 text-[12px] text-trade-text-secondary">
        Add your first BAFA, BIS or DDTC license so operations can attach it for
        draw-down tracking.
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
      >
        <Plus className="h-3 w-3" /> Add first license
      </button>
    </div>
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
    <form
      onSubmit={submit}
      className="mb-6 rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5"
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
  );
}
