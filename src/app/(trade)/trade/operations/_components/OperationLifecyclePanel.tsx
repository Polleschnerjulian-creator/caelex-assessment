"use client";

/**
 * OperationLifecyclePanel — Trade light-theme variant (Sprint A3b).
 *
 * Light Indigo port of `src/components/trade/OperationLifecyclePanel.tsx`.
 * Same behaviour: visual pipeline of the TradeOperation status state
 * machine, ALLOWED_TRANSITIONS-aware action buttons, confirmation dialog
 * for high-stakes moves (EXECUTED / BLOCKED / VDISC).
 *
 * Server-side ALLOWED_TRANSITIONS in /api/trade/operations/[id]/route.ts
 * is the source of truth — this UI mirrors it so we don't show buttons
 * that would 400.
 */

import { useState } from "react";
import {
  XCircle,
  AlertTriangle,
  Edit3,
  ScanSearch,
  FileSearch,
  ShieldCheck,
  Truck,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  OperationStepper,
  happyPathNext,
  nextActionLabel,
  type OperationStatus,
} from "./OperationStepper";

// Re-export so existing imports `import { OperationStatus } from "./OperationLifecyclePanel"`
// keep working without ripple changes elsewhere in the tree.
export type { OperationStatus };

const ALLOWED_TRANSITIONS: Record<OperationStatus, OperationStatus[]> = {
  DRAFT: ["AWAITING_CLASSIFICATION", "BLOCKED"],
  AWAITING_CLASSIFICATION: ["SCREENING", "DRAFT", "BLOCKED"],
  SCREENING: ["AWAITING_LICENSE", "AWAITING_CLASSIFICATION", "BLOCKED"],
  AWAITING_LICENSE: ["LICENSED", "SCREENING", "BLOCKED"],
  LICENSED: ["EXECUTED", "AWAITING_LICENSE", "BLOCKED"],
  EXECUTED: ["BLOCKED"],
  BLOCKED: ["VOLUNTARY_DISCLOSURE_FILED"],
  VOLUNTARY_DISCLOSURE_FILED: [],
};

const STATUS_META: Record<
  OperationStatus,
  {
    label: string;
    icon: LucideIcon;
    textClass: string;
    bgClass: string;
    description: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    icon: Edit3,
    textClass: "text-trade-text-secondary",
    bgClass: "bg-trade-bg-subtle ring-trade-border-subtle",
    description: "Operation is being composed. Add lines and counterparty.",
  },
  AWAITING_CLASSIFICATION: {
    label: "Classification",
    icon: ScanSearch,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 ring-amber-200",
    description:
      "All lines need classification codes (ECCN/USML/MTCR/AL) before screening.",
  },
  SCREENING: {
    label: "Screening",
    icon: FileSearch,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 ring-amber-200",
    description:
      "Counterparty sanctions screening must complete CLEAR before license determination.",
  },
  AWAITING_LICENSE: {
    label: "License",
    icon: FileSearch,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 ring-amber-200",
    description:
      "Each line needs an applied license (or eligibility under an AGG/EUGEA).",
  },
  LICENSED: {
    label: "Licensed",
    icon: ShieldCheck,
    textClass: "text-blue-700",
    bgClass: "bg-blue-50 ring-blue-200",
    description:
      "All lines covered by valid licenses. Ready to execute (ship goods).",
  },
  EXECUTED: {
    label: "Executed",
    icon: Truck,
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50 ring-emerald-200",
    description:
      "Goods physically shipped. Operation is closed but discoverable in audit.",
  },
  BLOCKED: {
    label: "Blocked",
    icon: XCircle,
    textClass: "text-red-700",
    bgClass: "bg-red-50 ring-red-200",
    description:
      "Sanctions hit, license denied, or operator-blocked. No further shipment.",
  },
  VOLUNTARY_DISCLOSURE_FILED: {
    label: "VDisc Filed",
    icon: AlertTriangle,
    textClass: "text-red-700",
    bgClass: "bg-red-50 ring-red-200",
    description:
      "Operator filed voluntary self-disclosure with BAFA/BIS. Final state.",
  },
};

