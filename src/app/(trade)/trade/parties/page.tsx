"use client";

/**
 * /trade/parties — Counterparty list (Sprint A2, Indigo light-theme port).
 *
 * Ported from /dashboard/trade/counterparties/page.tsx (Wave-A legacy).
 * Functionality unchanged: searchable table of TradeParty rows with
 * screening-status icons + risk markers, status-filter tabs, inline
 * NewPartyForm posting to /api/trade/parties.
 *
 * Token migration: all rgba(255,255,255,…) inline styles replaced
 * with the --trade-* palette; emerald "New" CTA replaced with the
 * Trade Indigo accent (bg-trade-accent). Detail-page links now point
 * at /trade/parties/[id].
 *
 * Naming note: the legacy module called the resource "Counterparty"
 * and the sidebar entry is "Screening" — we preserve the noun in the
 * page title for compliance jargon clarity, but the URL slug uses
 * "parties" (matching the existing /trade/parties skeleton + the API
 * /api/trade/parties).
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ListSkeleton } from "../_components/Skeletons";
import { tradeStatusLabel } from "@/lib/trade/format";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { Term } from "../_components/Term";
import { BulkActionsBar } from "../_components/BulkActionsBar";
import { buildCsv, downloadCsv } from "@/lib/trade/csv-export";
import { useToast } from "@/components/ui/Toast";
import {
  Search,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Globe,
  ChevronRight,
  X,
  Package,
  Workflow,
  Download,
} from "lucide-react";

interface PartyRow {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
  screeningStatus:
    | "NOT_SCREENED"
    | "CLEAR"
    | "POTENTIAL_MATCH"
    | "CONFIRMED_HIT"
    | "STALE";
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
  lastScreenedAt: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "NOT_SCREENED", label: "Not screened" },
  { key: "POTENTIAL_MATCH", label: "Potential" },
  { key: "CONFIRMED_HIT", label: "Confirmed" },
  { key: "CLEAR", label: "Clear" },
] as const;

export default function CounterpartiesListPage() {
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  // U-CRIT-5 — bulk-select state.
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
      if (prev.size === parties.length && parties.length > 0) return new Set();
      return new Set(parties.map((p) => p.id));
    });
  }, [parties]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "all") params.set("screening", filter);
    fetch(`/api/trade/parties?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setParties(data.parties ?? []);
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
    const rows = parties.filter((p) => selectedIds.has(p.id));
    if (rows.length === 0) {
      toast.warning("Nothing to export", "Select at least one counterparty.");
      return;
    }
    const csv = buildCsv(rows, [
      { header: "ID", get: (p) => p.id },
      { header: "Legal name", get: (p) => p.legalName },
      { header: "Trade name", get: (p) => p.tradeName },
      { header: "Country", get: (p) => p.countryCode },
      { header: "Status", get: (p) => p.status },
      { header: "Screening status", get: (p) => p.screeningStatus },
      { header: "US person", get: (p) => p.isUSPerson },
      { header: "High-risk country", get: (p) => p.isHighRiskCountry },
      { header: "Last screened", get: (p) => p.lastScreenedAt },
      { header: "Created at", get: (p) => p.createdAt },
    ]);
    downloadCsv("caelex-trade-counterparties", csv);
    toast.success(
      "Export started",
      `${rows.length} counterpart${rows.length === 1 ? "y" : "ies"} downloaded as CSV.`,
    );
  };

  const allVisibleSelected =
    parties.length > 0 && selectedIds.size === parties.length;
  const someVisibleSelected = selectedIds.size > 0 && !allVisibleSelected;

  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      {/* Header */}
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
            <span className="text-trade-text-secondary">Counterparties</span>
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
            Counterparty Screening
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-trade-text-secondary">
            OFAC SDN, BIS Entity List, DDTC Debarred — fuzzy-match
            (Jaro-Winkler) mit auditierbarem Snapshot-Hash pro Screening-Lauf.
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
              <Plus className="h-3.5 w-3.5" /> New Counterparty
            </>
          )}
        </button>
      </header>

      {/* Inline create form */}
      {showNewForm && (
        <NewPartyForm
          onCreated={(p) => {
            setParties((prev) => [
              {
                ...p,
                lastScreenedAt: null,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
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
            placeholder="Search by name…"
            className="w-64 bg-transparent text-[13px] text-trade-text-primary outline-none placeholder:text-trade-text-muted"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <ListSkeleton rows={5} label="Loading counterparties" />
      ) : parties.length === 0 ? (
        <EmptyState onNew={() => setShowNewForm(true)} />
      ) : (
        <>
          {/* Select-all header row (U-CRIT-5). */}
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
                    ? `Deselect all ${parties.length} counterparties`
                    : `Select all ${parties.length} counterparties`
                }
                className="h-4 w-4 accent-trade-accent"
              />
            </label>
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${parties.length} selected`
                : `${parties.length} counterpart${parties.length === 1 ? "y" : "ies"}`}
            </span>
          </div>
          <div className="overflow-hidden rounded-md border border-trade-border-subtle">
            {parties.map((p, i) => (
              <PartyRowItem
                key={p.id}
                party={p}
                isFirst={i === 0}
                selected={selectedIds.has(p.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </>
      )}

      {/* Bulk actions bar */}
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

      {/* Mandatory disclaimer */}
      <p
        lang="de"
        className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted"
      >
        Sanctions-Screening ist ein Werkzeug zur Decision-Support, kein Counsel.
        Treffer erfordern menschliche Triage durch qualifizierten AV. Verstöße
        gegen <Term>OFAC</Term>/EU-Sanktionen können zu zivilrechtlichen Bußen
        bis $1.5 Mio. pro Vorgang (US) bzw. Freiheitsstrafen bis 10 Jahre (DE)
        führen.
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function PartyRowItem({
  party,
  isFirst,
  selected,
  onToggleSelect,
}: {
  party: PartyRow;
  isFirst: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
}) {
  const showCheckbox = !!onToggleSelect;
  return (
    <div
      className={`group flex items-center bg-trade-bg-panel transition hover:bg-trade-bg-elevated ${
        isFirst ? "" : "border-t border-trade-border-subtle"
      } ${selected ? "bg-trade-accent-soft/40" : ""}`}
    >
      {showCheckbox ? (
        <label className="flex h-full w-10 shrink-0 cursor-pointer items-center justify-center self-stretch">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onToggleSelect!(party.id, e.target.checked)}
            aria-label={`Select ${party.legalName}`}
            className="h-4 w-4 accent-trade-accent"
          />
        </label>
      ) : null}
      <Link
        href={`/trade/parties/${party.id}`}
        className="flex flex-1 items-center gap-4 px-5 py-4"
      >
        <ScreeningBadge status={party.screeningStatus} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[13px] font-semibold text-trade-text-primary">
              {party.legalName}
            </div>
            {party.tradeName && (
              <span className="text-[11px] text-trade-text-muted">
                ({party.tradeName})
              </span>
            )}
            {party.status === "BLOCKED" && (
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-700 ring-1 ring-red-200">
                Blocked
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-trade-text-muted">
            <Globe className="h-3 w-3" />
            {party.countryCode}
            {party.isHighRiskCountry && (
              <span className="text-amber-600">· high-risk</span>
            )}
            {party.isUSPerson && <span>· US person</span>}
            {party.lastScreenedAt && (
              <span>
                · screened{" "}
                {new Date(party.lastScreenedAt).toLocaleDateString("en-GB")}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-trade-text-muted opacity-0 transition group-hover:opacity-100" />
      </Link>
    </div>
  );
}

function ScreeningBadge({ status }: { status: PartyRow["screeningStatus"] }) {
  const className = "h-5 w-5 shrink-0";
  // Humanized label powers tooltips AND screen-reader announcements.
  // Without it, icon-only badges are invisible to assistive tech.
  // Wrapping in <span title=...> guarantees a visible browser tooltip
  // across all browsers — title on raw <svg> isn't universally honored.
  const label = `Screening status: ${tradeStatusLabel(status)}`;
  const a11yProps = {
    role: "img" as const,
    "aria-label": label,
  };
  const wrap = (icon: ReactNode) => (
    <span title={label} className="inline-flex">
      {icon}
    </span>
  );
  if (status === "CLEAR") {
    return wrap(
      <ShieldCheck
        {...a11yProps}
        className={`${className} text-emerald-600`}
        strokeWidth={1.75}
      />,
    );
  }
  if (status === "POTENTIAL_MATCH") {
    return wrap(
      <AlertTriangle
        {...a11yProps}
        className={`${className} text-amber-500`}
        strokeWidth={1.75}
      />,
    );
  }
  if (status === "CONFIRMED_HIT") {
    return wrap(
      <ShieldAlert
        {...a11yProps}
        className={`${className} text-red-600`}
        strokeWidth={1.75}
      />,
    );
  }
  if (status === "STALE") {
    return wrap(
      <Shield
        {...a11yProps}
        className={`${className} text-orange-500`}
        strokeWidth={1.75}
      />,
    );
  }
  return wrap(
    <Shield
      {...a11yProps}
      className={`${className} text-trade-text-muted`}
      strokeWidth={1.5}
    />,
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <EmptyStateRich
      icon={Shield}
      title="No counterparties yet"
      description="Add a counterparty to screen against OFAC SDN, BIS Entity, DDTC Debarred, UK OFSI, and UN Consolidated. Hits surface immediately with audit-grade snapshots."
      primaryAction={{ label: "Add first counterparty", onClick: onNew }}
      astra={{
        label: "Ask Astra about screening",
        prefill:
          "How does Caelex screen counterparties? Which sanctions lists are covered, and how does the OFAC 50% Rule cascade work for beneficial owners?",
      }}
      secondaryActions={[
        {
          label: "Browse items to ship",
          href: "/trade/items",
          icon: Package,
        },
        {
          label: "Plan an operation",
          href: "/trade/operations",
          icon: Workflow,
        },
      ]}
    />
  );
}

interface NewPartyResp {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  status: "ACTIVE";
  screeningStatus: "NOT_SCREENED";
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
}

function NewPartyForm({ onCreated }: { onCreated: (p: NewPartyResp) => void }) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade/parties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          legalName,
          tradeName: tradeName || undefined,
          countryCode: countryCode.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to create");
        return;
      }
      onCreated(data.party);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Legal Name *
          </label>
          <input
            type="text"
            required
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="e.g. ICEYE Polska sp. z o.o."
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Country (ISO 2) *
          </label>
          <input
            type="text"
            required
            value={countryCode}
            maxLength={2}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="DE"
            className={`${inputClass} uppercase`}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Trade Name (optional)
          </label>
          <input
            type="text"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="d/b/a name if different"
            className={inputClass}
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
          disabled={submitting || !legalName || !countryCode}
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Counterparty"}
        </button>
      </div>
    </form>
  );
}
