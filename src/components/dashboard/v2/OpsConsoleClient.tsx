"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Bot,
  Rocket,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Globe,
  Truck,
  Package,
  FileText,
  RefreshCw,
  AlertTriangle,
  Database,
  Filter,
} from "lucide-react";

/**
 * OpsConsoleClient — Mission Ops live event feed (Sprint 7D + UI rewrite).
 *
 * Subscribes to /api/dashboard/ops-console/stream via EventSource and
 * renders an inverted-time-order live feed of every event happening
 * across the platform.
 *
 * What's new in the UI rewrite:
 *  - 11 new trade.* event types added (operations, lines, licenses,
 *    counterparties, screenings, sanctions sync)
 *  - Category-tonal grouping (compliance / trade / astra / mission /
 *    system) drives both filter chips + per-event card colour
 *  - Summary-first cards: the producer-supplied `summary` field renders
 *    as a one-line headline (e.g. "ISAR-2026-Q1 · DRAFT → SCREENING")
 *    so operators don't need to expand JSON to understand what happened
 *  - Filter chips: All / Trade / Compliance / Astra / Mission / System,
 *    with live counts per category
 *  - Per-category quick stats in the status bar
 *  - Improved empty state with category-specific hints
 *
 * # Why EventSource not fetch()
 *
 * Browser `EventSource` is the standard SSE primitive: auto-reconnect
 * on transient disconnects, native `addEventListener("eventname", …)`
 * for typed events. fetch+ReadableStream gives the same data but no
 * auto-reconnect.
 *
 * # Event buffer cap
 *
 * In-memory log capped at 200 entries (FIFO). Filter just reduces what
 * we render — full buffer remains intact when toggling.
 */

type ServerEvent =
  | "connected"
  | "comply.proposal.created"
  | "comply.proposal.applied"
  | "comply.mission.phase_updated"
  | "astra.reasoning"
  // Trade Operations (Wave C)
  | "trade.operation.created"
  | "trade.operation.status_changed"
  | "trade.operation.line_added"
  | "trade.operation.line_removed"
  | "trade.operation.risk_recomputed"
  | "trade.license.attached"
  | "trade.license.detached"
  // Trade Counterparty Screening (Wave A)
  | "trade.party.created"
  | "trade.party.screened"
  | "trade.party.blocked"
  | "trade.screening.decided"
  | "trade.sanctions.synced"
  // System
  | "db-error"
  | "error";

type Category = "system" | "compliance" | "trade" | "astra" | "mission";

interface LogEntry {
  id: string;
  event: ServerEvent;
  receivedAt: string;
  raw: string;
  payload: unknown;
  /** Producer-supplied one-line summary (extracted from payload.summary) */
  summary: string | null;
  category: Category;
}

const EVENT_BUFFER_CAP = 200;

const EVENT_META: Record<
  ServerEvent,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    tone: "emerald" | "cyan" | "amber" | "red" | "slate" | "violet" | "blue";
    category: Category;
  }
