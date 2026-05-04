"use client";

import * as React from "react";
import { Activity, Clock, Heart, Zap } from "lucide-react";

import {
  PULSE_BUCKET_COUNT,
  PULSE_BUCKET_MINUTES,
  type HealthPulseSnapshot,
} from "@/lib/comply-v2/health-pulse.server";

/**
 * HealthPulseClient — Sprint 10D (Wow-Pattern #9)
 *
 * Renders the compliance pulse-line + live event ticker. Subscribes
 * to the Sprint 7D /api/dashboard/ops-console/stream SSE feed and:
 *
 *   1. Increments the most-recent bucket on every incoming event
 *   2. Triggers a brief "pulse" animation via a CSS keyframe class
 *   3. Updates the "last event" timestamp in the status row
 *
 * # Why we re-use ops-console/stream rather than build a new endpoint
 *
 * The wire-shape we need (any DB event triggers a tick) is exactly
 * what 7D already streams. Building a dedicated /api/dashboard/
 * health-pulse/stream would duplicate the listenForDbEvents wiring
 * with no added value. One subscription per browser tab is also
 * cheaper for Neon connection-count.
 *
 * # Bucket-shift policy
 *
 * The snapshot's buckets are aligned to wall-clock 5-min boundaries.
 * If the page stays open across a boundary (e.g. page mounted at
 * 13:09, currently 13:11 → still bucket [13:05–13:10]), we don't
 * shift — the bucket alignment matches the server's snapshot. We
 * could implement client-side rolling on a setInterval but that's
 * a follow-up; the 5-min cadence is slow enough that staleness
 * doesn't visibly disrupt the demo.
 */

export interface HealthPulseClientProps {
  initialSnapshot: HealthPulseSnapshot;
  /** False when the user has no primary-org membership; the chart
   *  renders the empty-state hint instead of the pulse line. */
  hasOrg: boolean;
}

const PULSE_FLASH_DURATION_MS = 1200;

