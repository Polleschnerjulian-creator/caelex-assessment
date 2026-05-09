"use client";

/**
 * Sprint E2 — Audit log client island.
 *
 * Owns: filter state (action / entityType / actor / date range /
 * free-text), URL sync (filters reflected in query string for
 * deep-linking + browser history), pagination ("Load more").
 *
 * The server component owns the *initial* data fetch. After any
 * filter change the client refetches via `/api/audit-log` to keep
 * the page interactive without forcing a full server roundtrip.
 *
 * Single canonical row component handles: actor avatar, action verb
 * pill, description, entity link (if known type), timestamp,
 * expand-on-click for hash + IP + user-agent forensic detail.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  Search,
  X,
  Calendar,
  User2,
  Tag,
  Box,
  Loader2,
  ChevronDown,
  Fingerprint,
  Globe,
  Monitor,
} from "lucide-react";
import {
  Card,
  CardHeader,
  EmptyState,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  entryHash: string | null;
  previousHash: string | null;
  actor: {
    userId: string | null;
    name: string | null;
    email: string | null;
  };
}

interface DistinctActor {
  userId: string | null;
  name: string | null;
  email: string | null;
}

interface Filters {
  action: string | null;
  entityType: string | null;
  actor: string | null;
  from: string | null;
  to: string | null;
  q: string | null;
}

interface Props {
  initialLogs: AuditRow[];
  initialTotal: number;
  distinctActors: DistinctActor[];
  distinctActions: string[];
  distinctEntityTypes: string[];
  initialFilters: Filters;
}

const PAGE_SIZE = 50;

export function AuditLogClient({
  initialLogs,
  initialTotal,
  distinctActors,
  distinctActions,
  distinctEntityTypes,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [logs, setLogs] = React.useState<AuditRow[]>(initialLogs);
  const [total, setTotal] = React.useState(initialTotal);
  const [filters, setFilters] = React.useState<Filters>(initialFilters);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  // Sprint UF57 (P1-H3) — busy-state for the full-export path so the
  // button can show a spinner instead of letting the operator wonder
  // whether their click was registered.
  const [exportingFull, setExportingFull] = React.useState(false);

  const hasFilters =
    filters.action ||
    filters.entityType ||
    filters.actor ||
    filters.from ||
    filters.to ||
    filters.q;

  const hasMore = logs.length < total;

  // Refetch on filter change (debounced for free-text search). URL is
  // synced for deep-linkable filtered views.
  const refetchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    // Update URL (no router.push to avoid history churn — replace).
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.q) params.set("q", filters.q);
    const qs = params.toString();
    const url = qs ? `/dashboard/audit-log?${qs}` : "/dashboard/audit-log";
    window.history.replaceState({}, "", url);

    // Debounce free-text; immediate for everything else.
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(
      () => {
        void refetch(filters);
      },
      filters.q ? 250 : 0,
    );
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.action,
    filters.entityType,
    filters.actor,
    filters.from,
    filters.to,
    filters.q,
  ]);

  async function refetch(f: Filters) {
    setLoading(true);
    try {
      const url = filterToUrl(f, 0, PAGE_SIZE);
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        logs: AuditRow[];
        total: number;
      };
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const url = filterToUrl(filters, logs.length, PAGE_SIZE);
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        logs: AuditRow[];
        total: number;
      };
      setLogs((prev) => [...prev, ...data.logs]);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }

  function clearAllFilters() {
    setFilters({
      action: null,
      entityType: null,
      actor: null,
      from: null,
      to: null,
      q: null,
    });
  }

  /**
   * Sprint UF57 (P1-H3) — CSV export now defaults to ALL matching rows,
   * not just the in-memory page.
   *
   * Audit found the previous version silently exported only `logs.length`
   * rows (whatever the user had loaded) — for a 12k-row org that
   * "audit log export" silently dropped 95% of evidence and the
   * regulator never knew. Honest fix: paginate the API in 100-row
   * windows until exhausted, with a hard cap (10k) to prevent
   * accidental browser-tab-killer exports.
   *
   * Trade-off: a 10k-row export does ~100 sequential fetches (~10s on
   * a normal connection). Acceptable for a one-off compliance export
   * — the operator can always narrow the filter to make it faster.
   * For huge orgs we'd add a server-side streaming endpoint later;
   * keeping it client-paginated avoids a new API surface for now.
   */
  const HARD_EXPORT_CAP = 10_000;

  function csvHeader(): string[] {
    return [
      "timestamp",
      "actor",
      "action",
      "entity_type",
      "entity_id",
      "description",
      "ip_address",
      "entry_hash",
    ];
  }
  function escape(v: string | null) {
    if (!v) return "";
    if (v.includes(",") || v.includes('"') || v.includes("\n"))
      return `"${v.replace(/"/g, '""')}"`;
    return v;
  }
  function rowsToCsv(items: typeof logs): string {
    const header = csvHeader();
    const rows = items.map((l) =>
      [
        l.timestamp,
        l.actor.email ?? l.actor.name ?? l.actor.userId ?? "",
        l.action,
        l.entityType,
        l.entityId,
        l.description ?? "",
        l.ipAddress ?? "",
        l.entryHash ?? "",
      ]
        .map(escape)
        .join(","),
    );
    return [header.join(","), ...rows].join("\n");
  }

  function downloadCsv(csv: string, suffix = "") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    link.download = `audit-log-${date}${suffix}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Visible-rows export (legacy fast path).
  function exportCsvVisible() {
    downloadCsv(rowsToCsv(logs), "-page");
  }

  // Sprint UF57 — Full filtered export. Loops the API in 100-row pages
  // until total is exhausted or HARD_EXPORT_CAP is reached. Surfaces
  // progress via the `exportingFull` state so the operator gets a
  // spinner instead of a frozen-tab feeling.
  async function exportCsvAll() {
    if (exportingFull) return;
    setExportingFull(true);
    try {
      const all: typeof logs = [];
      const pageSize = 100;
      let offset = 0;
      while (offset < HARD_EXPORT_CAP) {
        const res = await fetch(filterToUrl(filters, offset, pageSize));
        if (!res.ok) break;
        const data = (await res.json()) as { logs: typeof logs; total: number };
        all.push(...data.logs);
        if (data.logs.length < pageSize) break; // exhausted
        if (data.total > 0 && all.length >= data.total) break;
        offset += pageSize;
      }
      downloadCsv(
        rowsToCsv(all),
        all.length >= HARD_EXPORT_CAP ? `-capped-${HARD_EXPORT_CAP}` : "-full",
      );
    } finally {
      setExportingFull(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardHeader
          icon={Filter}
          title="Filters"
          subtitle={
            hasFilters
              ? `${total.toLocaleString()} matching event${total === 1 ? "" : "s"}`
              : "Free-text search across description + entityId, exact-match on action / entity / actor."
          }
          trailing={
            hasFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            ) : null
          }
        />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Free-text search */}
          <FilterField label="Search" icon={Search} full>
            <input
              type="search"
              value={filters.q ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, q: e.target.value || null }))
              }
              placeholder="Description, entity ID…"
              className={inputClass}
            />
          </FilterField>

          {/* Action */}
          <FilterField label="Action" icon={Tag}>
            <select
              value={filters.action ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, action: e.target.value || null }))
              }
              className={inputClass}
            >
              <option value="">Any action</option>
              {distinctActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </FilterField>

          {/* Entity type */}
          <FilterField label="Entity type" icon={Box}>
            <select
              value={filters.entityType ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  entityType: e.target.value || null,
                }))
              }
              className={inputClass}
            >
              <option value="">Any type</option>
              {distinctEntityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FilterField>

          {/* Actor */}
          <FilterField label="Actor" icon={User2}>
            <select
              value={filters.actor ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, actor: e.target.value || null }))
              }
              className={inputClass}
            >
              <option value="">Any actor</option>
              {distinctActors
                .filter((a): a is DistinctActor & { userId: string } =>
                  Boolean(a.userId),
                )
                .map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.name ?? a.email ?? a.userId.slice(0, 8)}
                  </option>
                ))}
            </select>
          </FilterField>

          {/* From date */}
          <FilterField label="From" icon={Calendar}>
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value || null }))
              }
              className={inputClass}
            />
          </FilterField>

          {/* To date */}
          <FilterField label="To" icon={Calendar}>
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value || null }))
              }
              className={inputClass}
            />
          </FilterField>
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-white/[0.05] bg-white/[0.012] px-5 py-2.5">
          <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Filtering…
              </>
            ) : (
              <span>
                Showing{" "}
                <span className="tabular-nums text-slate-300">
                  {logs.length}
                </span>{" "}
                of{" "}
                <span className="tabular-nums text-slate-300">
                  {total.toLocaleString()}
                </span>
              </span>
            )}
          </div>
          {/* Sprint UF57 (P1-H3) — Two export buttons:
              "Export page" keeps the original quick-export path
              (current visible rows); "Export all matching" paginates
              the API and bundles every matching row up to a 10k cap.
              The full-export is the safe default for compliance
              evidence — silent partial exports were the audit's
              concern. */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsvVisible}
              disabled={logs.length === 0 || exportingFull}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[11.5px] font-medium text-slate-200 transition hover:border-white/[0.14] hover:bg-white/[0.05] disabled:opacity-40"
              title="Export only the rows currently loaded in the table"
            >
              Export page
            </button>
            <button
              type="button"
              onClick={exportCsvAll}
              disabled={total === 0 || exportingFull}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-emerald-200 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.12] disabled:opacity-40"
              title={`Export all matching rows (up to ${HARD_EXPORT_CAP.toLocaleString()})`}
            >
              {exportingFull
                ? `Exporting…`
                : `Export all (${Math.min(total, HARD_EXPORT_CAP).toLocaleString()})`}
            </button>
          </div>
        </footer>
      </Card>

      {/* Results */}
      {logs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Fingerprint}
            title={
              hasFilters
                ? "No events match these filters"
                : "No audit events yet"
            }
            description={
              hasFilters
                ? "Loosen the filters or clear them to see more events."
                : "Events appear here as soon as anyone in your org takes an audited action — assessments, document uploads, screenings, NIS2 phase submissions."
            }
            cta={
              hasFilters
                ? { label: "Clear filters", href: "/dashboard/audit-log" }
                : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-white/[0.04]">
            {logs.map((row) => (
              <AuditRowItem
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === row.id ? null : row.id))
                }
              />
            ))}
          </ul>
          {hasMore ? (
            <div className="border-t border-white/[0.05] bg-white/[0.012] px-4 py-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-300 transition hover:text-emerald-200 disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {loadingMore
                  ? "Loading…"
                  : `Load ${Math.min(PAGE_SIZE, total - logs.length)} more`}
              </button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function AuditRowItem({
  row,
  expanded,
  onToggle,
}: {
  row: AuditRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = actionTone(row.action);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-white/[0.015] ${
          expanded ? "bg-white/[0.02]" : ""
        }`}
        aria-expanded={expanded}
      >
        <Avatar actor={row.actor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[12.5px] font-medium text-slate-100">
              {row.actor.name ?? row.actor.email ?? "Unknown actor"}
            </span>
            <StatusPill tone={tone} size="sm">
              {row.action}
            </StatusPill>
            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] text-slate-300 ring-1 ring-inset ring-white/[0.06]">
              {row.entityType}
            </span>
          </div>
          {row.description ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-400">
              {row.description}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-slate-500">
            <time dateTime={row.timestamp} className="font-mono tabular-nums">
              {formatTimestamp(row.timestamp)}
            </time>
            {row.entityId ? (
              <span className="font-mono">id={row.entityId.slice(0, 12)}…</span>
            ) : null}
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded ? <AuditRowExpanded row={row} /> : null}
    </li>
  );
}

