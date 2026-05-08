/**
 * Sprint C-UI — NIS2 phase countdown widget.
 *
 * Server-safe (no client APIs) component that renders the
 * Art. 23 NIS2 reporting deadlines for one or more incidents in a
 * single condensed timeline view. Each phase is one row showing:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ◉  Early Warning · 24h          [WARNING]  T-09:42  ──────  │
 *   │ ◉  Incident Notification · 72h   [normal]  T-71:42  ──     │
 *   │ ◉  Final Report · 1 month        [normal]  T-29d 23:42  ─  │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Tier resolution from the Sprint C threshold timestamps (set by the
 * hourly nis2-phase-deadlines cron):
 *
 *   escalatedAt        != null  →  ESCALATED  (24h+ overdue)
 *   markedOverdueAt    != null  →  OVERDUE    (past deadline)
 *   warnedCriticalAt   != null  →  CRITICAL   (T-2h fired)
 *   warnedApproachingAt!= null  →  WARNING    (T-12h fired)
 *   else                          NORMAL     (no warning yet)
 *
 * # Why server-safe
 *
 * No `Date.now()` in render output — accept `now: Date` as a prop so
 * the parent's auth/SSR boundary controls "what time is it for this
 * page render". For client-side ticking countdowns, wrap this in a
 * client component that re-renders every second. The widget itself
 * is just a stateless visualization.
 */

