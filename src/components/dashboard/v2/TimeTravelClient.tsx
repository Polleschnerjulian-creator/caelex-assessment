"use client";

import * as React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Clock,
} from "lucide-react";

import type { PostureTrendPoint } from "@/lib/comply-v2/posture-snapshot.server";

/**
 * TimeTravelClient — Sprint 10F (Wow-Pattern #12)
 *
 * Slider UI over a PostureTrendPoint[] array. Each slider position
 * is one snapshot day. Posture cards (score, attested, open
 * proposals, open triage) reflect the selected day; a sparkline
 * highlights the position; a Play/Pause button autoplays through
 * time at 200ms-per-day cadence.
 *
 * # Why ms cadence, not real-time
 *
 * "200ms per day" is a calibrated playback speed: 90 days takes
 * ~18 seconds — fast enough to feel cinematic, slow enough that
 * the eye can track per-day changes. Faster blurs into a single
 * animation; slower bores the viewer.
 *
 * # Empty state
 *
 * If V2PostureSnapshot has no rows yet (cron hasn't run, or user
 * is brand-new), we show a friendly "no history yet" panel with
 * pointer to /api/cron/analytics-aggregate.
 */

const PLAYBACK_TICK_MS = 200;

export interface TimeTravelClientProps {
  trend: PostureTrendPoint[];
}