function AuditRowExpanded({ row }: { row: AuditRow }) {
  return (
    <div className="border-t border-white/[0.04] bg-white/[0.01] px-5 py-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[11.5px] sm:grid-cols-2">
        <DefRow label="Actor email" value={row.actor.email ?? "—"} mono />
        <DefRow label="Actor user-id" value={row.actor.userId ?? "—"} mono />
        <DefRow label="Entity ID" value={row.entityId} mono />
        <DefRow label="Timestamp (ISO)" value={row.timestamp} mono />
        {row.ipAddress ? (
          <DefRow label="IP address" value={row.ipAddress} mono icon={Globe} />
        ) : null}
        {row.userAgent ? (
          <DefRow
            label="User agent"
            value={row.userAgent}
            mono
            icon={Monitor}
            truncate
          />
        ) : null}
        {row.entryHash ? (
          <DefRow
            label="Entry hash (SHA-256)"
            value={row.entryHash}
            mono
            icon={Fingerprint}
            truncate
          />
        ) : null}
        {row.previousHash ? (
          <DefRow
            label="Previous hash"
            value={row.previousHash}
            mono
            truncate
          />
        ) : null}
      </dl>
    </div>
  );
}

function DefRow({
  label,
  value,
  mono,
  icon: Icon,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </dt>
      <dd
        className={`min-w-0 flex-1 ${truncate ? "truncate" : ""} ${
          mono ? "font-mono" : ""
        } text-slate-300`}
      >
        {value}
      </dd>
    </div>
  );
}