export function HealthPulseClient({
  initialSnapshot,
  hasOrg,
}: HealthPulseClientProps) {
  const [buckets, setBuckets] = React.useState(initialSnapshot.buckets);
  const [totalEvents, setTotalEvents] = React.useState(
    initialSnapshot.totalEvents,
  );
  const [lastEventAt, setLastEventAt] = React.useState(
    initialSnapshot.lastEventAt,
  );
  const [pulsing, setPulsing] = React.useState(false);
  const [conn, setConn] = React.useState<"connecting" | "connected" | "error">(
    "connecting",
  );
  const pulseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const triggerPulse = React.useCallback(() => {
    setPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setPulsing(false);
    }, PULSE_FLASH_DURATION_MS);
  }, []);

  React.useEffect(() => {
    if (!hasOrg) {
      setConn("error");
      return;
    }
    const es = new EventSource("/api/dashboard/ops-console/stream");
    es.addEventListener("open", () => setConn("connected"));
    es.addEventListener("error", () => setConn("error"));

    const onEvent = () => {
      setTotalEvents((t) => t + 1);
      setLastEventAt(new Date().toISOString());
      // Bump the latest bucket — visualisation shows the spike on
      // the right side of the chart.
      setBuckets((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice();
        next[next.length - 1] = {
          ...next[next.length - 1],
          count: next[next.length - 1].count + 1,
        };
        return next;
      });
      triggerPulse();
    };

    const eventTypes = [
      "comply.proposal.created",
      "comply.proposal.applied",
      "comply.mission.phase_updated",
      "astra.reasoning",
    ];
    for (const t of eventTypes) {
      es.addEventListener(t, onEvent);
    }

    return () => {
      es.close();
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [hasOrg, triggerPulse]);

  if (!hasOrg) {
    return (
      <div className="palantir-surface mx-auto max-w-md rounded-md p-12 text-center">
        <Heart className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
        <p className="text-sm text-slate-200">No organization membership</p>
        <p className="mt-2 text-xs text-slate-500">
          Health pulse activates once you join an organization. Audit-log events
          will start populating the pulse line as your team works.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="health-pulse" className="space-y-4">
      <StatusRow
        conn={conn}
        totalEvents={totalEvents}
        baselineEventsPerHour={initialSnapshot.baselineEventsPerHour}
        lastEventAt={lastEventAt}
        pulsing={pulsing}
      />
      <PulseChart buckets={buckets} pulsing={pulsing} />
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function StatusRow({
  conn,
  totalEvents,
  baselineEventsPerHour,
  lastEventAt,
  pulsing,
}: {
  conn: "connecting" | "connected" | "error";
  totalEvents: number;
  baselineEventsPerHour: number;
  lastEventAt: string | null;
  pulsing: boolean;
}) {
  const dotColor =
    conn === "connected"
      ? "bg-emerald-400"
      : conn === "error"
        ? "bg-red-500"
        : "bg-amber-400 animate-pulse";
  const trend =
    baselineEventsPerHour === 0
      ? "—"
      : totalEvents >= baselineEventsPerHour
        ? "above baseline"
        : "below baseline";

  return (
    <div
      data-testid="health-pulse-status"
      className="palantir-surface flex flex-wrap items-center justify-between gap-4 rounded-md p-4"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
            {conn.toUpperCase()}
          </span>
        </div>
        <div
          data-testid="health-pulse-counter"
          className={`flex items-center gap-2 transition-colors duration-300 ${pulsing ? "text-emerald-300" : "text-slate-200"}`}
        >
          <Activity
            className={`h-3.5 w-3.5 ${pulsing ? "text-emerald-300" : "text-slate-500"}`}
          />
          <span className="font-mono text-base font-semibold tabular-nums">
            {totalEvents}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
            events / last hour · {trend}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {lastEventAt ? (
          <span data-testid="health-pulse-last-event">
            <Clock className="mr-1 inline h-3 w-3" />
            last {lastEventAt.slice(11, 19)}
          </span>
        ) : (
          <span>no events yet</span>
        )}
        <span>baseline {baselineEventsPerHour}/hr (24h avg)</span>
      </div>
    </div>
  );
}

function PulseChart({
  buckets,
  pulsing,
}: {
  buckets: HealthPulseSnapshot["buckets"];
  pulsing: boolean;
}) {
  // Render a simple stroked SVG polyline scaled to maxCount. Browsers
  // render this fine without a chart lib; the pulse-feel comes from
  // the conditional emerald glow + a CSS-keyframe `animate-pulse`
  // applied to the rightmost dot when an event lands.
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const width = 600;
  const height = 140;
  const padding = 12;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const stepX = buckets.length > 1 ? usableW / (buckets.length - 1) : 0;

  const points = buckets.map((b, i) => {
    const x = padding + i * stepX;
    const y = padding + usableH - (b.count / maxCount) * usableH;
    return { x, y, count: b.count, bucketStart: b.bucketStart };
  });

  const polyline = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div
      data-testid="health-pulse-chart"
      className="palantir-surface rounded-md p-4"
    >
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
          <Heart
            className={`h-3 w-3 ${pulsing ? "text-emerald-300 animate-pulse" : "text-emerald-400"}`}
          />
          PULSE · {PULSE_BUCKET_COUNT} × {PULSE_BUCKET_MINUTES}-MIN
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
          peak {maxCount} events
        </span>
      </header>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full"
        preserveAspectRatio="none"
        aria-label="Compliance event pulse over the last hour"
      >
        {/* Baseline grid */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
        {/* Pulse polyline */}
        <polyline
          data-testid="pulse-polyline"
          fill="none"
          stroke="rgb(52 211 153)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
        {/* Bucket dots */}
        {points.map((p, i) => {
          const isLatest = i === points.length - 1;
          return (
            <circle
              key={i}
              data-testid="pulse-bucket"
              data-latest={isLatest}
              cx={p.x}
              cy={p.y}
              r={isLatest ? (pulsing ? 5 : 3) : 2}
              fill={p.count > 0 ? "rgb(52 211 153)" : "rgba(255,255,255,0.15)"}
              className={
                isLatest && pulsing ? "transition-all duration-300" : undefined
              }
            >
              <title>
                {p.bucketStart.slice(11, 16)} — {p.count} event
                {p.count === 1 ? "" : "s"}
              </title>
            </circle>
          );
        })}
        {/* Pulse-flash glow on the latest dot */}
        {points.length > 0 && pulsing ? (
          <circle
            data-testid="pulse-flash"
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={10}
            fill="rgb(52 211 153)"
            opacity={0.25}
            className="animate-ping"
          />
        ) : null}
      </svg>
      <footer className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-slate-600">
        <span>{buckets[0]?.bucketStart.slice(11, 16) ?? "—"}</span>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3" />
          live
        </span>
        <span>now</span>
      </footer>
    </div>
  );
}