export function OperationLifecyclePanel({
  operationId,
  status,
  onStatusChanged,
}: {
  operationId: string;
  status: OperationStatus;
  onStatusChanged: () => void;
}) {
  const [pendingTransition, setPendingTransition] =
    useState<OperationStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allowed = ALLOWED_TRANSITIONS[status] ?? [];
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  // Promote ONE allowed transition to the primary CTA — the "happy
  // path" forward step. Demote the rest to a secondary row so the
  // user always sees a single obvious next move instead of a wall
  // of buttons of equal weight.
  const happyNext = happyPathNext(status);
  const primaryNext: OperationStatus | null =
    happyNext && allowed.includes(happyNext) ? happyNext : null;
  const secondaryActions = allowed.filter((t) => t !== primaryNext);
  const [showSecondary, setShowSecondary] = useState(false);

  async function performTransition(target: OperationStatus) {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to transition status");
        return;
      }
      setPendingTransition(null);
      onStatusChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel">
      <div className="border-b border-trade-border-subtle px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
          Lifecycle
        </h2>
        <p className="mt-0.5 text-[11px] text-trade-text-muted">
          State machine enforced server-side. BLOCKED is the only off-ramp
          (requires VOLUNTARY_DISCLOSURE_FILED to fully close).
        </p>
      </div>

      {/* Pipeline visualization — proper horizontal stepper (U-HIGH-6) */}
      <div className="px-5 py-4">
        <OperationStepper status={status} />
      </div>

      {/* Current state description */}
      <div className="border-t border-trade-border-subtle px-5 py-3">
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${meta.textClass}`}
            strokeWidth={1.75}
          />
          <div className="flex-1">
            <div
              className={`text-[12px] font-semibold uppercase tracking-widest ${meta.textClass}`}
            >
              {meta.label}
            </div>
            <p className="mt-1 text-[12px] text-trade-text-secondary">
              {meta.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action area — primary "Next" CTA + collapsed secondary actions.
          Single recommended path beats a wall-of-buttons for daily ops; the
          full "Move to" row is one click away under "More actions". */}
      {allowed.length > 0 && (
        <div className="border-t border-trade-border-subtle px-5 py-3">
          {primaryNext ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                Next
              </span>
              <button
                onClick={() => setPendingTransition(primaryNext)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
              >
                {nextActionLabel(primaryNext)}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {secondaryActions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSecondary((v) => !v)}
                  aria-expanded={showSecondary}
                  aria-controls="lifecycle-secondary-actions"
                  className="ml-auto text-[11px] text-trade-text-secondary underline-offset-2 transition hover:text-trade-text-primary hover:underline"
                >
                  {showSecondary ? "Hide" : "More actions"}
                  {showSecondary ? " ↑" : ` (${secondaryActions.length}) ↓`}
                </button>
              )}
            </div>
          ) : (
            // No happy-path forward — surface all allowed actions equally
            // (e.g. EXECUTED with only "BLOCKED" available).
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                Available
              </span>
              {secondaryActions.map((target) => (
                <TransitionButton
                  key={target}
                  target={target}
                  onClick={() => setPendingTransition(target)}
                  submitting={submitting}
                />
              ))}
            </div>
          )}

          {/* Secondary action drawer — visible after toggle. Kept inside
              the panel chrome to preserve the disclosure visual model. */}
          {primaryNext && showSecondary && secondaryActions.length > 0 ? (
            <div
              id="lifecycle-secondary-actions"
              className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-trade-border-subtle pt-3"
            >
              {secondaryActions.map((target) => (
                <TransitionButton
                  key={target}
                  target={target}
                  onClick={() => setPendingTransition(target)}
                  submitting={submitting}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {err && (
        <div className="border-t border-red-200 bg-red-50 px-5 py-2 text-[12px] text-red-700">
          {err}
        </div>
      )}

      {pendingTransition && (
        <ConfirmTransition
          from={status}
          to={pendingTransition}
          submitting={submitting}
          onConfirm={() => performTransition(pendingTransition)}
          onCancel={() => {
            setPendingTransition(null);
            setErr(null);
          }}
        />
      )}
    </section>
  );
}

/**
 * Renders one transition action button with hue-by-target styling.
 * Extracted so both the "primary next" path and the "more actions"
 * disclosure use the same visual + interaction.
 */
function TransitionButton({
  target,
  onClick,
  submitting,
}: {
  target: OperationStatus;
  onClick: () => void;
  submitting: boolean;
}) {
  const isBlocking =
    target === "BLOCKED" || target === "VOLUNTARY_DISCLOSURE_FILED";
  const targetMeta = STATUS_META[target];
  const buttonClass = isBlocking
    ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
    : target === "EXECUTED"
      ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100";
  return (
    <button
      onClick={onClick}
      disabled={submitting}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${buttonClass}`}
    >
      {targetMeta.label}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function ConfirmTransition({
  from,
  to,
  submitting,
  onConfirm,
  onCancel,
}: {
  from: OperationStatus;
  to: OperationStatus;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const fromMeta = STATUS_META[from];
  const toMeta = STATUS_META[to];
  const isHighStakes =
    to === "BLOCKED" ||
    to === "VOLUNTARY_DISCLOSURE_FILED" ||
    to === "EXECUTED";

  const confirmClass =
    to === "EXECUTED"
      ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : isHighStakes
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100";

  return (
    <div className="border-t border-trade-border-subtle bg-trade-bg-subtle p-4">
      <div className="mb-3 text-[12px] text-trade-text-primary">
        Move from <span className={fromMeta.textClass}>{fromMeta.label}</span> →{" "}
        <span className={toMeta.textClass}>{toMeta.label}</span>?
      </div>
      <p className="mb-3 text-[11px] text-trade-text-secondary">
        {toMeta.description}
      </p>
      {isHighStakes && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <AlertTriangle className="mr-1.5 inline h-3 w-3" />
          {to === "EXECUTED" &&
            "Confirms goods physically shipped. Auto-sets actualShipDate + closedAt."}
          {to === "BLOCKED" &&
            "Operation is blocked from further movement. Existing lines/licenses stay attached for audit."}
          {to === "VOLUNTARY_DISCLOSURE_FILED" &&
            "Final state. Indicates operator filed voluntary self-disclosure with BAFA/BIS regarding past non-compliance on this operation."}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md px-3 py-1.5 text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${confirmClass}`}
        >
          {submitting ? "Moving…" : `Move to ${toMeta.label}`}
        </button>
      </div>
    </div>
  );
}