> = {
  connected: {
    label: "CONNECTED",
    Icon: CheckCircle2,
    tone: "emerald",
    category: "system",
  },
  "comply.proposal.created": {
    label: "PROPOSAL CREATED",
    Icon: ShieldCheck,
    tone: "amber",
    category: "compliance",
  },
  "comply.proposal.applied": {
    label: "PROPOSAL APPLIED",
    Icon: CheckCircle2,
    tone: "emerald",
    category: "compliance",
  },
  "comply.mission.phase_updated": {
    label: "MISSION PHASE",
    Icon: Rocket,
    tone: "cyan",
    category: "mission",
  },
  "astra.reasoning": {
    label: "ASTRA REASONING",
    Icon: Bot,
    tone: "violet",
    category: "astra",
  },
  // Trade Operations
  "trade.operation.created": {
    label: "OPERATION CREATED",
    Icon: Truck,
    tone: "blue",
    category: "trade",
  },
  "trade.operation.status_changed": {
    label: "OPERATION STATUS",
    Icon: Activity,
    tone: "blue",
    category: "trade",
  },
  "trade.operation.line_added": {
    label: "LINE ADDED",
    Icon: Package,
    tone: "blue",
    category: "trade",
  },
  "trade.operation.line_removed": {
    label: "LINE REMOVED",
    Icon: Package,
    tone: "slate",
    category: "trade",
  },
  "trade.operation.risk_recomputed": {
    label: "RISK RECOMPUTED",
    Icon: RefreshCw,
    tone: "amber",
    category: "trade",
  },
  "trade.license.attached": {
    label: "LICENSE ATTACHED",
    Icon: FileText,
    tone: "emerald",
    category: "trade",
  },
  "trade.license.detached": {
    label: "LICENSE DETACHED",
    Icon: FileText,
    tone: "slate",
    category: "trade",
  },
  // Trade Counterparty
  "trade.party.created": {
    label: "COUNTERPARTY ADDED",
    Icon: Globe,
    tone: "blue",
    category: "trade",
  },
  "trade.party.screened": {
    label: "PARTY SCREENED",
    Icon: ShieldCheck,
    tone: "amber",
    category: "trade",
  },
  "trade.party.blocked": {
    label: "PARTY BLOCKED",
    Icon: ShieldAlert,
    tone: "red",
    category: "trade",
  },
  "trade.screening.decided": {
    label: "SCREENING TRIAGED",
    Icon: AlertTriangle,
    tone: "amber",
    category: "trade",
  },
  "trade.sanctions.synced": {
    label: "SANCTIONS SYNC",
    Icon: Database,
    tone: "cyan",
    category: "trade",
  },
  // System errors
  "db-error": {
    label: "DB ERROR",
    Icon: AlertCircle,
    tone: "red",
    category: "system",
  },
  error: {
    label: "ERROR",
    Icon: AlertCircle,
    tone: "red",
    category: "system",
  },
};

const TONE_CLASSES: Record<
  "emerald" | "cyan" | "amber" | "red" | "slate" | "violet" | "blue",
  { ring: string; icon: string; bg: string; label: string }
> = {
  emerald: {
    ring: "ring-emerald-500/30",
    icon: "text-emerald-400",
    bg: "bg-emerald-500/[0.04]",
    label: "text-emerald-300",
  },
  cyan: {
    ring: "ring-cyan-500/30",
    icon: "text-cyan-400",
    bg: "bg-cyan-500/[0.04]",
    label: "text-cyan-300",
  },
  amber: {
    ring: "ring-amber-500/30",
    icon: "text-amber-400",
    bg: "bg-amber-500/[0.04]",
    label: "text-amber-300",
  },
  red: {
    ring: "ring-red-500/30",
    icon: "text-red-400",
    bg: "bg-red-500/[0.04]",
    label: "text-red-300",
  },
  slate: {
    ring: "ring-white/[0.06]",
    icon: "text-slate-500",
    bg: "bg-white/[0.02]",
    label: "text-slate-400",
  },
  violet: {
    ring: "ring-violet-500/30",
    icon: "text-violet-400",
    bg: "bg-violet-500/[0.04]",
    label: "text-violet-300",
  },
  blue: {
    ring: "ring-blue-500/30",
    icon: "text-blue-400",
    bg: "bg-blue-500/[0.04]",
    label: "text-blue-300",
  },
};

const CATEGORIES: {
  key: Category | "all";
  label: string;
  icon: typeof Filter;
}[] = [
  { key: "all", label: "All", icon: Filter },
  { key: "trade", label: "Trade", icon: Truck },
  { key: "compliance", label: "Compliance", icon: ShieldCheck },
  { key: "astra", label: "Astra", icon: Bot },
  { key: "mission", label: "Mission", icon: Rocket },
  { key: "system", label: "System", icon: Database },
];

const EVENT_TYPES: ServerEvent[] = Object.keys(EVENT_META) as ServerEvent[];

/** Extract producer-supplied summary from a parsed payload, if present. */
function extractSummary(parsed: unknown): string | null {
  if (parsed && typeof parsed === "object") {
    // SSE wrapper has { channel, payload, receivedAt } shape
    const wrapper = parsed as {
      payload?: { summary?: string };
      summary?: string;
    };
    if (typeof wrapper.payload?.summary === "string") {
      return wrapper.payload.summary;
    }
    if (typeof wrapper.summary === "string") {
      return wrapper.summary;
    }
  }
  return null;
}