export function TimeTravelClient({ trend }: TimeTravelClientProps) {
  // Default cursor = latest snapshot (today). Empty arrays handled
  // separately below.
  const [index, setIndex] = React.useState(Math.max(0, trend.length - 1));
  const [playing, setPlaying] = React.useState(false);
  const playTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Autoplay tick — advance one day per PLAYBACK_TICK_MS, stop at
  // the end of the trend.
  React.useEffect(() => {
    if (!playing) {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }
    playTimerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= trend.length - 1) {
          // Hit the end — auto-pause
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAYBACK_TICK_MS);
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [playing, trend.length]);

  if (trend.length === 0) {
    return (
      <div
        data-testid="time-travel-empty"
        className="palantir-surface mx-auto max-w-md rounded-md p-12 text-center"
      >
        <Clock className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
        <p className="text-sm text-slate-200">No posture history yet</p>
        <p className="mt-2 text-xs text-slate-500">
          The nightly analytics-aggregate cron writes one V2PostureSnapshot row
          per active user per day. Once it has run at least once, scrub through
          your history here.
        </p>
      </div>
    );
  }

  const current = trend[index];
  const previous = index > 0 ? trend[index - 1] : null;

  return (
    <div data-testid="time-travel" className="space-y-4">
      <ScrubberRow
        index={index}
        total={trend.length}
        currentDate={current.date}
        playing={playing}
        onIndexChange={setIndex}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
      <PostureCards current={current} previous={previous} />
      <Sparkline trend={trend} highlightIndex={index} />
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function ScrubberRow({
  index,
  total,
  currentDate,
  playing,
  onIndexChange,
  onTogglePlay,
}: {
  index: number;
  total: number;
  currentDate: string;
  playing: boolean;
  onIndexChange: (i: number) => void;
  onTogglePlay: () => void;
}) {
  return (
    <div
      data-testid="time-travel-scrubber"
      className="palantir-surface flex flex-wrap items-center gap-4 rounded-md p-4"
    >
      <button
        type="button"
        onClick={() => onIndexChange(0)}
        disabled={index === 0}
        aria-label="Skip to start"
        data-testid="skip-start"
        className="rounded p-1.5 text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100 disabled:opacity-30"
      >
        <SkipBack className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        data-testid="play-toggle"
        className="inline-flex items-center gap-1.5 rounded bg-emerald-500/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/40 transition hover:bg-emerald-500/25"
      >
        {playing ? (
          <>
            <Pause className="h-3 w-3" />
            Pause
          </>
        ) : (
          <>
            <Play className="h-3 w-3" />
            Play
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => onIndexChange(total - 1)}
        disabled={index === total - 1}
        aria-label="Skip to end"
        data-testid="skip-end"
        className="rounded p-1.5 text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100 disabled:opacity-30"
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>

      <input
        type="range"
        data-testid="time-travel-slider"
        min={0}
        max={total - 1}
        value={index}
        onChange={(e) => onIndexChange(parseInt(e.target.value, 10))}
        className="flex-1 accent-emerald-400"
        aria-label="Day index"
      />

      <div
        data-testid="current-date"
        className="font-mono text-[10px] uppercase tracking-wider text-slate-300"
      >
        {currentDate.slice(0, 10)} · day {index + 1}/{total}
      </div>
    </div>
  );
}

function PostureCards({
  current,
  previous,
}: {
  current: PostureTrendPoint;
  previous: PostureTrendPoint | null;
}) {
  return (
    <div
      data-testid="time-travel-cards"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Card
        label="Overall score"
        value={`${current.overallScore}%`}
        icon={Gauge}
        tone="emerald"
        delta={previous ? current.overallScore - previous.overallScore : null}
        deltaSuffix="pts"
      />
      <Card
        label="Attested"
        value={`${current.attestedItems} / ${current.totalItems}`}
        icon={CheckCircle2}
        tone="emerald"
        delta={previous ? current.attestedItems - previous.attestedItems : null}
      />
      <Card
        label="Open proposals"
        value={current.openProposals.toString()}
        icon={ShieldCheck}
        tone={current.openProposals > 0 ? "amber" : "slate"}
        delta={previous ? current.openProposals - previous.openProposals : null}
        deltaInverted
      />
      <Card
        label="Triage signals"
        value={current.openTriage.toString()}
        icon={AlertTriangle}
        tone={current.openTriage > 0 ? "amber" : "slate"}
        delta={previous ? current.openTriage - previous.openTriage : null}
        deltaInverted
      />
    </div>
  );
}

function Card({
  label,
  value,
  icon: Icon,
  tone,
  delta,
  deltaSuffix = "",
  deltaInverted,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "amber" | "slate";
  delta: number | null;
  deltaSuffix?: string;
  deltaInverted?: boolean;
}) {
  const accentClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-slate-500";

  // Positive delta is "good" by default (score went up). For
  // proposals + triage, MORE is bad — flip the colour via
  // `deltaInverted`.
  let deltaTone = "text-slate-500";
  if (delta !== null && delta !== 0) {
    const isImprovement = deltaInverted ? delta < 0 : delta > 0;
    deltaTone = isImprovement ? "text-emerald-400" : "text-red-400";
  }
  const deltaSign = delta !== null && delta > 0 ? "+" : "";

  return (
    <div
      data-testid="posture-card"
      className="palantir-surface flex flex-col gap-1.5 rounded-md p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
        <Icon className={`h-3 w-3 ${accentClass}`} />
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-50">
        {value}
      </div>
      {delta !== null ? (
        <div
          className={`font-mono text-[10px] uppercase tracking-wider ${deltaTone}`}
        >
          {deltaSign}
          {delta}
          {deltaSuffix} vs prior day
        </div>
      ) : null}
    </div>
  );
}

function Sparkline({
  trend,
  highlightIndex,
}: {
  trend: PostureTrendPoint[];
  highlightIndex: number;
}) {
  const width = 720;
  const height = 80;
  const padding = 8;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const stepX = trend.length > 1 ? usableW / (trend.length - 1) : 0;
  const maxScore = 100; // overallScore is always 0-100

  const points = trend.map((p, i) => ({
    x: padding + i * stepX,
    y: padding + usableH - (p.overallScore / maxScore) * usableH,
    score: p.overallScore,
  }));

  const polyline = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const highlight = points[highlightIndex];

  return (
    <div
      data-testid="time-travel-sparkline"
      className="palantir-surface rounded-md p-4"
    >
      <header className="mb-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
        <span>SCORE TRAJECTORY · {trend.length} DAYS</span>
        <span>0% — 100%</span>
      </header>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-20 w-full"
        preserveAspectRatio="none"
        aria-label="Compliance score over time"
      >
        <polyline
          fill="none"
          stroke="rgb(52 211 153)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
        {/* Vertical line at the highlighted index */}
        {highlight ? (
          <line
            data-testid="sparkline-cursor"
            x1={highlight.x}
            y1={padding}
            x2={highlight.x}
            y2={height - padding}
            stroke="rgba(52, 211, 153, 0.4)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        ) : null}
        {/* Highlight dot */}
        {highlight ? (
          <circle
            data-testid="sparkline-highlight"
            cx={highlight.x}
            cy={highlight.y}
            r={4}
            fill="rgb(52 211 153)"
            stroke="rgba(15, 23, 42, 0.8)"
            strokeWidth={2}
          />
        ) : null}
      </svg>
    </div>
  );
}