function FilterField({
  label,
  icon: Icon,
  full,
  children,
}: {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${full ? "sm:col-span-full" : ""}`}
    >
      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {children}
    </label>
  );
}

function Avatar({ actor }: { actor: AuditRow["actor"] }) {
  const initial = (actor.name ?? actor.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.18] to-white/[0.06] text-[11px] font-semibold text-slate-100 ring-1 ring-inset ring-white/[0.08]"
    >
      {initial}
    </span>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[12.5px] text-slate-100 placeholder:text-slate-600 transition outline-none hover:bg-white/[0.04] focus:border-emerald-500/40 focus:bg-white/[0.04] focus:ring-2 focus:ring-emerald-500/15";

function filterToUrl(f: Filters, offset: number, limit: number): string {
  const url = new URL("/api/audit-log", window.location.origin);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  if (f.action) url.searchParams.set("action", f.action);
  if (f.entityType) url.searchParams.set("entityType", f.entityType);
  if (f.actor) url.searchParams.set("actor", f.actor);
  if (f.from) url.searchParams.set("from", f.from);
  if (f.to) url.searchParams.set("to", f.to);
  if (f.q) url.searchParams.set("q", f.q);
  return url.toString();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Compact ISO-like: "2026-05-08 14:32:08"
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Map an action verb to a tone for the StatusPill. Heuristic: words
 * containing "create"/"add" → emerald, "delete"/"removed" → rose,
 * "update"/"changed" → amber, "viewed"/"read" → slate, else cyan.
 */
function actionTone(
  action: string,
): "emerald" | "amber" | "rose" | "cyan" | "slate" {
  const a = action.toLowerCase();
  if (
    a.includes("create") ||
    a.includes("added") ||
    a.includes("approved") ||
    a.includes("attached") ||
    a.includes("assigned")
  ) {
    return "emerald";
  }
  if (
    a.includes("delete") ||
    a.includes("removed") ||
    a.includes("revoked") ||
    a.includes("rejected") ||
    a.includes("blocked") ||
    a.includes("archived")
  ) {
    return "rose";
  }
  if (
    a.includes("update") ||
    a.includes("changed") ||
    a.includes("snoozed") ||
    a.includes("status_changed")
  ) {
    return "amber";
  }
  if (a.includes("viewed") || a.includes("verified")) {
    return "slate";
  }
  return "cyan";
}
