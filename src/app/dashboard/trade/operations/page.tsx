/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /dashboard/trade/operations — Wave C list view
 *
 * Lists TradeOperation records for the active organization with status
 * badges, counterparty, ship-from→ship-to route, scheduled date, and
 * catch-all flags. Inline create form for spinning up new operations.
 *
 * Pattern: client component, fetches via /api/trade/operations,
 * force-dynamic via parent layout.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const SANS =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

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
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: SANS, letterSpacing: "-0.005em" }}
    >
      {/* Header */}
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <Link href="/dashboard/trade" className="hover:text-white/70">
              Trade Operations
            </Link>{" "}
            <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>{" "}
            Operations
          </div>
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: DISPLAY,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Trade Operations
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Atomare Liefer-Vorgänge: Items × Counterparty × Route × Lizenz-
            Stack. Lifecycle DRAFT → SCREENING → LICENSED → EXECUTED.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((s) => !s)}
          className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all"
          style={{
            background: showNewForm
              ? "rgba(239, 68, 68, 0.12)"
              : "rgba(16, 185, 129, 0.12)",
            color: showNewForm ? "rgb(248,113,113)" : "rgb(52,211,153)",
            boxShadow: showNewForm
              ? "inset 0 0 0 0.5px rgba(239,68,68,0.3)"
              : "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
          }}
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

      {/* Inline create form */}
      {showNewForm && (
        <NewOperationForm
          onCreated={(op) => {
            setOperations((prev) => [op, ...prev]);
            setShowNewForm(false);
          }}
        />
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background:
                filter === tab.key
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.025)",
              color:
                filter === tab.key
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.55)",
              boxShadow:
                filter === tab.key
                  ? "inset 0 0 0 0.5px rgba(255,255,255,0.18)"
                  : "inset 0 0 0 0.5px rgba(255,255,255,0.06)",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div
          className="ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
          }}
        >
          <Search
            className="h-3.5 w-3.5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference…"
            className="w-64 bg-transparent text-[13px] outline-none placeholder:text-white/30"
            style={{ color: "rgba(255,255,255,0.92)" }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="rounded-2xl px-8 py-12 text-center text-[13px]"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Loading operations…
        </div>
      ) : operations.length === 0 ? (
        <EmptyState onNew={() => setShowNewForm(true)} />
      ) : (
        <div
          className="overflow-hidden rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
        >
          {operations.map((op, i) => (
            <OperationRowItem key={op.id} op={op} isFirst={i === 0} />
          ))}
        </div>
      )}

      {/* Mandatory disclaimer */}
      <p
        className="mt-8 max-w-3xl text-[11px] leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
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
      href={`/dashboard/trade/operations/${op.id}`}
      className="group flex items-center gap-4 px-5 py-4 transition-colors"
      style={{
        background: "rgba(255,255,255,0.025)",
        borderTop: isFirst ? "none" : "0.5px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <StatusBadge status={op.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="truncate text-[13px] font-mono font-semibold"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {op.reference}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {op.operationType.replace("_", " ")}
          </span>
          {op.notificationDuty && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "rgb(251,191,36)",
              }}
              title="§8 AWV Anzeigepflicht"
            >
              Notify
            </span>
          )}
          {catchAllCount > 0 && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "rgb(248,113,113)",
              }}
              title="Catch-all article triggered"
            >
              Catch-all ×{catchAllCount}
            </span>
          )}
        </div>
        <div
          className="mt-0.5 flex items-center gap-2 text-[11px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
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
          <span style={{ color: "rgba(255,255,255,0.65)" }}>
            {op.counterparty.legalName}
          </span>
          {op.counterparty.isHighRiskCountry && (
            <span style={{ color: "rgb(251,191,36)" }}>· high-risk</span>
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
        <div
          className="shrink-0 text-right"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <div
            className="text-[16px] font-bold tabular-nums"
            style={{
              color:
                op.riskScore >= 70
                  ? "rgb(248,113,113)"
                  : op.riskScore >= 40
                    ? "rgb(251,191,36)"
                    : "rgb(52,211,153)",
            }}
          >
            {op.riskScore}
          </div>
          <div
            className="text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Risk
          </div>
        </div>
      )}
      <ChevronRight
        className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "rgba(255,255,255,0.4)" }}
      />
    </Link>
  );
}

