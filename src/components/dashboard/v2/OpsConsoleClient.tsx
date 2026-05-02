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
  Sparkles,
} from "lucide-react";

/**
 * OpsConsoleClient — Sprint 7D (Wow-Pattern #3)
 *
 * Subscribes to /api/dashboard/ops-console/stream via EventSource and
 * renders an inverted-time-order live feed of every event. Two
 * presentation panels:
 *
 *   1. Status bar — connection state + connected-since timer + a
 *      pause/resume control (the operator may want to freeze the
 *      feed while reading a row without losing future events; pause
 *      buffers them and applies on resume).
 *   2. Event log — newest-first list of cards, type-aware icons
 *      and colours, JSON payload expandable on click.
 *
 * # Why EventSource not fetch()
 *
 * Browser `EventSource` is the standard SSE primitive: auto-reconnect
 * on transient disconnects, native `addEventListener("eventname", …)`
 * for typed events. fetch+ReadableStream gives the same data but no
 * auto-reconnect and we'd reimplement the parsing.
 *
 * # Event buffer cap
 *
 * The in-memory log is capped at 200 entries (FIFO). Operators can
 * scroll back through them but the buffer doesn't grow unbounded —
 * a long-running ops day would otherwise leak memory.
 */

type ServerEvent =
  | "connected"
  | "comply.proposal.created"
  | "comply.proposal.applied"
  | "comply.mission.phase_updated"
  | "astra.reasoning"
  | "db-error"
  | "error";

interface LogEntry {
  id: string;
  event: ServerEvent;
  receivedAt: string;
  raw: string; // JSON-stringified payload for expand-toggle
  payload: unknown;
}

const EVENT_BUFFER_CAP = 200;

const EVENT_META: Record<
  ServerEvent,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    tone: "emerald" | "cyan" | "amber" | "red" | "slate";
  }
> = {
  connected: { label: "CONNECTED", Icon: CheckCircle2, tone: "emerald" },
  "comply.proposal.created": {
    label: "PROPOSAL CREATED",
    Icon: ShieldCheck,
    tone: "amber",
  },
  "comply.proposal.applied": {
    label: "PROPOSAL APPLIED",
    Icon: CheckCircle2,
    tone: "emerald",
  },
  "comply.mission.phase_updated": {
    label: "MISSION PHASE",
    Icon: Rocket,
    tone: "cyan",
  },
  "astra.reasoning": { label: "ASTRA REASONING", Icon: Bot, tone: "emerald" },
  "db-error": { label: "DB ERROR", Icon: AlertCircle, tone: "red" },
  error: { label: "ERROR", Icon: AlertCircle, tone: "red" },
};

const TONE_CLASSES: Record<
  "emerald" | "cyan" | "amber" | "red" | "slate",
  { ring: string; icon: string; bg: string }
> = {
  emerald: {
    ring: "ring-emerald-500/30",
    icon: "text-emerald-400",
    bg: "bg-emerald-500/[0.04]",
  },
  cyan: {
    ring: "ring-cyan-500/30",
    icon: "text-cyan-400",
    bg: "bg-cyan-500/[0.04]",
  },
  amber: {
    ring: "ring-amber-500/30",
    icon: "text-amber-400",
    bg: "bg-amber-500/[0.04]",
  },
  red: {
    ring: "ring-red-500/30",
    icon: "text-red-400",
    bg: "bg-red-500/[0.04]",
  },
  slate: {
    ring: "ring-white/[0.06]",
    icon: "text-slate-500",
    bg: "bg-white/[0.02]",
  },
};

export function OpsConsoleClient() {
  type ConnState = "connecting" | "connected" | "error" | "disconnected";
  const [conn, setConn] = React.useState<ConnState>("connecting");
  const [connectedAt, setConnectedAt] = React.useState<string | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const pendingRef = React.useRef<LogEntry[]>([]);
  // Mirror `paused` in a ref so the EventSource handler — captured
  // once per mount — sees the latest pause state without needing to
  // be re-registered when the user toggles it.
  const pausedRef = React.useRef(false);
  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const appendEntry = React.useCallback(
    (event: ServerEvent, raw: string, parsed: unknown) => {
      const entry: LogEntry = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        event,
        raw,
        payload: parsed,
        receivedAt: new Date().toISOString(),
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

  // Set up EventSource once on mount. paused/log state changes are
  // reflected via refs + closures — the SSE connection itself stays
  // open across re-renders.
  React.useEffect(() => {
    const es = new EventSource("/api/dashboard/ops-console/stream");
    setConn("connecting");

    es.addEventListener("open", () => {
      setConn("connected");
    });

    es.addEventListener("error", () => {
      setConn("error");
    });

    const eventTypes: ServerEvent[] = [
      "connected",
      "comply.proposal.created",
      "comply.proposal.applied",
      "comply.mission.phase_updated",
      "astra.reasoning",
      "db-error",
      "error",
    ];
    const handler = (event: ServerEvent) => (e: MessageEvent) => {
      let parsed: unknown = e.data;
      try {
        parsed = JSON.parse(e.data);
      } catch {
        // raw string stays — fine for display.
      }
      if (event === "connected" && parsed && typeof parsed === "object") {
        const cAt = (parsed as { connectedAt?: string }).connectedAt;
        if (cAt) setConnectedAt(cAt);
      }
      appendEntry(event, e.data, parsed);
    };
    for (const t of eventTypes) {
      es.addEventListener(t, handler(t));
    }

    return () => {
      es.close();
      setConn("disconnected");
    };
    // appendEntry depends on `paused`; we want the EventSource to
    // outlive paused-state changes, so we ignore the lint warning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When unpausing, drain the pending buffer.
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

      <div
        data-testid="ops-console-log"
        className="max-h-[calc(100vh-280px)] overflow-y-auto p-3"
      >
        {log.length === 0 ? (
          <EmptyHint conn={conn} />
        ) : (
          <ol className="flex flex-col gap-2">
            {log.map((entry) => (
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

function EmptyHint({
  conn,
}: {
  conn: "connecting" | "connected" | "error" | "disconnected";
}) {
  return (
    <div className="palantir-surface mx-auto my-12 max-w-md rounded-md p-8 text-center">
      <Sparkles className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
      <p className="text-xs text-slate-300">
        {conn === "connected"
          ? "Listening for live events…"
          : conn === "connecting"
            ? "Connecting…"
            : conn === "error"
              ? "Connection error — retrying…"
              : "Disconnected"}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        Events from Postgres NOTIFY will appear here within milliseconds of the
        originating action.
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
          <span className="text-slate-200">{meta.label}</span>
        </div>
        <time
          dateTime={entry.receivedAt}
          className="font-mono text-[9px] uppercase tracking-wider tabular-nums text-slate-500"
        >
          {new Date(entry.receivedAt).toISOString().slice(11, 23)}
        </time>
      </header>

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
