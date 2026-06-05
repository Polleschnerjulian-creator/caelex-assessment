"use client";

/**
 * OperationStepper — horizontal lifecycle stepper for a TradeOperation.
 *
 * Pure visualization component — no state machine, no transition POSTs.
 * Consumed by OperationLifecyclePanel which handles the mutation side.
 *
 * Visual contract (per UX-finding U-HIGH-6):
 *   - 6-step horizontal stepper: DRAFT → CLASSIFY → SCREEN → LICENSE → LICENSED → EXECUTED
 *   - Past steps: emerald check, completed-feeling.
 *   - Current step: accent-coloured filled circle, label bumped to semibold.
 *   - Future steps: muted ring + number, "to do" feeling.
 *   - Off-pipeline terminal states (BLOCKED, VOLUNTARY_DISCLOSURE_FILED)
 *     render the happy-path stepper with the LAST-VISITED step marked as
 *     "halted here", then a separate red terminal pill labelled with the
 *     off-pipeline state. This keeps the lifecycle reading direction
 *     intact instead of leaving the user wondering "where did I go wrong".
 *
 * Accessibility:
 *   - role="group" + aria-label so screen readers announce it as a single
 *     widget rather than a row of icons.
 *   - Each step gets an offscreen "Step N of 6, Label, current/done/upcoming"
 *     label so VoiceOver paints the position + state.
 *   - aria-current="step" on the active step.
 *   - Mobile: stepper scrolls horizontally if it overflows; visible scrollbar.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import {
  Edit3,
  ScanSearch,
  FileSearch,
  ShieldCheck,
  Truck,
  Check,
  XCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export type OperationStatus =
  | "DRAFT"
  | "AWAITING_CLASSIFICATION"
  | "SCREENING"
  | "AWAITING_LICENSE"
  | "LICENSED"
  | "EXECUTED"
  | "BLOCKED"
  | "VOLUNTARY_DISCLOSURE_FILED";

/** The happy-path lifecycle, in order. Off-pipeline = BLOCKED / VDISC. */
const PIPELINE: ReadonlyArray<OperationStatus> = [
  "DRAFT",
  "AWAITING_CLASSIFICATION",
  "SCREENING",
  "AWAITING_LICENSE",
  "LICENSED",
  "EXECUTED",
];

interface StepMeta {
  /** Short label visible under the circle (4-10 chars). */
  shortLabel: string;
  /** Full label for screen readers + tooltip. */
  fullLabel: string;
  /** Icon shown inside the current-step circle. */
  icon: LucideIcon;
}

const STEP_META: Record<OperationStatus, StepMeta> = {
  DRAFT: { shortLabel: "Draft", fullLabel: "Draft", icon: Edit3 },
  AWAITING_CLASSIFICATION: {
    shortLabel: "Classify",
    fullLabel: "Awaiting classification",
    icon: ScanSearch,
  },
  SCREENING: {
    shortLabel: "Screen",
    fullLabel: "Sanctions screening",
    icon: FileSearch,
  },
  AWAITING_LICENSE: {
    shortLabel: "License",
    fullLabel: "Awaiting license",
    icon: FileSearch,
  },
  LICENSED: {
    shortLabel: "Licensed",
    fullLabel: "Licensed",
    icon: ShieldCheck,
  },
  EXECUTED: { shortLabel: "Executed", fullLabel: "Executed", icon: Truck },
  BLOCKED: { shortLabel: "Blocked", fullLabel: "Blocked", icon: XCircle },
  VOLUNTARY_DISCLOSURE_FILED: {
    shortLabel: "VDisc",
    fullLabel: "Voluntary disclosure filed",
    icon: AlertTriangle,
  },
};

interface Props {
  status: OperationStatus;
  /** Optional className for outer container. */
  className?: string;
}

export function OperationStepper({ status, className = "" }: Props) {
  // Off-pipeline (BLOCKED / VDISC) — render the happy path showing where we
  // halted, then a red terminal pill. The "halted" index is the last
  // pipeline step we know to have been reached; for BLOCKED-from-anywhere
  // we don't know exactly, so we visually mark all happy-path steps as
  // "not current" and let the terminal pill carry the message.
  const isOffPipeline =
    status === "BLOCKED" || status === "VOLUNTARY_DISCLOSURE_FILED";
  const currentIndex = isOffPipeline ? -1 : PIPELINE.indexOf(status);

  return (
    <div
      role="group"
      aria-label="Operation lifecycle"
      className={`flex items-start gap-1 overflow-x-auto pb-2 ${className}`}
    >
      {PIPELINE.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isPast = currentIndex > i;
        const isFuture = currentIndex < i || isOffPipeline;
        return (
          <React.Fragment key={step}>
            <StepperNode
              step={step}
              index={i}
              total={PIPELINE.length}
              state={isCurrent ? "current" : isPast ? "done" : "upcoming"}
              dimmed={isOffPipeline && !isPast}
              isFuture={isFuture}
            />
            {i < PIPELINE.length - 1 ? (
              <Connector
                isPast={isPast || (isOffPipeline && i < PIPELINE.length - 1)}
                isHalted={
                  isOffPipeline && currentIndex === -1 && i === 0 // visual hint
                }
              />
            ) : null}
          </React.Fragment>
        );
      })}
      {isOffPipeline ? (
        <>
          <Connector isPast={false} isHalted className="mx-1" />
          <TerminalPill status={status} />
        </>
      ) : null}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

interface StepperNodeProps {
  step: OperationStatus;
  index: number;
  total: number;
  state: "done" | "current" | "upcoming";
  dimmed: boolean;
  isFuture: boolean;
}