function StatusBadge({ status }: { status: OperationRow["status"] }) {
  const config: Record<
    OperationRow["status"],
    { icon: typeof Clock; color: string; label: string }
  > = {
    DRAFT: { icon: Clock, color: "rgba(255,255,255,0.4)", label: "Draft" },
    AWAITING_CLASSIFICATION: {
      icon: Clock,
      color: "rgb(251,191,36)",
      label: "Class.",
    },
    SCREENING: { icon: Clock, color: "rgb(251,191,36)", label: "Screen" },
    AWAITING_LICENSE: {
      icon: Clock,
      color: "rgb(251,191,36)",
      label: "License",
    },
    LICENSED: {
      icon: CheckCircle2,
      color: "rgb(96,165,250)",
      label: "Licensed",
    },
    EXECUTED: {
      icon: CheckCircle2,
      color: "rgb(52,211,153)",
      label: "Executed",
    },
    BLOCKED: { icon: XCircle, color: "rgb(248,113,113)", label: "Blocked" },
    VOLUNTARY_DISCLOSURE_FILED: {
      icon: AlertTriangle,
      color: "rgb(248,113,113)",
      label: "VDISC",
    },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <div
      className="flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-md"
      style={{ background: "rgba(0,0,0,0.20)" }}
    >
      <Icon
        className="h-3.5 w-3.5"
        strokeWidth={1.75}
        style={{ color: c.color }}
      />
      <span
        className="mt-0.5 text-[8px] font-bold uppercase tracking-widest"
        style={{ color: c.color }}
      >
        {c.label}
      </span>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      className="rounded-2xl px-8 py-12 text-center"
      style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
    >
      <Truck
        className="mx-auto mb-3 h-8 w-8"
        strokeWidth={1.5}
        style={{ color: "rgba(255,255,255,0.3)" }}
      />
      <h3
        className="mb-1 text-[14px] font-semibold"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        No trade operations yet
      </h3>
      <p
        className="mb-5 text-[12px]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Create an operation to bundle items + counterparty + route + license
        stack into one auditable delivery transaction.
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold"
        style={{
          background: "rgba(16, 185, 129, 0.12)",
          color: "rgb(52,211,153)",
          boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
        }}
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
  const [counterpartyId, setCounterpartyId] = useState("");
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

  // Counterparty typeahead
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
      // Compose row shape with embedded counterparty + counts
      const op: OperationRow = {
        ...data.operation,
        counterparty: {
          id: selectedCounterparty.id,
          legalName: selectedCounterparty.legalName,
          countryCode: selectedCounterparty.countryCode,
          screeningStatus: selectedCounterparty.screeningStatus,
          status: selectedCounterparty.status,
          isHighRiskCountry: false, // unknown from search result; refresh on next list load
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

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
  };
  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.25)",
    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.92)",
  };

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 0.5px rgba(255,255,255,0.06)",
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Reference *
          </label>
          <input
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="ISAR-2026-Q1-001"
            className="w-full rounded-lg px-3 py-2 font-mono text-[13px] outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Operation Type *
          </label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={inputStyle}
          >
            {OPERATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Scheduled Ship Date
          </label>
          <input
            type="date"
            value={scheduledShipDate}
            onChange={(e) => setScheduledShipDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={inputStyle}
          />
        </div>
        <div className="sm:col-span-3">
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Counterparty *
          </label>
          {selectedCounterparty ? (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px]"
              style={inputStyle}
            >
              <span style={{ color: "rgba(255,255,255,0.92)" }}>
                {selectedCounterparty.legalName} (
                {selectedCounterparty.countryCode})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCounterparty(null);
                  setCounterpartySearch("");
                  setCounterpartyId("");
                }}
                className="text-[11px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
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
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle}
              />
              {counterpartyResults.length > 0 && (
                <ul
                  className="mt-2 overflow-hidden rounded-lg"
                  style={{
                    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
                  }}
                >
                  {counterpartyResults.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setSelectedCounterparty(p);
                        setCounterpartyId(p.id);
                      }}
                      className="cursor-pointer px-3 py-2 text-[12px]"
                      style={{
                        background: "rgba(0,0,0,0.20)",
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      <div>{p.legalName}</div>
                      <div
                        className="text-[10px]"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {p.countryCode} · {p.screeningStatus.toLowerCase()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {counterpartySearch && counterpartyResults.length === 0 && (
                <p
                  className="mt-2 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  No matches. Add the counterparty first via Counterparty
                  Screening.
                </p>
              )}
            </>
          )}
        </div>
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Ship From (ISO 2) *
          </label>
          <input
            type="text"
            required
            value={shipFromCountry}
            maxLength={2}
            onChange={(e) => setShipFromCountry(e.target.value.toUpperCase())}
            className="w-full rounded-lg px-3 py-2 text-[13px] uppercase outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Ship To (ISO 2) *
          </label>
          <input
            type="text"
            required
            value={shipToCountry}
            maxLength={2}
            onChange={(e) => setShipToCountry(e.target.value.toUpperCase())}
            placeholder="US"
            className="w-full rounded-lg px-3 py-2 text-[13px] uppercase outline-none"
            style={inputStyle}
          />
        </div>
        <div className="sm:col-span-3">
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={labelStyle}
          >
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What's being shipped? Use case? Free-text for the audit trail."
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />
        </div>
      </div>
      {err && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.10)",
            color: "rgb(248,113,113)",
          }}
        >
          {err}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={
            submitting || !reference || !shipToCountry || !selectedCounterparty
          }
          className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-all disabled:opacity-50"
          style={{
            background: "rgba(16, 185, 129, 0.18)",
            color: "rgb(52,211,153)",
            boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
          }}
        >
          {submitting ? "Creating…" : "Create Operation"}
        </button>
      </div>
    </form>
  );
}
