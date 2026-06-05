"use client";

/**
 * /trade/operations — Operations pipeline list (Sprint A3a, Indigo light port).
 *
 * Ported from /dashboard/trade/operations/page.tsx (Wave-C legacy).
 * Functionality unchanged:
 *   - Searchable status-filtered list of TradeOperation rows
 *   - Inline NewOperationForm with counterparty typeahead, ship-from/to,
 *     scheduled-ship date, optional description — posts to
 *     /api/trade/operations
 *   - Risk score badge (red ≥70, amber ≥40, emerald <40) — universal
 *     compliance hue, keeps semantics across theme modes
 *   - Catch-all + notification-duty pills surface AWV §8 / EU 2021/821
 *     Art 4/5/9/10 hits at a glance
 *
 * A3b will port the per-operation detail page (Tabs: Overview / Lines /
 * Licenses / Screening / Workflow / Documents) once the three large
 * sub-panels (Lines, Lifecycle, Licenses) ship as light variants.
 *
 * UI Phase 3A: bespoke list replaced with TradeTable<OperationRow>.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { humanizeEnum, tradeStatusLabel } from "@/lib/trade/format";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { Term } from "../_components/Term";
import { buildCsv, downloadCsv } from "@/lib/trade/csv-export";
import { useToast } from "@/components/ui/Toast";
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
import {
  Plus,
  Sparkles,
  X,
  Truck,
  Package,
  Users,
  FileCheck,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

interface OperationRow {
  id: string;
  reference: string;
  description: string;
  operationType: string;
  status:
    | "DRAFT"
    | "AWAITING_CLASSIFICATION"
    | "SCREENING"
    | "AWAITING_LICENSE"
    | "LICENSED"
    | "EXECUTED"
    | "BLOCKED"
    | "VOLUNTARY_DISCLOSURE_FILED";
  shipFromCountry: string;
  shipToCountry: string;
  endUseCountry: string | null;
  declaredEndUse: string;
  riskScore: number | null;
  catchAllArt4Hit: boolean;
  catchAllArt5Hit: boolean;
  catchAllArt9Hit: boolean;
  catchAllArt10Hit: boolean;
  notificationDuty: boolean;
  scheduledShipDate: string | null;
  createdAt: string;
  counterparty: {
    id: string;
    legalName: string;
    countryCode: string;
    screeningStatus: string;
    status: string;
    isHighRiskCountry: boolean;
  };
  _count: { lines: number; licenses: number };
}

interface Counterparty {
  id: string;
  legalName: string;
  countryCode: string;
  status: string;
  screeningStatus: string;
}

type OperationStatusKey = OperationRow["status"];
const STATUS_OPTIONS: ReadonlyArray<{
  key: OperationStatusKey;
  label: string;
}> = [
  { key: "DRAFT", label: "Draft" },
  { key: "SCREENING", label: "Screening" },
  { key: "AWAITING_LICENSE", label: "Awaiting license" },
  { key: "LICENSED", label: "Licensed" },
  { key: "EXECUTED", label: "Executed" },
  { key: "BLOCKED", label: "Blocked" },
];

const OPERATION_TYPES: { value: string; label: string }[] = [
  { value: "EXPORT", label: "Export (out of EU)" },
  { value: "REEXPORT", label: "Re-export (US-origin)" },
  { value: "INTRA_EU", label: "Intra-EU transfer" },
  { value: "TRANSIT", label: "Transit" },
  { value: "TECH_TRANSFER", label: "Technology transfer" },
  { value: "DEEMED_EXPORT", label: "Deemed export" },
  { value: "CLOUD_PROVISION", label: "Cloud provision" },
];

/** Valid status keys that may arrive via the `?status=` URL param. */
const VALID_STATUS_KEYS: ReadonlySet<OperationStatusKey> = new Set([
  "DRAFT",
  "SCREENING",
  "AWAITING_LICENSE",
  "LICENSED",
  "EXECUTED",
  "BLOCKED",
]);

