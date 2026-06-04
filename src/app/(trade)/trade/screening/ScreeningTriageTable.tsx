"use client";

/**
 * ScreeningTriageTable — the sanctions triage work queue (UI Phase 3C).
 *
 * Built on the Phase-3A TradeTable<T> primitive. Fetches the parties
 * screening cohort from the existing /api/trade/parties endpoint (the same
 * data the sidebar badge + Action Inbox read), orders it by urgency via the
 * pure deriveTriageQueue(), and exposes status-filter chips + a single bulk
 * action: "re-screen selected" (POST /api/trade/parties/screen-batch).
 *
 * There is intentionally NO bulk false-positive dismiss. Every potential
 * match is resolved INDIVIDUALLY in the ResolutionDrawer (via the existing
 * decide route) with its own justification — opened by the per-row "Review"
 * button.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Globe, RefreshCw, ScanLine, Loader2 } from "lucide-react";
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
import { ScreeningBadge } from "../_components/ScreeningBadge";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { ResolutionDrawer } from "./ResolutionDrawer";
import {
  deriveTriageQueue,
  triageReason,
  summarizeBatch,
  TRIAGE_QUEUE_STATUSES,
  type TriageInputRow,
  type TriageRow,
  type TriageScreeningStatus,
} from "@/lib/trade/screening-triage";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "POTENTIAL_MATCH", label: "Potential" },
  { key: "STALE", label: "Stale" },
  { key: "NOT_SCREENED", label: "Not screened" },
  { key: "CONFIRMED_HIT", label: "Confirmed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function relativeDays(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return "today";
  return `${days} d ago`;
}

export function ScreeningTriageTable() {
  const toast = useToast();
  const [raw, setRaw] = useState<TriageInputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState<FilterKey>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [rescreening, setRescreening] = useState(false);
  // Debounce the search box so typing doesn't fire a fetch per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Abort the prior in-flight reload so a slower older response can't overwrite
  // a newer query's results (out-of-order race).
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch the queue. ALL ⇒ fetch the 3 queue statuses + merge; a specific
  // chip ⇒ single ?screening= server call (incl. CONFIRMED_HIT on demand).
  const reload = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const statuses: TriageScreeningStatus[] =
        filterKey === "ALL"
          ? [...TRIAGE_QUEUE_STATUSES]
          : [filterKey as TriageScreeningStatus];
      const results = await Promise.all(
        statuses.map((s) => {
          const p = new URLSearchParams({ screening: s, limit: "50" });
          if (debouncedSearch) p.set("q", debouncedSearch);
          return fetch(`/api/trade/parties?${p}`, {
            signal: ctrl.signal,
          }).then((r) => r.json());
        }),
      );
      if (ctrl.signal.aborted) return;
      const merged: TriageInputRow[] = results.flatMap(
        (d) => (d.parties as TriageInputRow[]) ?? [],
      );
      setRaw(merged);
    } catch (e) {
      // A superseded reload aborts its fetches — expected, not an error.
      if ((e as Error)?.name === "AbortError") return;
      toast.error("Could not load queue", "Please try again.");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [filterKey, debouncedSearch, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterKey, debouncedSearch]);

  const include = useMemo<ReadonlySet<TriageScreeningStatus>>(
    () =>
      filterKey === "ALL"
        ? TRIAGE_QUEUE_STATUSES
        : new Set([filterKey as TriageScreeningStatus]),
    [filterKey],
  );
  // `now` is computed once per (raw, include) recompute so ordering is stable
  // between renders but refreshes when the data does.
  const rows = useMemo(
    () => deriveTriageQueue(raw, new Date(), include),
    [raw, include],
  );

  async function rescreenSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setRescreening(true);
    try {
      const res = await fetch("/api/trade/parties/screen-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partyIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Re-screen failed", data.error ?? "Please try again.");
        return;
      }
      const s = data.summary ?? summarizeBatch(data.items ?? []);
      toast.success(
        "Re-screen complete",
        `${s.ok}/${s.total} screened · ${s.newPotentialMatches} new potential match(es).`,
      );
      setSelectedIds(new Set());
      void reload();
    } catch {
      toast.error("Re-screen failed", "Network error — please try again.");
    } finally {
      setRescreening(false);
    }
  }

  const columns: TradeColumn<TriageRow>[] = [
    {
      key: "screeningStatus",
      header: "Screening",
      sortBy: (r) => r.urgencyRank,
      render: (r) => <ScreeningBadge status={r.screeningStatus} />,
    },
    {
      key: "legalName",
      header: "Counterparty",
      sortBy: (r) => r.legalName.toLowerCase(),
      render: (r) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-trade-text-primary">
              {r.legalName}
            </span>
            {r.tradeName && (
              <span className="text-[11px] text-trade-text-muted">
                ({r.tradeName})
              </span>
            )}
            {r.status === "BLOCKED" && (
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-700 ring-1 ring-red-200">
                Blocked
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-trade-text-muted">
            <Globe className="h-3 w-3" />
            {r.countryCode}
            {r.isHighRiskCountry && (
              <span className="text-amber-600">· high-risk</span>
            )}
            {r.isUSPerson && <span>· US person</span>}
          </div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Why",
      sortBy: (r) => r.urgencyRank,
      render: (r) => (
        <span className="text-[12px] text-trade-text-secondary">
          {triageReason(r)}
        </span>
      ),
    },
    {
      key: "lastScreened",
      header: "Last screened",
      sortBy: (r) => r.lastScreenedMs,
      render: (r) => (
        <span className="text-[12px] text-trade-text-muted">
          {relativeDays(r.lastScreenedMs)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) =>
        r.screeningStatus === "POTENTIAL_MATCH" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDrawerId(r.id);
            }}
            className="rounded-md border border-trade-border bg-trade-bg-panel px-2.5 py-1 text-[12px] font-medium text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
          >
            Review
          </button>
        ) : null,
    },
  ];

  const filterSlot = FILTERS.map((f) => {
    const active = filterKey === f.key;
    return (
      <button
        key={f.key}
        type="button"
        onClick={() => setFilterKey(f.key)}
        aria-pressed={active}
        className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
          active
            ? "border border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
            : "border border-trade-border-subtle bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
        }`}
      >
        {f.label}
      </button>
    );
  });

  return (
    <>
      <TradeTable<TriageRow>
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkNoun="party"
        bulkActions={
          <button
            type="button"
            onClick={rescreenSelected}
            disabled={rescreening}
            className="inline-flex items-center gap-1.5 rounded-full bg-trade-accent px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
          >
            {rescreening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Re-screen
          </button>
        }
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search counterparties…",
        }}
        filters={
          <div className="flex flex-wrap items-center gap-1.5">
            {filterSlot}
          </div>
        }
        resultCount={rows.length}
        loading={loading}
        initialSort={{ key: "screeningStatus", dir: "asc" }}
        emptyState={
          <EmptyStateRich
            icon={ScanLine}
            title="Nothing to triage"
            description="No potential matches, stale, or unscreened counterparties. New sanctions hits surface here the moment screening flags them."
            primaryAction={{
              label: "Refresh queue",
              icon: RefreshCw,
              onClick: () => {
                void reload();
              },
            }}
            secondaryActions={[
              { label: "Open counterparties", href: "/trade/parties" },
            ]}
          />
        }
      />
      {drawerId && (
        <ResolutionDrawer
          partyId={drawerId}
          onClose={() => setDrawerId(null)}
          onResolved={() => {
            void reload();
          }}
        />
      )}
    </>
  );
}