import * as React from "react";
import { Clock, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { StatusPill } from "./ui/PageChrome";

const PHASE_LABELS: Record<string, string> = {
  early_warning: "Early warning",
  notification: "Incident notification",
  intermediate_report: "Intermediate report",
  final_report: "Final report",
};

const PHASE_DEADLINE_HUMAN: Record<string, string> = {
  early_warning: "24 h after detection",
  notification: "72 h after detection",
  intermediate_report: "1 month after detection",
  final_report: "1 month after intermediate report",
};

type Tier = "ESCALATED" | "OVERDUE" | "CRITICAL" | "WARNING" | "NORMAL";

export interface PhaseRow {
  id: string;
  phase: string;
  deadline: Date | string;
  status?: string;
  warnedApproachingAt?: Date | string | null;
  warnedCriticalAt?: Date | string | null;
  markedOverdueAt?: Date | string | null;
  escalatedAt?: Date | string | null;
  /** Optional incident reference for the row's secondary line. */
  incidentNumber?: string;
  incidentTitle?: string;
}

export function Nis2PhaseCountdown({
  phases,
  now = new Date(),
  showIncidentRef,
  emptyState,
}: {
  phases: PhaseRow[];
  now?: Date;
  /** When true, each row shows the parent incident reference under
   *  the phase title. Use when aggregating across incidents (e.g.
   *  on Mission detail). Hide when all rows are from the same
   *  incident (the parent header already shows it). */
  showIncidentRef?: boolean;
  /** Optional empty-state to render when phases is empty. */
  emptyState?: React.ReactNode;
}) {
  if (phases.length === 0) {
    return emptyState ?? null;
  }

  return (
    <ul className="divide-y divide-white/[0.04]">
      {phases.map((p) => (
        <PhaseCountdownRow
          key={p.id}
          phase={p}
          now={now}
          showIncidentRef={showIncidentRef}
        />
      ))}
    </ul>
  );
}

function PhaseCountdownRow({
  phase,
  now,
  showIncidentRef,
}: {
  phase: PhaseRow;
  now: Date;
  showIncidentRef?: boolean;
}) {
  const deadline =
    typeof phase.deadline === "string"
      ? new Date(phase.deadline)
      : phase.deadline;
  const deadlineMs = deadline.getTime();
  const nowMs = now.getTime();
  const remainingMs = deadlineMs - nowMs;
  const isOverdue = remainingMs <= 0;
  const isSubmitted = phase.status === "submitted";

  const tier = resolveTier(phase, isOverdue);
  const palette = tierPalette(tier, isSubmitted);
  const PhaseIcon = palette.Icon;

  return (
    <li
      className={`flex items-start gap-3 px-5 py-3 ${palette.rowBg}`}
      data-phase={phase.phase}
      data-tier={tier}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${palette.iconBg}`}
        aria-hidden
      >
        <PhaseIcon className={`h-3.5 w-3.5 ${palette.iconColor}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-100">
            {PHASE_LABELS[phase.phase] ?? phase.phase}
          </span>
          <span className="text-[11px] text-slate-500">
            · {PHASE_DEADLINE_HUMAN[phase.phase] ?? ""}
          </span>
          {tier !== "NORMAL" && !isSubmitted ? (
            <StatusPill tone={palette.pillTone} size="sm">
              {tierLabel(tier)}
            </StatusPill>
          ) : null}
          {isSubmitted ? (
            <StatusPill tone="emerald" size="sm">
              submitted
            </StatusPill>
          ) : null}
        </div>
        {showIncidentRef && phase.incidentNumber ? (
          <div className="mt-0.5 truncate text-[11.5px] text-slate-400">
            <span className="font-mono text-slate-500">
              {phase.incidentNumber}
            </span>
            {phase.incidentTitle ? (
              <span className="ml-1.5">{phase.incidentTitle}</span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center gap-3">
          <ProgressTrack
            tier={tier}
            isSubmitted={isSubmitted}
            remainingMs={remainingMs}
            phaseKey={phase.phase}
          />
          <span
            className={`shrink-0 font-mono text-[11px] tabular-nums ${palette.countdownColor}`}
          >
            {isSubmitted
              ? "—"
              : isOverdue
                ? `+${formatDuration(-remainingMs)} overdue`
                : `T-${formatDuration(remainingMs)}`}
          </span>
        </div>
      </div>
    </li>
  );
}

// ─── Visual primitives ───────────────────────────────────────────────────

function ProgressTrack({
  tier,
  isSubmitted,
  remainingMs,
  phaseKey,
}: {
  tier: Tier;
  isSubmitted: boolean;
  remainingMs: number;
  phaseKey: string;
}) {
  if (isSubmitted) {
    return (
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-emerald-500/30">
        <div className="h-full w-full bg-emerald-400" />
      </div>
    );
  }

  // Total window for the phase from creation to deadline. We don't
  // have createdAt here, but the human-deadline gives us an upper
  // bound — early_warning runs 24h, notification 72h, intermediate +
  // final ~30d. Use those as the "total" so the bar shows fraction-
  // remaining of the legal window.
  const totalMs = phaseTotalMs(phaseKey);
  const pctRemaining =
    remainingMs <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100)));

  const fillColor =
    tier === "ESCALATED" || tier === "OVERDUE"
      ? "bg-rose-500"
      : tier === "CRITICAL"
        ? "bg-rose-400"
        : tier === "WARNING"
          ? "bg-amber-400"
          : "bg-emerald-400";

  return (
    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full transition-all duration-500 ${fillColor} ${
          tier === "OVERDUE" || tier === "ESCALATED" ? "animate-pulse" : ""
        }`}
        style={{
          width:
            tier === "OVERDUE" || tier === "ESCALATED"
              ? "100%"
              : `${pctRemaining}%`,
        }}
      />
    </div>
  );
}

// ─── Tier resolution ─────────────────────────────────────────────────────

function resolveTier(phase: PhaseRow, isOverdue: boolean): Tier {
  if (phase.escalatedAt) return "ESCALATED";
  if (phase.markedOverdueAt || isOverdue) return "OVERDUE";
  if (phase.warnedCriticalAt) return "CRITICAL";
  if (phase.warnedApproachingAt) return "WARNING";
  return "NORMAL";
}

function tierLabel(tier: Tier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function tierPalette(
  tier: Tier,
  isSubmitted: boolean,
): {
  rowBg: string;
  iconBg: string;
  iconColor: string;
  countdownColor: string;
  pillTone: "emerald" | "amber" | "rose" | "slate";
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
} {
  if (isSubmitted) {
    return {
      rowBg: "",
      iconBg: "bg-emerald-500/10 ring-emerald-500/20",
      iconColor: "text-emerald-400",
      countdownColor: "text-emerald-300",
      pillTone: "emerald",
      Icon: CheckCircle2,
    };
  }
  switch (tier) {
    case "ESCALATED":
      return {
        rowBg: "bg-rose-500/[0.04]",
        iconBg: "bg-rose-500/15 ring-rose-500/30",
        iconColor: "text-rose-300",
        countdownColor: "text-rose-300",
        pillTone: "rose",
        Icon: ShieldAlert,
      };
    case "OVERDUE":
      return {
        rowBg: "bg-rose-500/[0.025]",
        iconBg: "bg-rose-500/10 ring-rose-500/20",
        iconColor: "text-rose-300",
        countdownColor: "text-rose-300",
        pillTone: "rose",
        Icon: AlertTriangle,
      };
    case "CRITICAL":
      return {
        rowBg: "bg-rose-500/[0.02]",
        iconBg: "bg-rose-500/[0.08] ring-rose-500/15",
        iconColor: "text-rose-300",
        countdownColor: "text-rose-300",
        pillTone: "rose",
        Icon: AlertTriangle,
      };
    case "WARNING":
      return {
        rowBg: "bg-amber-500/[0.02]",
        iconBg: "bg-amber-500/[0.08] ring-amber-500/15",
        iconColor: "text-amber-300",
        countdownColor: "text-amber-300",
        pillTone: "amber",
        Icon: AlertTriangle,
      };
    case "NORMAL":
    default:
      return {
        rowBg: "",
        iconBg: "bg-white/[0.04] ring-white/[0.06]",
        iconColor: "text-slate-400",
        countdownColor: "text-slate-400",
        pillTone: "slate",
        Icon: Clock,
      };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function phaseTotalMs(phaseKey: string): number {
  switch (phaseKey) {
    case "early_warning":
      return 24 * 60 * 60 * 1000;
    case "notification":
      return 72 * 60 * 60 * 1000;
    case "intermediate_report":
    case "final_report":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / (24 * 60 * 60));
  const hours = Math.floor((totalSec % (24 * 60 * 60)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) {
    return `${days}d ${pad2(hours)}:${pad2(minutes)}`;
  }
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