export default function OperationsListPage() {
  const searchParams = useSearchParams();
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Set<OperationStatusKey>>(new Set());

  // Drive the status filter from the ?status= URL param — the contextual
  // panel is the primary filter control. Valid param → that single status;
  // "Alle" / no param → cleared. The effect only re-runs on navigation
  // (searchParams is stable across non-nav re-renders), so an in-page pill
  // toggle made between navigations is preserved.
  useEffect(() => {
    const param = searchParams.get("status");
    if (param && VALID_STATUS_KEYS.has(param as OperationStatusKey)) {
      setFilter(new Set([param as OperationStatusKey]));
    } else {
      setFilter(new Set());
    }
  }, [searchParams]);

  const toggleStatusFilter = useCallback((s: OperationStatusKey) => {
    setFilter((prev) => {
      const out = new Set(prev);
      if (out.has(s)) out.delete(s);
      else out.add(s);
      return out;
    });
  }, []);
  const clearStatusFilter = useCallback(() => setFilter(new Set()), []);
  const [showNewForm, setShowNewForm] = useState(false);
  // U-CRIT-5 bulk-select state (owned by page, passed to TradeTable).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter.size === 1) {
      params.set("status", Array.from(filter)[0]);
    }
    fetch(`/api/trade/operations?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const fetched: OperationRow[] = data.operations ?? [];
          setOperations(
            filter.size > 1
              ? fetched.filter((o) => filter.has(o.status))
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
  }, [search, filter]);

  // Clear bulk-selection on filter/search change.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, filter]);

  const handleExportSelected = () => {
    const rows = operations.filter((o) => selectedIds.has(o.id));
    if (rows.length === 0) {
      toast.warning("Nothing to export", "Select at least one operation.");
      return;
    }
    const csv = buildCsv(rows, [
      { header: "ID", get: (o) => o.id },
      { header: "Reference", get: (o) => o.reference },
      { header: "Type", get: (o) => o.operationType },
      { header: "Status", get: (o) => o.status },
      { header: "Counterparty", get: (o) => o.counterparty.legalName },
      { header: "Ship from", get: (o) => o.shipFromCountry },
      { header: "Ship to", get: (o) => o.shipToCountry },
      { header: "End-use country", get: (o) => o.endUseCountry },
      { header: "Risk score", get: (o) => o.riskScore ?? "" },
      {
        header: "Catch-all hits",
        get: (o) =>
          Number(o.catchAllArt4Hit) +
          Number(o.catchAllArt5Hit) +
          Number(o.catchAllArt9Hit) +
          Number(o.catchAllArt10Hit),
      },
      { header: "Notification duty", get: (o) => o.notificationDuty },
    ]);
    downloadCsv("caelex-trade-operations", csv);
    toast.success(
      "Export started",
      `${rows.length} operation${rows.length === 1 ? "" : "s"} downloaded as CSV.`,
    );
  };

  // ─── Column definitions ─────────────────────────────────────────────
  // Ports the exact cell visuals from the former OperationRowItem.

  const columns: TradeColumn<OperationRow>[] = [
    {
      key: "status",
      header: "Status",
      sortBy: (o) => o.status,
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "reference",
      header: "Reference",
      sortBy: (o) => o.reference,
      render: (o) => {
        const catchAllCount =
          Number(o.catchAllArt4Hit) +
          Number(o.catchAllArt5Hit) +
          Number(o.catchAllArt9Hit) +
          Number(o.catchAllArt10Hit);
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-[13px] font-semibold text-trade-text-primary">
                {o.reference}
              </span>
              <span
                className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle"
                title={humanizeEnum(o.operationType)}
              >
                {humanizeEnum(o.operationType)}
              </span>
              {o.notificationDuty && (
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest trade-chip-warn"
                  title="§8 AWV Anzeigepflicht"
                >
                  Notify
                </span>
              )}
              {catchAllCount > 0 && (
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest trade-chip-danger"
                  title="Catch-all article triggered"
                >
                  Catch-all ×{catchAllCount}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-trade-text-muted">
              {o.counterparty.legalName}
              {o.counterparty.isHighRiskCountry && (
                <span className="text-trade-accent-warn"> · high-risk</span>
              )}
              {o._count.lines > 0 && ` · ${o._count.lines} lines`}
              {o._count.licenses > 0 && ` · ${o._count.licenses} licenses`}
            </div>
          </div>
        );
      },
    },
    {
      key: "route",
      header: "Route",
      render: (o) => (
        <span className="text-[13px] text-trade-text-secondary">
          {o.shipFromCountry} → {o.shipToCountry}
          {o.endUseCountry && o.endUseCountry !== o.shipToCountry && (
            <span className="text-trade-text-muted">
              {" "}
              → {o.endUseCountry} (end-use)
            </span>
          )}
        </span>
      ),
    },
    {
      key: "scheduledShipDate",
      header: "Ship date",
      sortBy: (o) => o.scheduledShipDate ?? "",
      align: "right",
      render: (o) =>
        o.scheduledShipDate ? (
          <span className="tabular-nums text-[12px] text-trade-text-secondary">
            {new Date(o.scheduledShipDate).toLocaleDateString("en-GB")}
          </span>
        ) : (
          <span className="text-[12px] text-trade-text-muted">—</span>
        ),
    },
    {
      key: "riskScore",
      header: "Risk",
      sortBy: (o) => o.riskScore ?? -1,
      align: "right",
      render: (o) =>
        o.riskScore !== null ? (
          <div className="text-right">
            <div
              className={`text-[14px] font-bold tabular-nums ${
                o.riskScore >= 70
                  ? "text-trade-accent-danger"
                  : o.riskScore >= 40
                    ? "text-trade-accent-warn"
                    : "text-trade-accent-success"
              }`}
            >
              {o.riskScore}
            </div>
          </div>
        ) : (
          <span className="text-[12px] text-trade-text-muted">—</span>
        ),
    },
  ];

  // ─── Filter pills (passed as `filters` slot) ────────────────────────

  const filterSlot = (
    <>
      <button
        key="__all"
        onClick={clearStatusFilter}
        aria-pressed={filter.size === 0}
        className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
          filter.size === 0
            ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
            : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
        }`}
      >
        All
      </button>
      {STATUS_OPTIONS.map((opt) => {
        const active = filter.has(opt.key);
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
      {filter.size > 1 ? (
        <span className="text-[11px] text-trade-text-muted">
          {filter.size} statuses selected
        </span>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      <header className="mb-6 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
            Vorgänge
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-trade-text-secondary">
            Atomare Liefer-Vorgänge: Items × Counterparty × Route × Lizenz-
            Stack. Lifecycle DRAFT → SCREENING → LICENSED → EXECUTED.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/trade/operations/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-trade-text-primary px-4 py-2 text-[13px] font-medium text-trade-bg-panel transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Geführter Vorgang
          </Link>
          <button
            onClick={() => setShowNewForm((s) => !s)}
            className={
              showNewForm
                ? "flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-medium transition trade-chip-danger hover:bg-trade-hover"
                : "flex shrink-0 items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-panel px-4 py-2 text-[13px] font-medium text-trade-text-primary transition hover:bg-trade-hover"
            }
          >
            {showNewForm ? (
              <>
                <X className="h-3.5 w-3.5" /> Abbrechen
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Neuer Vorgang
              </>
            )}
          </button>
        </div>
      </header>

      {showNewForm && (
        <NewOperationForm
          onCreated={(op) => {
            setOperations((prev) => [op, ...prev]);
            setShowNewForm(false);
          }}
        />
      )}

      {/* TradeTable — owns toolbar (search + filter pills), sticky sortable
          headers, selection checkboxes, and BulkActionsBar. */}
      <TradeTable<OperationRow>
        rows={operations}
        columns={columns}
        getRowId={(o) => o.id}
        rowHref={(o) => `/trade/operations/${o.id}`}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkNoun="operation"
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
          placeholder: "Search by reference…",
        }}
        filters={filterSlot}
        resultCount={operations.length}
        loading={loading}
        emptyState={<EmptyState onNew={() => setShowNewForm(true)} />}
      />

      <p
        lang="de"
        className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted"
      >
        Trade-Operations sind Decision-Support, kein Auto-Pilot. Status-
        Übergänge LICENSED → EXECUTED erfordern menschliche Bestätigung durch
        qualifizierten AV. Verstöße gegen <Term>AWG</Term>/<Term>EAR</Term>/
        <Term>ITAR</Term> können zu Freiheitsstrafen bis 10/20 Jahren führen.
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: OperationRow["status"] }) {
  const config: Record<
    OperationRow["status"],
    { icon: LucideIcon; className: string; label: string }
  > = {
    DRAFT: {
      icon: Clock,
      className: "bg-trade-bg-subtle text-trade-text-muted",
      label: "Draft",
    },
    AWAITING_CLASSIFICATION: {
      icon: Clock,
      className: "trade-chip-warn",
      label: "Class.",
    },
    SCREENING: {
      icon: Clock,
      className: "trade-chip-warn",
      label: "Screen",
    },
    AWAITING_LICENSE: {
      icon: Clock,
      className: "trade-chip-warn",
      label: "License",
    },
    LICENSED: {
      icon: CheckCircle2,
      className: "trade-chip-info",
      label: "Licensed",
    },
    EXECUTED: {
      icon: CheckCircle2,
      className: "trade-chip-success",
      label: "Executed",
    },
    BLOCKED: {
      icon: XCircle,
      className: "trade-chip-danger",
      label: "Blocked",
    },
    VOLUNTARY_DISCLOSURE_FILED: {
      icon: AlertTriangle,
      className: "trade-chip-danger",
      label: "VDISC",
    },
  };
  const c = config[status];
  const Icon = c.icon;
  const fullLabel = tradeStatusLabel(status);
  return (
    <div
      role="img"
      aria-label={`Status: ${fullLabel}`}
      title={fullLabel}
      className={`flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-md ring-1 ring-inset ring-trade-border-subtle ${c.className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      <span
        aria-hidden="true"
        className="mt-0.5 text-[8px] font-bold uppercase tracking-widest"
      >
        {c.label}
      </span>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <EmptyStateRich
      icon={Truck}
      title="Noch keine Vorgänge"
      description="Ein Vorgang bündelt Artikel × Partner × Route × Lizenz zu einer prüfbaren Liefertransaktion. Lebenszyklus: ENTWURF → SCREENING → LIZENZIERT → AUSGEFÜHRT."
      primaryAction={{ label: "Create first operation", onClick: onNew }}
      astra={{
        label: "Ask Astra about the workflow",
        prefill:
          "Walk me through the full operation lifecycle. What does each stage (DRAFT, SCREENING, AWAITING_LICENSE, LICENSED, EXECUTED) actually require, and when do the AWV §8 / EU 2021/821 Art. 4/5/9/10 catch-alls fire?",
      }}
      secondaryActions={[
        {
          label: "Set up items first",
          href: "/trade/items",
          icon: Package,
        },
        {
          label: "Add counterparties",
          href: "/trade/parties",
          icon: Users,
        },
        {
          label: "Check licenses",
          href: "/trade/licenses",
          icon: FileCheck,
        },
      ]}
    />
  );
}

function NewOperationForm({
  onCreated,
}: {
  onCreated: (op: OperationRow) => void;
}) {
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [operationType, setOperationType] = useState("EXPORT");
  const [counterpartySearch, setCounterpartySearch] = useState("");
  const [counterpartyResults, setCounterpartyResults] = useState<
    Counterparty[]
  >([]);
  const [selectedCounterparty, setSelectedCounterparty] =
    useState<Counterparty | null>(null);
  const [shipFromCountry, setShipFromCountry] = useState("DE");
  const [shipToCountry, setShipToCountry] = useState("");
  const [scheduledShipDate, setScheduledShipDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCounterparty || !counterpartySearch) {
      setCounterpartyResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(
        `/api/trade/parties?q=${encodeURIComponent(counterpartySearch)}&limit=10`,
      )
        .then((r) => r.json())
        .then((data) => setCounterpartyResults(data.parties ?? []))
        .catch(() => setCounterpartyResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [counterpartySearch, selectedCounterparty]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!selectedCounterparty) {
      setErr("Counterparty required — search and select one above");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim(),
          description: description.trim(),
          operationType,
          counterpartyId: selectedCounterparty.id,
          shipFromCountry: shipFromCountry.toUpperCase(),
          shipToCountry: shipToCountry.toUpperCase(),
          scheduledShipDate: scheduledShipDate
            ? new Date(scheduledShipDate).toISOString()
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to create operation");
        return;
      }
      const op: OperationRow = {
        ...data.operation,
        counterparty: {
          id: selectedCounterparty.id,
          legalName: selectedCounterparty.legalName,
          countryCode: selectedCounterparty.countryCode,
          screeningStatus: selectedCounterparty.screeningStatus,
          status: selectedCounterparty.status,
          isHighRiskCountry: false,
        },
        _count: { lines: 0, licenses: 0 },
      };
      onCreated(op);
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

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Reference *</label>
          <input
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="ISAR-2026-Q1-001"
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Operation Type *</label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className={inputClass}
          >
            {OPERATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Scheduled Ship Date</label>
          <input
            type="date"
            value={scheduledShipDate}
            onChange={(e) => setScheduledShipDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>Counterparty *</label>
          {selectedCounterparty ? (
            <div className={`flex items-center justify-between ${inputClass}`}>
              <span>
                {selectedCounterparty.legalName} (
                {selectedCounterparty.countryCode})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCounterparty(null);
                  setCounterpartySearch("");
                }}
                className="text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={counterpartySearch}
                onChange={(e) => setCounterpartySearch(e.target.value)}
                placeholder="Type to search existing counterparties…"
                className={inputClass}
              />
              {counterpartyResults.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-md border border-trade-border-subtle">
                  {counterpartyResults.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => setSelectedCounterparty(p)}
                      className="cursor-pointer border-t border-trade-border-subtle bg-trade-bg-panel px-3 py-2 text-[12px] text-trade-text-primary transition hover:bg-trade-hover first:border-t-0"
                    >
                      <div>{p.legalName}</div>
                      <div className="text-[10px] text-trade-text-muted">
                        {p.countryCode} · {p.screeningStatus.toLowerCase()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {counterpartySearch && counterpartyResults.length === 0 && (
                <p className="mt-2 text-[11px] text-trade-text-muted">
                  No matches. Add the counterparty first via Counterparty
                  Screening.
                </p>
              )}
            </>
          )}
        </div>
        <div>
          <label className={labelClass}>Ship From (ISO 2) *</label>
          <input
            type="text"
            required
            value={shipFromCountry}
            maxLength={2}
            onChange={(e) => setShipFromCountry(e.target.value.toUpperCase())}
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass}>Ship To (ISO 2) *</label>
          <input
            type="text"
            required
            value={shipToCountry}
            maxLength={2}
            onChange={(e) => setShipToCountry(e.target.value.toUpperCase())}
            placeholder="US"
            className={`${inputClass} uppercase`}
          />
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What's being shipped? Use case? Free-text for the audit trail."
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>
      {err && (
        <div className="mt-3 rounded-md px-3 py-2 text-[12px] trade-chip-danger">
          {err}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={
            submitting || !reference || !shipToCountry || !selectedCounterparty
          }
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Operation"}
        </button>
      </div>
    </form>
  );
}
