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
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListSkeleton } from "../_components/Skeletons";
import { humanizeEnum, tradeStatusLabel } from "@/lib/trade/format";
import {
  Search,
  Plus,
  X,
  ArrowRight,
  Globe,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  ChevronRight,
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

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SCREENING", label: "Screening" },
  { key: "AWAITING_LICENSE", label: "Awaiting license" },
  { key: "LICENSED", label: "Licensed" },
  { key: "EXECUTED", label: "Executed" },
  { key: "BLOCKED", label: "Blocked" },
] as const;

const OPERATION_TYPES: { value: string; label: string }[] = [
  { value: "EXPORT", label: "Export (out of EU)" },
  { value: "REEXPORT", label: "Re-export (US-origin)" },
  { value: "INTRA_EU", label: "Intra-EU transfer" },
  { value: "TRANSIT", label: "Transit" },
  { value: "TECH_TRANSFER", label: "Technology transfer" },
  { value: "DEEMED_EXPORT", label: "Deemed export" },
  { value: "CLOUD_PROVISION", label: "Cloud provision" },
];

export default function OperationsListPage() {
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "all") params.set("status", filter);
    fetch(`/api/trade/operations?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOperations(data.operations ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, filter]);

  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      <header className="mb-7 flex items-end justify-between gap-6 border-b border-trade-border-subtle pb-5">
        <div className="min-w-0">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            <Link
              href="/trade"
              className="transition hover:text-trade-text-primary"
            >
              Trade Operations
            </Link>{" "}
            <span className="text-trade-border-strong">/</span>{" "}
            <span className="text-trade-text-secondary">Operations</span>
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
            Trade Operations
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-trade-text-secondary">
            Atomare Liefer-Vorgänge: Items × Counterparty × Route × Lizenz-
            Stack. Lifecycle DRAFT → SCREENING → LICENSED → EXECUTED.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((s) => !s)}
          className={
            showNewForm
              ? "flex shrink-0 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 transition hover:bg-red-100"
              : "flex shrink-0 items-center gap-2 rounded-md bg-trade-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong"
          }
        >
          {showNewForm ? (
            <>
              <X className="h-3.5 w-3.5" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> New Operation
            </>
          )}
        </button>
      </header>

      {showNewForm && (
        <NewOperationForm
          onCreated={(op) => {
            setOperations((prev) => [op, ...prev]);
            setShowNewForm(false);
          }}
        />
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
              filter === tab.key
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
            placeholder="Search by reference…"
            className="w-64 bg-transparent text-[13px] text-trade-text-primary outline-none placeholder:text-trade-text-muted"
          />
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={5} label="Loading operations" />
      ) : operations.length === 0 ? (
        <EmptyState onNew={() => setShowNewForm(true)} />
      ) : (
        <div className="overflow-hidden rounded-md border border-trade-border-subtle">
          {operations.map((op, i) => (
            <OperationRowItem key={op.id} op={op} isFirst={i === 0} />
          ))}
        </div>
      )}

      <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted">
        Trade-Operations sind Decision-Support, kein Auto-Pilot. Status-
        Übergänge LICENSED → EXECUTED erfordern menschliche Bestätigung durch
        qualifizierten AV. Verstöße gegen AWG/EAR/ITAR können zu
        Freiheitsstrafen bis 10/20 Jahren führen.
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function OperationRowItem({
  op,
  isFirst,
}: {
  op: OperationRow;
  isFirst: boolean;
}) {
  const catchAllCount =
    Number(op.catchAllArt4Hit) +
    Number(op.catchAllArt5Hit) +
    Number(op.catchAllArt9Hit) +
    Number(op.catchAllArt10Hit);

  return (
    <Link
      href={`/trade/operations/${op.id}`}
      className={`group flex items-center gap-4 bg-trade-bg-panel px-5 py-4 transition hover:bg-trade-bg-elevated ${
        isFirst ? "" : "border-t border-trade-border-subtle"
      }`}
    >
      <StatusBadge status={op.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[13px] font-semibold text-trade-text-primary">
            {op.reference}
          </span>
          <span
            className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle"
            title={humanizeEnum(op.operationType)}
          >
            {humanizeEnum(op.operationType)}
          </span>
          {op.notificationDuty && (
            <span
              className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700 ring-1 ring-amber-200"
              title="§8 AWV Anzeigepflicht"
            >
              Notify
            </span>
          )}
          {catchAllCount > 0 && (
            <span
              className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-700 ring-1 ring-red-200"
              title="Catch-all article triggered"
            >
              Catch-all ×{catchAllCount}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-trade-text-muted">
          <Truck className="h-3 w-3" />
          {op.shipFromCountry}
          <ArrowRight className="h-2.5 w-2.5 opacity-50" />
          {op.shipToCountry}
          {op.endUseCountry && op.endUseCountry !== op.shipToCountry && (
            <>
              <ArrowRight className="h-2.5 w-2.5 opacity-50" />
              <span>{op.endUseCountry} (end-use)</span>
            </>
          )}
          <span>·</span>
          <Globe className="h-3 w-3" />
          <span className="text-trade-text-secondary">
            {op.counterparty.legalName}
          </span>
          {op.counterparty.isHighRiskCountry && (
            <span className="text-amber-600">· high-risk</span>
          )}
          <span>·</span>
          <Package className="h-3 w-3" />
          <span>{op._count.lines} lines</span>
          {op._count.licenses > 0 && (
            <span>· {op._count.licenses} licenses</span>
          )}
          {op.scheduledShipDate && (
            <>
              <span>·</span>
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(op.scheduledShipDate).toLocaleDateString("en-GB")}
              </span>
            </>
          )}
        </div>
      </div>
      {op.riskScore !== null && (
        <div className="shrink-0 text-right">
          <div
            className={`text-[16px] font-bold tabular-nums ${
              op.riskScore >= 70
                ? "text-red-600"
                : op.riskScore >= 40
                  ? "text-amber-600"
                  : "text-emerald-600"
            }`}
          >
            {op.riskScore}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
            Risk
          </div>
        </div>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-trade-text-muted opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

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
      className: "bg-amber-50 text-amber-700",
      label: "Class.",
    },
    SCREENING: {
      icon: Clock,
      className: "bg-amber-50 text-amber-700",
      label: "Screen",
    },
    AWAITING_LICENSE: {
      icon: Clock,
      className: "bg-amber-50 text-amber-700",
      label: "License",
    },
    LICENSED: {
      icon: CheckCircle2,
      className: "bg-blue-50 text-blue-700",
      label: "Licensed",
    },
    EXECUTED: {
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700",
      label: "Executed",
    },
    BLOCKED: {
      icon: XCircle,
      className: "bg-red-50 text-red-700",
      label: "Blocked",
    },
    VOLUNTARY_DISCLOSURE_FILED: {
      icon: AlertTriangle,
      className: "bg-red-50 text-red-700",
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
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-8 py-12 text-center">
      <Truck
        aria-hidden="true"
        className="mx-auto mb-3 h-8 w-8 text-trade-text-muted"
        strokeWidth={1.5}
      />
      <h3 className="mb-1 text-[14px] font-semibold text-trade-text-primary">
        No trade operations yet
      </h3>
      <p className="mb-5 text-[12px] text-trade-text-secondary">
        Create an operation to bundle items + counterparty + route + license
        stack into one auditable delivery transaction.
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
      >
        <Plus className="h-3 w-3" /> Create first operation
      </button>
    </div>
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
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
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