function StepperNode({
  step,
  index,
  total,
  state,
  dimmed,
  isFuture,
}: StepperNodeProps) {
  const meta = STEP_META[step];
  const Icon = meta.icon;

  // Tailwind-only styling — keeps consistent with the rest of the trade
  // theme rather than CSS-in-JS. Three visual states:
  //
  //   done:    emerald check + emerald label
  //   current: accent fill + larger ring + bumped label weight
  //   upcoming: muted ring with the numeral
  const circleClass = (() => {
    if (state === "done") {
      return "trade-chip-success ring-1";
    }
    if (state === "current") {
      return "bg-trade-accent text-white ring-2 ring-trade-accent ring-offset-2 ring-offset-trade-bg-panel shadow-sm";
    }
    return "bg-trade-bg-subtle text-trade-text-muted ring-1 ring-trade-border-subtle";
  })();

  const labelClass = (() => {
    if (state === "current") return "font-semibold text-trade-text-primary";
    if (state === "done") return "text-trade-text-secondary";
    return dimmed
      ? "text-trade-text-muted opacity-50"
      : "text-trade-text-muted";
  })();

  return (
    <div
      className="flex min-w-[64px] shrink-0 flex-col items-center gap-1.5"
      aria-current={state === "current" ? "step" : undefined}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${circleClass}`}
        title={meta.fullLabel}
      >
        {state === "done" ? (
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        ) : state === "current" ? (
          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        ) : (
          <span className="text-[11px] font-semibold tabular-nums">
            {index + 1}
          </span>
        )}
      </div>
      <span className={`text-[10px] uppercase tracking-[0.08em] ${labelClass}`}>
        {meta.shortLabel}
      </span>
      {/* Offscreen verbose state label for screen readers. The visible
          label is short by design ("Classify"); AT users get the full
          context ("Step 2 of 6, Awaiting classification, in progress"). */}
      <span className="sr-only">
        Step {index + 1} of {total}: {meta.fullLabel} ·{" "}
        {state === "current"
          ? "in progress"
          : state === "done"
            ? "completed"
            : isFuture
              ? "upcoming"
              : "skipped"}
      </span>
    </div>
  );
}

interface ConnectorProps {
  isPast: boolean;
  isHalted?: boolean;
  className?: string;
}

function Connector({ isPast, isHalted, className = "" }: ConnectorProps) {
  return (
    <div
      aria-hidden="true"
      className={`mt-4 h-px shrink-0 ${className}`}
      style={{
        flex: "1 1 16px",
        minWidth: 16,
        background: isHalted
          ? "rgb(252, 165, 165)" // red-300
          : isPast
            ? "rgb(110, 231, 183)" // emerald-300
            : "rgba(0, 0, 0, 0.08)",
      }}
    />
  );
}

function TerminalPill({ status }: { status: OperationStatus }) {
  const meta = STEP_META[status];
  const Icon = meta.icon;
  return (
    <div
      className="flex min-w-[64px] shrink-0 flex-col items-center gap-1.5"
      aria-current="step"
    >
      <div
        className="trade-chip-danger flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-trade-bg-panel"
        title={meta.fullLabel}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-trade-accent-danger">
        {meta.shortLabel}
      </span>
      <span className="sr-only">
        Terminal state: {meta.fullLabel} · operation halted
      </span>
    </div>
  );
}

// ─── Helpers — exported for use by OperationLifecyclePanel ─────────────

/** Same canonical pipeline as the visualization, for use by callers
 *  that need to know "what's the canonical next step from here". */
export const HAPPY_PATH: ReadonlyArray<OperationStatus> = PIPELINE;

/**
 * Friendly verb describing the action of moving INTO a given status.
 * Used by the "Next: …" primary CTA in OperationLifecyclePanel.
 */
export function nextActionLabel(target: OperationStatus): string {
  switch (target) {
    case "AWAITING_CLASSIFICATION":
      return "Submit for classification";
    case "SCREENING":
      return "Begin sanctions screening";
    case "AWAITING_LICENSE":
      return "Apply for license";
    case "LICENSED":
      return "Mark as licensed";
    case "EXECUTED":
      return "Execute (ship goods)";
    case "VOLUNTARY_DISCLOSURE_FILED":
      return "File self-disclosure";
    case "BLOCKED":
      return "Block operation";
    case "DRAFT":
      return "Return to draft";
    default:
      return "Continue";
  }
}

/**
 * Given the current status, return the canonical "happy path" next
 * transition — the one most users want most of the time. Used to
 * promote one transition to a primary CTA instead of showing the full
 * row of allowed transitions undifferentiated.
 *
 * For BLOCKED, the only path forward is VOLUNTARY_DISCLOSURE_FILED,
 * which is intentionally serious; we still return it so the user can
 * see there is a path forward, but the panel renders it with danger
 * styling.
 */
export function happyPathNext(status: OperationStatus): OperationStatus | null {
  switch (status) {
    case "DRAFT":
      return "AWAITING_CLASSIFICATION";
    case "AWAITING_CLASSIFICATION":
      return "SCREENING";
    case "SCREENING":
      return "AWAITING_LICENSE";
    case "AWAITING_LICENSE":
      return "LICENSED";
    case "LICENSED":
      return "EXECUTED";
    case "BLOCKED":
      return "VOLUNTARY_DISCLOSURE_FILED";
    case "EXECUTED":
    case "VOLUNTARY_DISCLOSURE_FILED":
      return null;
    default:
      return null;
  }
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