export function OpsConsoleClient() {
  type ConnState = "connecting" | "connected" | "error" | "disconnected";
  const [conn, setConn] = React.useState<ConnState>("connecting");
  const [connectedAt, setConnectedAt] = React.useState<string | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState<Category | "all">("all");
  const pendingRef = React.useRef<LogEntry[]>([]);
  const pausedRef = React.useRef(false);
  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const appendEntry = React.useCallback(
    (event: ServerEvent, raw: string, parsed: unknown) => {
      const meta = EVENT_META[event];
      const entry: LogEntry = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        event,
        raw,
        payload: parsed,
        receivedAt: new Date().toISOString(),
        summary: extractSummary(parsed),
        category: meta.category,
      };
      if (pausedRef.current) {
        pendingRef.current.push(entry);
      } else {
        setLog((prev) => {
          const next = [entry, ...prev];
          return next.length > EVENT_BUFFER_CAP
            ? next.slice(0, EVENT_BUFFER_CAP)
            : next;
        });
      }
    },
    [],
  );

  React.useEffect(() => {
    const es = new EventSource("/api/dashboard/ops-console/stream");
    setConn("connecting");

    es.addEventListener("open", () => {
      setConn("connected");
    });

    es.addEventListener("error", () => {
      setConn("error");
    });

    const handler = (event: ServerEvent) => (e: MessageEvent) => {
      let parsed: unknown = e.data;
      try {
        parsed = JSON.parse(e.data);
      } catch {
        // raw string stays
      }
      if (event === "connected" && parsed && typeof parsed === "object") {
        const cAt = (parsed as { connectedAt?: string }).connectedAt;
        if (cAt) setConnectedAt(cAt);
      }
      appendEntry(event, e.data, parsed);
    };
    for (const t of EVENT_TYPES) {
      es.addEventListener(t, handler(t));
    }

    return () => {
      es.close();
      setConn("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!paused && pendingRef.current.length > 0) {
      const drained = pendingRef.current.splice(0);
      setLog((prev) => {
        const next = [...drained.reverse(), ...prev];
        return next.length > EVENT_BUFFER_CAP
          ? next.slice(0, EVENT_BUFFER_CAP)
          : next;
      });
    }
  }, [paused]);

  // Per-category counts (computed from full log, not filtered view)
  const categoryCounts = React.useMemo(() => {
    const c: Record<Category, number> = {
      system: 0,
      compliance: 0,
      trade: 0,
      astra: 0,
      mission: 0,
    };
    for (const entry of log) c[entry.category]++;
    return c;
  }, [log]);

  const filteredLog = React.useMemo(() => {
    if (filter === "all") return log;
    return log.filter((e) => e.category === filter);
  }, [log, filter]);

  return (
    <section
      data-testid="ops-console"
      className="palantir-surface flex flex-col rounded-md"
    >
      <StatusBar
        conn={conn}
        connectedAt={connectedAt}
        paused={paused}
        eventCount={log.length}
        onTogglePause={() => setPaused((p) => !p)}
      />

      <FilterChips
        active={filter}
        onChange={setFilter}
        counts={categoryCounts}
        total={log.length}
      />

      <div
        data-testid="ops-console-log"
        className="max-h-[calc(100vh-340px)] overflow-y-auto p-3"
      >
        {filteredLog.length === 0 ? (
          <EmptyHint conn={conn} filter={filter} />
        ) : (
          <ol className="flex flex-col gap-2">
            {filteredLog.map((entry) => (
              <EventCard key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function StatusBar({
  conn,
  connectedAt,
  paused,
  eventCount,
  onTogglePause,
}: {
  conn: "connecting" | "connected" | "error" | "disconnected";
  connectedAt: string | null;
  paused: boolean;
  eventCount: number;
  onTogglePause: () => void;
}) {
  const dotColor =
    conn === "connected"
      ? "bg-emerald-400"
      : conn === "error"
        ? "bg-red-500"
        : conn === "connecting"
          ? "bg-amber-400 animate-pulse"
          : "bg-slate-500";
  const stateLabel = conn.toUpperCase();
  return (
    <div
      data-testid="ops-console-status"
      className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2"
    >
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span className="inline-flex items-center gap-1.5 text-slate-300">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`}
          />
          {stateLabel}
        </span>
        {connectedAt ? (
          <span data-testid="ops-console-since">
            since {new Date(connectedAt).toISOString().slice(11, 19)}
          </span>
        ) : null}
        <span data-testid="ops-console-count">
          <Activity className="mr-1 inline h-3 w-3 text-emerald-400" />
          {eventCount} event{eventCount === 1 ? "" : "s"}
        </span>
      </div>

      <button
        type="button"
        onClick={onTogglePause}
        data-testid="ops-console-pause"
        className="inline-flex items-center gap-1.5 rounded bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300 ring-1 ring-inset ring-white/[0.06] transition hover:bg-white/[0.08] hover:text-slate-100"
      >
        {paused ? (
          <>
            <Play className="h-3 w-3 text-emerald-400" />
            Resume
          </>
        ) : (
          <>
            <Pause className="h-3 w-3 text-amber-400" />
            Pause
          </>
        )}
      </button>
    </div>
  );
}

function FilterChips({
  active,
  onChange,
  counts,
  total,
}: {
  active: Category | "all";
  onChange: (c: Category | "all") => void;
  counts: Record<Category, number>;
  total: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-3 py-2"
      data-testid="ops-console-filters"
    >
      {CATEGORIES.map((cat) => {
        const count = cat.key === "all" ? total : counts[cat.key];
        const isActive = active === cat.key;
        const Icon = cat.icon;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
              isActive
                ? "bg-white/[0.10] text-slate-100 ring-1 ring-inset ring-white/[0.18]"
                : "bg-white/[0.025] text-slate-500 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05] hover:text-slate-300"
            }`}
            data-testid={`ops-console-filter-${cat.key}`}
          >
            <Icon className="h-3 w-3" />
            {cat.label}
            <span
              className={`tabular-nums ${
                isActive ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyHint({
  conn,
  filter,
}: {
  conn: "connecting" | "connected" | "error" | "disconnected";
  filter: Category | "all";
}) {
  const message =
    conn === "connected"
      ? filter === "all"
        ? "Listening for live events…"
        : `No ${filter} events yet`
      : conn === "connecting"
        ? "Connecting…"
        : conn === "error"
          ? "Connection error — retrying…"
          : "Disconnected";

  const hint =
    filter === "all"
      ? "Events stream from Postgres NOTIFY within milliseconds. Try creating a Trade Operation, screening a Counterparty, or running a Risk-Recompute to see the feed populate."
      : filter === "trade"
        ? "Try /dashboard/trade/operations → New Operation, or /dashboard/trade/counterparties → Screen now."
        : filter === "compliance"
          ? "Proposals + mission phase events appear when V2 actions are triggered."
          : filter === "astra"
            ? "Astra reasoning events appear when the AI assistant invokes tools."
            : filter === "mission"
              ? "Mission phase updates appear during ephemeris + spacecraft lifecycle changes."
              : "System events: connection state + DB errors.";

  return (
    <div className="palantir-surface mx-auto my-12 max-w-md rounded-md p-8 text-center">
      <Sparkles className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
      <p className="text-xs text-slate-300">{message}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {hint}
      </p>
    </div>
  );
}

function EventCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = React.useState(false);
  const meta = EVENT_META[entry.event];
  const tone = TONE_CLASSES[meta.tone];
  const Icon = meta.Icon;
  return (
    <li
      data-testid="ops-console-event"
      data-event={entry.event}
      className={`flex flex-col gap-2 rounded-md p-3 ring-1 ring-inset ${tone.ring} ${tone.bg}`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <Icon className={`h-3 w-3 ${tone.icon}`} />
          <span className={tone.label}>{meta.label}</span>
        </div>
        <time
          dateTime={entry.receivedAt}
          className="font-mono text-[9px] uppercase tracking-wider tabular-nums text-slate-500"
        >
          {new Date(entry.receivedAt).toISOString().slice(11, 23)}
        </time>
      </header>

      {/* Producer-supplied summary — the headline */}
      {entry.summary ? (
        <p className="text-[12px] leading-snug text-slate-200">
          {entry.summary}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="self-start font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
      >
        {expanded ? "Collapse payload" : "Expand payload"}
      </button>
      {expanded ? (
        <pre className="overflow-x-auto rounded bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-emerald-200 ring-1 ring-inset ring-white/[0.06]">
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}
